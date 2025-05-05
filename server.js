import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8080;

// Base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Multer (para imágenes)
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Rutas ------------------------------------------------------------------

// CHOFERES ===============================================================

// Añadir choferes
app.post('/choferes', async (req, res) => {
  const { nombre, licencia } = req.body;

  if (!nombre || !licencia) {
    return res.status(400).send('Nombre y licencia son obligatorios');
  }

  try {
    const result = await pool.query(
      'INSERT INTO choferes (nombre, licencia) VALUES ($1, $2) RETURNING *',
      [nombre, licencia]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar el chofer');
  }
});

// Editar chofer
app.put('/choferes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, licencia } = req.body;

  if (!nombre || !licencia) {
    return res.status(400).send('Nombre y licencia son obligatorios');
  }

  try {
    const result = await pool.query(
      'UPDATE choferes SET nombre = $1, licencia = $2 WHERE id = $3 RETURNING *',
      [nombre, licencia, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).send('Chofer no encontrado');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar el chofer');
  }
});

// Eliminar chofer
app.delete('/choferes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el chofer está asignado a algún vehículo
    const vehiculos = await pool.query(
      'SELECT id FROM vehiculos_empresa WHERE chofer_id = $1',
      [id]
    );

    if (vehiculos.rowCount > 0) {
      return res.status(400).send('No se puede eliminar, el chofer está asignado a vehículos');
    }

    const result = await pool.query(
      'DELETE FROM choferes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send('Chofer no encontrado');
    }

    res.json({ message: 'Chofer eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar chofer');
  }
});

// Obtener todos los choferes
app.get('/choferes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM choferes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener choferes');
  }
});

// Obtener un chofer específico
app.get('/choferes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM choferes WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).send('Chofer no encontrado');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener el chofer');
  }
});

// VEHÍCULOS =============================================================

// Obtener todos los vehículos con nombre del chofer
app.get('/vehiculos', async (req, res) => {
  try {
    const query = `
      SELECT v.*, c.nombre AS nombre_chofer
      FROM vehiculos_empresa v
      LEFT JOIN choferes c ON v.chofer_id = c.id
      ORDER BY v.id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener vehículos');
  }
});

// Obtener un vehículo específico
app.get('/vehiculos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT v.*, c.nombre AS nombre_chofer
      FROM vehiculos_empresa v
      LEFT JOIN choferes c ON v.chofer_id = c.id
      WHERE v.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).send('Vehículo no encontrado');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener el vehículo');
  }
});

// Crear nuevo vehículo
app.post('/vehiculos', upload.single('imagen'), async (req, res) => {
  const { placa, modelo, chofer_id } = req.body;
  const imagen = req.file ? req.file.filename : null;

  if (!placa || !modelo) {
    return res.status(400).send('Placa y modelo son obligatorios');
  }

  try {
    // Verificar si la placa ya existe
    const existePlaca = await pool.query(
      'SELECT id FROM vehiculos_empresa WHERE placa = $1',
      [placa]
    );

    if (existePlaca.rowCount > 0) {
      return res.status(400).send('La placa ya está registrada');
    }

    const query = `
      INSERT INTO vehiculos_empresa (placa, modelo, imagen, chofer_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [placa, modelo, imagen, chofer_id || null];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar vehículo');
  }
});

// Editar vehículo
app.put('/vehiculos/:id', upload.single('imagen'), async (req, res) => {
  const { id } = req.params;
  const { placa, modelo, chofer_id } = req.body;
  const imagen = req.file ? req.file.filename : null;

  if (!placa || !modelo) {
    return res.status(400).send('Placa y modelo son obligatorios');
  }

  try {
    // Verificar si la placa ya existe en otro vehículo
    const existePlaca = await pool.query(
      'SELECT id FROM vehiculos_empresa WHERE placa = $1 AND id != $2',
      [placa, id]
    );

    if (existePlaca.rowCount > 0) {
      return res.status(400).send('La placa ya está registrada en otro vehículo');
    }

    // Si no se subió nueva imagen, mantener la existente
    let query;
    let values;
    
    if (imagen) {
      query = `
        UPDATE vehiculos_empresa 
        SET placa = $1, modelo = $2, imagen = $3, chofer_id = $4 
        WHERE id = $5
        RETURNING *
      `;
      values = [placa, modelo, imagen, chofer_id || null, id];
    } else {
      query = `
        UPDATE vehiculos_empresa 
        SET placa = $1, modelo = $2, chofer_id = $3 
        WHERE id = $4
        RETURNING *
      `;
      values = [placa, modelo, chofer_id || null, id];
    }

    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).send('Vehículo no encontrado');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar vehículo');
  }
});

// Eliminar vehículo
app.delete('/vehiculos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Primero obtener información de la imagen para borrarla del sistema de archivos
    const result = await pool.query(
      'SELECT imagen FROM vehiculos_empresa WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send('Vehículo no encontrado');
    }

    const imagen = result.rows[0].imagen;
    
    // Eliminar el vehículo de la base de datos
    await pool.query('DELETE FROM vehiculos_empresa WHERE id = $1', [id]);
    
    // Opcional: Eliminar la imagen asociada si existe
    if (imagen) {
      const fs = await import('fs');
      const filePath = path.join(__dirname, 'uploads', imagen);
      
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al eliminar imagen:', err);
      });
    }

    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar vehículo');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});