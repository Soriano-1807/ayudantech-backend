const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL en Railway');
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ status: 'Backend activo ✅' });
});

const PORT = process.env.PORT || 3000;

///////////////////ENDPOINTS////////////////////////////////

// Login administrador
app.post('/admin/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM administrador WHERE correo = $1 AND contraseña = $2',
      [correo, contraseña]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '❌ Credenciales inválidas' });
    }

    res.json({ status: '✅ Login exitoso como administrador' });
  } catch (err) {
    console.error('❌ Error al intentar login admin:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Login ayudante
app.post('/ayudantes/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM ayudante WHERE correo = $1 AND contraseña = $2',
      [correo, contraseña]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '❌ Credenciales inválidas' });
    }

    res.json({ status: '✅ Login exitoso como ayudante' });
  } catch (err) {
    console.error('❌ Error en login ayudante:', err.message);
    res.status(500).json({ error: err.message });
  }
});

//listar ayudantes
app.get('/ayudantes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ayudante');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar eayudante por cédula
app.get('/ayudantes/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM ayudante WHERE cedula = $1',
      [cedula]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ayudante no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear ayudante
app.post('/ayudantes', async (req, res) => {
  const { cedula, nombre, correo, nivel, facultad, carrera } = req.body;
  // contraseña aleatoria generada
  const contraseña = crypto.randomBytes(4).toString('hex');

  try {
    // Verificar si la cédula ya existe en la tabla supervisor
    const checkSupervisor = await pool.query(
      'SELECT 1 FROM supervisor WHERE cedula = $1',
      [cedula]
    );
    if (checkSupervisor.rows.length > 0) {
      return res.status(400).json({ error: '❌ Ya existe un supervisor con esa cédula' });
    }

    // Insertar ayudante si no existe en ninguna de las tablas
    await pool.query(
      'INSERT INTO ayudante (cedula, nombre, correo, nivel, facultad, carrera, contraseña) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [cedula, nombre, correo, nivel, facultad, carrera, contraseña]
    );

    res.json({ status: '✅ Ayudante creado correctamente' });
  } catch (err) {
    console.error('❌ Error al crear ayudante:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar estudiante
app.delete('/ayudantes/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM ayudante WHERE cedula = $1 RETURNING *',
      [cedula]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ayudante no encontrado' });
    }
    res.json({ status: '✅ Ayudante eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar estudiante
app.put('/ayudantes/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { nombre, correo, nivel, facultad, carrera } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ayudante 
       SET nombre = $1, correo = $2, nivel = $3, facultad = $4, carrera = $5
       WHERE cedula = $6 RETURNING *`,
      [nombre, correo, nivel, facultad, carrera, cedula]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ayudante no encontrado' });
    }
    res.json({ status: '✅ Ayudante modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login supervisor
app.post('/supervisores/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM supervisor WHERE correo = $1 AND contraseña = $2',
      [correo, contraseña]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '❌ Credenciales inválidas' });
    }

    res.json({ status: '✅ Login exitoso como supervisor' });
  } catch (err) {
    console.error('❌ Error en login supervisor:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Crear supervisor
app.post('/supervisores', async (req, res) => {
  const { cedula, nombre, correo } = req.body;
  // contraseña aleatoria generada
  const contraseña = crypto.randomBytes(4).toString('hex');

  try {
    // Verificar si la cédula ya existe en la tabla ayudante
    const checkAyudante = await pool.query(
      'SELECT 1 FROM ayudante WHERE cedula = $1',
      [cedula]
    );
    if (checkAyudante.rows.length > 0) {
      return res.status(400).json({ error: '❌ Ya existe un ayudante con esa cédula' });
    }

    // Insertar supervisor si no existe en ninguna de las tablas
    await pool.query(
      'INSERT INTO supervisor (cedula, nombre, correo, contraseña) VALUES ($1, $2, $3, $4)',
      [cedula, nombre, correo, contraseña]
    );

    res.json({ status: '✅ Supervisor creado correctamente' });
  } catch (err) {
    console.error('❌ Error al crear supervisor:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Eliminar supervisor
app.delete('/supervisores/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM supervisor WHERE cedula = $1 RETURNING *',
      [cedula]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Supervisor no encontrado' });
    }
    res.json({ status: '✅ Supervisor eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar supervisor
app.put('/supervisores/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { nombre, correo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE supervisor 
       SET nombre = $1, correo = $2
       WHERE cedula = $3 RETURNING *`,
      [nombre, correo, cedula]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Supervisor no encontrado' });
    }
    res.json({ status: '✅ Supervisor modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Buscar supervisor por cédula
app.get('/supervisores/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await pool.query('SELECT * FROM supervisor WHERE cedula = $1', [cedula]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Supervisor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos los supervisores
app.get('/supervisores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM supervisor');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todas las facultades
app.get('/facultades', async (req, res) => {
  try {
    const result = await pool.query('SELECT nombre FROM facultad');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar carreras de una facultad específica (usando el nombre como FK)
app.get('/facultades/:nombre/carreras', async (req, res) => {
  const { nombre } = req.params;
  try {
    const result = await pool.query(
      'SELECT nombre FROM carrera WHERE facultad_nombre = $1',
      [nombre]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear plaza
app.post('/plazas', async (req, res) => {
  const { nombre } = req.body;
  try {
    await pool.query(
      'INSERT INTO plaza (nombre) VALUES ($1)',
      [nombre]
    );
    res.json({ status: '✅ Plaza creada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todas las plazas
app.get('/plazas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plaza');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar plaza por nombre
app.get('/plazas/:nombre', async (req, res) => {
  const { nombre } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM plaza WHERE nombre = $1',
      [nombre]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plaza no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar plaza
app.put('/plazas/:nombre', async (req, res) => {
  const { nombre } = req.params;
  const { nuevoNombre } = req.body;
  try {
    const result = await pool.query(
      'UPDATE plaza SET nombre = $1 WHERE nombre = $2 RETURNING *',
      [nuevoNombre, nombre]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Plaza no encontrada' });
    }
    res.json({ status: '✅ Plaza modificada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar plaza
app.delete('/plazas/:nombre', async (req, res) => {
  const { nombre } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM plaza WHERE nombre = $1 RETURNING *',
      [nombre]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Plaza no encontrada' });
    }
    res.json({ status: '✅ Plaza eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Crear Ayudantía
app.post('/ayudantias', async (req, res) => {
    // Extraemos los datos del cuerpo de la solicitud
    const { 
        cedula_ayudante, cedula_supervisor, plaza, tipo_ayudante} = req.body;

    // 'desc_objetivo' se deja vacío (cadena vacía) por requisito, 
    // lo que se mapeará a una cadena vacía en la DB o NULL, 
    // dependiendo de la definición de su columna. Usaremos cadena vacía.
    const desc_objetivo = ''; 

    // 1. Validar que los campos requeridos no estén vacíos
    if (!cedula_ayudante || !cedula_supervisor || !plaza || !tipo_ayudante) {
        return res.status(400).json({ 
            error: '❌ Faltan datos requeridos. Asegúrese de enviar cedula_ayudante, cedula_supervisor, plaza y tipo_ayudante.' 
        });
    }

    // 2. Definir la consulta SQL para la inserción
    // Usamos $1, $2, etc., para prevenir ataques de inyección SQL
    const text = `
        INSERT INTO ayudantia(
            cedula_ayudante, 
            cedula_supervisor, 
            plaza, 
            desc_objetivo, 
            tipo_ayudante
        )
        VALUES($1, $2, $3, $4, $5) 
        RETURNING id; -- Usamos RETURNING para obtener el ID de la fila insertada
    `;
    
    // 3. Array con los valores a insertar
    const values = [
        cedula_ayudante, 
        cedula_supervisor, 
        plaza, 
        desc_objetivo, // <-- Este valor se inserta como cadena vacía
        tipo_ayudante
    ];

    try {
        // Ejecutar la consulta en PostgreSQL
        const result = await pool.query(text, values);
        
        // Obtener el ID de la nueva fila
        const newId = result.rows[0].id;

        // Respuesta exitosa
        res.status(201).json({ 
            status: '✅ Ayudantía creada correctamente', 
            id: newId,
            datos_enviados: req.body
        });

    } catch (err) {
        // Manejo de errores de PostgreSQL
        console.error('❌ Error al crear la ayudantía:', err.message);
        
        // Podrías añadir lógica específica de manejo de errores de DB (ej. clave foránea)
        if (err.message.includes('foreign key constraint')) {
             return res.status(400).json({ 
                error: '❌ Error de clave foránea. Asegúrese de que el ayudante y el supervisor existan.',
                details: err.message
            });
        }
        
        // Respuesta genérica de error del servidor
        res.status(500).json({ 
            error: '❌ Error interno del servidor al crear la ayudantía', 
            details: err.message 
        });
    }
});

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
  console.log('🌐 En producción, accede con la URL de Railway.');
});
