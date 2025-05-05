import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Mejor con variables de entorno
  ssl: {
    rejectUnauthorized: false, // necesario para Render
  },
});

export default pool;
