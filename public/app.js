const formVehiculo = document.getElementById('vehiculo-form');
const contenedorVehiculos = document.getElementById('vehiculos-container');
const choferSelect = formVehiculo.querySelector('select');
const choferesContainer = document.getElementById('choferes-container');
const formChofer = document.getElementById('form-chofer');

// === CHOFERES ===

// Enviar formulario (agrega o edita chofer)
formChofer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombreChofer').value.trim();
    const licencia = document.getElementById('licenciaChofer').value.trim();

    if (!nombre || !licencia) {
        alert('Ambos campos son obligatorios');
        return;
    }

    const data = { nombre, licencia };
    const id = formChofer.dataset.editando;

    try {
        const endpoint = id ? `/choferes/${id}` : '/choferes';
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al guardar el chofer');
        }

        alert(`Chofer ${id ? 'actualizado' : 'agregado'} correctamente`);
        formChofer.reset();
        delete formChofer.dataset.editando;
        bootstrap.Modal.getInstance(document.getElementById('modalChofer')).hide();
        await cargarChoferes();
    } catch (err) {
        console.error('Error:', err);
        alert(err.message || 'No se pudo guardar el chofer');
    }
});

// Cargar lista de choferes
async function cargarChoferes() {
    try {
        const res = await fetch('/choferes');
        if (!res.ok) throw new Error('Error al cargar choferes');
        
        const choferes = await res.json();

        // Mostrar en tabla
        choferesContainer.innerHTML = choferes.map(ch => `
            <tr>
                <td>${ch.nombre}</td>
                <td>${ch.licencia}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarChofer(${ch.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarChofer(${ch.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');

        // Rellenar select de vehículos
        choferSelect.innerHTML = '<option value="">Seleccione Chofer</option>';
        choferes.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.id;
            opt.textContent = `${ch.nombre} - Licencia: ${ch.licencia}`;
            choferSelect.appendChild(opt);
        });
    } catch (err) {
        console.error('Error al cargar choferes:', err);
        choferesContainer.innerHTML = '<tr><td colspan="3" class="text-danger">Error al cargar choferes</td></tr>';
    }
}

// Editar chofer
async function editarChofer(id) {
    try {
        const res = await fetch(`/choferes/${id}`);
        if (!res.ok) throw new Error('Error al obtener chofer');
        
        const chofer = await res.json();

        document.getElementById('nombreChofer').value = chofer.nombre;
        document.getElementById('licenciaChofer').value = chofer.licencia;
        formChofer.dataset.editando = id;

        const modal = new bootstrap.Modal(document.getElementById('modalChofer'));
        modal.show();
    } catch (err) {
        console.error('Error al editar chofer:', err);
        alert('No se pudo cargar el chofer para editar');
    }
}

// Eliminar chofer
async function eliminarChofer(id) {
    if (!confirm("¿Estás seguro de eliminar este chofer? Esta acción no se puede deshacer.")) return;

    try {
        const res = await fetch(`/choferes/${id}`, { 
            method: 'DELETE' 
        });

        if (!res.ok) {
            // Intentar leer la respuesta como texto
            const text = await res.text();

            // Verificar si el cuerpo es JSON
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || 'Error al eliminar chofer');
            } catch (err) {
                // Si no es JSON, mostramos el texto directamente
                console.warn('Respuesta no-JSON:', text);
                throw new Error('Error desconocido al eliminar el chofer');
            }
        }

        alert('Chofer eliminado correctamente');
        await cargarChoferes();
    } catch (err) {
        console.error('Error al eliminar chofer:', err);
        alert(err.message || 'No se pudo eliminar el chofer');
    }
}


// === VEHÍCULOS ===

// Enviar formulario (agrega o edita vehículo)
formVehiculo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formVehiculo);
    const id = formVehiculo.dataset.editando;
    const url = id ? `/vehiculos/${id}` : '/vehiculos';
    const method = id ? 'PUT' : 'POST';

    // Validación básica
    if (!formData.get('placa') || !formData.get('modelo')) {
        alert('Placa y Modelo son campos obligatorios');
        return;
    }

    try {
        const res = await fetch(url, {
            method,
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al guardar vehículo');
        }

        alert(`Vehículo ${id ? 'actualizado' : 'agregado'} correctamente`);
        formVehiculo.reset();
        delete formVehiculo.dataset.editando;
        bootstrap.Modal.getInstance(document.getElementById('modalVehiculo')).hide();
        await cargarVehiculos();
    } catch (err) {
        console.error('Error:', err);
        alert(err.message || 'No se pudo guardar el vehículo');
    }
});

// Cargar lista de vehículos
async function cargarVehiculos() {
    try {
        const res = await fetch('/vehiculos');
        if (!res.ok) throw new Error('Error al cargar vehículos');
        
        const vehiculos = await res.json();

        contenedorVehiculos.innerHTML = vehiculos.map(v => `
            <tr>
                <td>${v.placa}</td>
                <td>${v.modelo}</td>
                <td>${v.nombre_chofer || 'No asignado'}</td>
                <td>${v.imagen ? `<img src="/uploads/${v.imagen}" class="img-thumbnail" style="max-height:60px;">` : 'Sin imagen'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarVehiculo(${v.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarVehiculo(${v.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error al cargar vehículos:', err);
        contenedorVehiculos.innerHTML = '<tr><td colspan="5" class="text-danger">Error al cargar vehículos</td></tr>';
    }
}

// Editar vehículo
async function editarVehiculo(id) {
    try {
        const res = await fetch(`/vehiculos/${id}`);
        if (!res.ok) throw new Error('Error al obtener vehículo');
        
        const vehiculo = await res.json();

        formVehiculo.querySelector('input[name="placa"]').value = vehiculo.placa;
        formVehiculo.querySelector('input[name="modelo"]').value = vehiculo.modelo;
        formVehiculo.querySelector('select[name="chofer_id"]').value = vehiculo.chofer_id || '';
        formVehiculo.dataset.editando = id;

        // No podemos pre-cargar la imagen, pero informamos al usuario
        if (vehiculo.imagen) {
            alert('Nota: Al editar, deberás volver a seleccionar la imagen si deseas cambiarla');
        }

        const modal = new bootstrap.Modal(document.getElementById('modalVehiculo'));
        modal.show();
    } catch (err) {
        console.error('Error al editar vehículo:', err);
        alert('No se pudo cargar el vehículo para editar');
    }
}

// Eliminar vehículo
async function eliminarVehiculo(id) {
    if (!confirm("¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.")) return;

    try {
        const res = await fetch(`/vehiculos/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al eliminar vehículo');
        }

        alert('Vehículo eliminado correctamente');
        await cargarVehiculos();
    } catch (err) {
        console.error('Error al eliminar vehículo:', err);
        alert(err.message || 'No se pudo eliminar el vehículo');
    }
}

// Inicializa
document.addEventListener('DOMContentLoaded', async () => {
    await cargarChoferes();
    await cargarVehiculos();
});

window.editarChofer = editarChofer;
window.eliminarChofer = eliminarChofer;
window.editarVehiculo = editarVehiculo;
window.eliminarVehiculo = eliminarVehiculo;
