const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const { DateTime } = require('luxon');
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

// BUscar ayudante por correo
app.get('/ayudantes/correo/:correo', async (req, res) => {
  const { correo } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM ayudante WHERE correo = $1',
      [correo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Ayudante no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener ayudante por correo:', err.message);
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

// Eliminar ayudante
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

// Modificar ayudante
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
    // Verificar si la plaza tiene ayudantías asignadas
    const checkAyudantias = await pool.query(
      'SELECT 1 FROM ayudantia WHERE plaza = $1',
      [nombre]
    );
    if (checkAyudantias.rows.length > 0) {
      return res.status(409).json({ error: '❌ No se puede eliminar, la plaza tiene ayudantías asignadas.' });
    }
    
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

// Crear ayudantía
app.post('/ayudantias', async (req, res) => {
  const { cedula_ayudante, cedula_supervisor, plaza, tipo_ayudante } = req.body;

  try {
    // Verificar que el ayudante exista
    const checkAyudante = await pool.query(
      'SELECT 1 FROM ayudante WHERE cedula = $1',
      [cedula_ayudante]
    );
    if (checkAyudante.rows.length === 0) {
      return res.status(400).json({ error: '❌ La cédula del ayudante no existe' });
    }

    // Verificar que el supervisor exista
    const checkSupervisor = await pool.query(
      'SELECT 1 FROM supervisor WHERE cedula = $1',
      [cedula_supervisor]
    );
    if (checkSupervisor.rows.length === 0) {
      return res.status(400).json({ error: '❌ La cédula del supervisor no existe' });
    }

    // Verificar que el ayudante no tenga ya una ayudantía registrada
    const checkDuplicado = await pool.query(
      'SELECT 1 FROM ayudantia WHERE cedula_ayudante = $1',
      [cedula_ayudante]
    );
    if (checkDuplicado.rows.length > 0) {
      return res.status(400).json({ error: '❌ Este ayudante ya tiene una ayudantía registrada' });
    }

    // Insertar nueva ayudantía con desc_objetivo vacío
    await pool.query(
      `INSERT INTO ayudantia (cedula_ayudante, cedula_supervisor, plaza, desc_objetivo, tipo_ayudante)
       VALUES ($1, $2, $3, $4, $5)`,
      [cedula_ayudante, cedula_supervisor, plaza, '', tipo_ayudante]
    );

    res.json({ status: '✅ Ayudantía creada correctamente' });
  } catch (err) {
    console.error('❌ Error al crear ayudantía:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Listar todos los tipos de ayudante
app.get('/tipos-ayudante', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tipo_ayudante ORDER BY tipo ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener los tipos de ayudante:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Listar todas las ayudantías (solo columnas propias de la tabla)
app.get('/ayudantias', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, cedula_ayudante, cedula_supervisor, plaza, desc_objetivo, tipo_ayudante
      FROM ayudantia
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener ayudantías:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar ayudantía por ID
app.delete('/ayudantias/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM ayudantia WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '❌ Ayudantía no encontrada' });
    }

    res.json({ status: '✅ Ayudantía eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar ayudantía:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Modificar únicamente el desc_objetivo de una ayudantía
app.put('/ayudantias/:id/objetivo', async (req, res) => {
  const { id } = req.params;
  const { desc_objetivo } = req.body;

  try {
    const result = await pool.query(
      `UPDATE ayudantia
       SET desc_objetivo = $1
       WHERE id = $2
       RETURNING *`,
      [desc_objetivo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '❌ Ayudantía no encontrada' });
    }

    res.json({ status: '✅ Descripción del objetivo actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar desc_objetivo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener ayudantía por cédula del ayudante
app.get('/ayudantias/cedula/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, cedula_ayudante, cedula_supervisor, plaza, desc_objetivo, tipo_ayudante
       FROM ayudantia
       WHERE cedula_ayudante = $1`,
      [cedula]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ No se encontró ninguna ayudantía para esa cédula' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener ayudantía por cédula:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Crear un nuevo período
app.post('/periodos', async (req, res) => {
  const { nombre, actual } = req.body;

  try {
    // Verificar si ya existe un periodo con ese nombre
    const check = await pool.query('SELECT 1 FROM periodo WHERE nombre = $1', [nombre]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: '❌ Ya existe un período con ese nombre' });
    }

    // Si el nuevo período se marcará como actual, desactivar los demás
    if (actual === true) {
      await pool.query('UPDATE periodo SET actual = false WHERE actual = true');
    }

    // Insertar el nuevo período
    await pool.query('INSERT INTO periodo (nombre, actual) VALUES ($1, $2)', [nombre, actual]);

    res.json({ status: '✅ Período creado correctamente' });
  } catch (err) {
    console.error('❌ Error al crear período:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Modificar el estado "actual" de un período
app.put('/periodos/:nombre/actual', async (req, res) => {
  const { nombre } = req.params;
  const { actual } = req.body; // true o false

  try {
    // Si lo vas a marcar como actual, desactiva los demás
    if (actual === true) {
      await pool.query('UPDATE periodo SET actual = false WHERE actual = true');
    }

    const result = await pool.query(
      'UPDATE periodo SET actual = $1 WHERE nombre = $2 RETURNING *',
      [actual, nombre]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '❌ Período no encontrado' });
    }

    res.json({ status: '✅ Estado del período actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar período:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener el período que está actualmente activo
app.get('/periodos/actual', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM periodo WHERE actual = true');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ No hay un período activo actualmente' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener período actual:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Listar todos los períodos (muestra si están activos o no)
app.get('/periodos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre, actual FROM periodo ORDER BY nombre ASC'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ No hay períodos registrados' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener períodos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Crear nueva actividad (con fecha de Caracas)
app.post('/actividades', async (req, res) => {
  const { id_ayudantia, descripcion, evidencia } = req.body;

  try {
    // Verificar que la ayudantía exista
    const checkAyudantia = await pool.query(
      'SELECT 1 FROM ayudantia WHERE id = $1',
      [id_ayudantia]
    );
    if (checkAyudantia.rows.length === 0) {
      return res.status(400).json({ error: '❌ La ayudantía no existe' });
    }

    // Obtener el período activo
    const periodoActivo = await pool.query(
      'SELECT nombre FROM periodo WHERE actual = true'
    );
    if (periodoActivo.rows.length === 0) {
      return res.status(400).json({ error: '❌ No hay un período activo actualmente' });
    }

    const periodo = periodoActivo.rows[0].nombre;

    // Fecha y hora actuales en UTC (universal)
    const fecha = DateTime.utc().toISO(); // ej: "2025-10-14T13:45:22.000Z"


    // Insertar nueva actividad
    const nuevaActividad = await pool.query(
      `INSERT INTO actividades (id_ayudantia, fecha, descripcion, evidencia, periodo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, id_ayudantia, fecha, descripcion, evidencia, periodo`,
      [id_ayudantia, fecha, descripcion, evidencia, periodo]
    );

    res.status(201).json({
      status: '✅ Actividad creada correctamente',
      actividad: nuevaActividad.rows[0]
    })
  } catch (err) {
    console.error('❌ Error al crear actividad:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Listar todas las actividades
app.get('/actividades', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, id_ayudantia, fecha, descripcion, evidencia, periodo
       FROM actividades
       ORDER BY fecha DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener actividades:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Modificar descripción y evidencia de una actividad
app.put('/actividades/:id', async (req, res) => {
  const { id } = req.params;
  const { descripcion, evidencia } = req.body;

  try {
    const result = await pool.query(
      `UPDATE actividades
       SET descripcion = $1, evidencia = $2
       WHERE id = $3
       RETURNING *`,
      [descripcion, evidencia, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '❌ Actividad no encontrada' });
    }

    res.json({ status: '✅ Actividad actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar actividad:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar una actividad por ID
app.delete('/actividades/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM actividades WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '❌ Actividad no encontrada' });
    }

    res.json({ status: '✅ Actividad eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar actividad:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Listar actividades por la cédula del ayudante
app.get('/actividades/ayudante/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    // Verificar que el ayudante tenga una ayudantía registrada
    const ayudantia = await pool.query(
      'SELECT id FROM ayudantia WHERE cedula_ayudante = $1',
      [cedula]
    );

    if (ayudantia.rows.length === 0) {
      return res.status(404).json({
        error: '❌ Este ayudante no tiene una ayudantía registrada.'
      });
    }

    const id_ayudantia = ayudantia.rows[0].id;

    // Buscar todas las actividades asociadas a esa ayudantía
    const actividades = await pool.query(
      `SELECT id, id_ayudantia, fecha, descripcion, evidencia, periodo
       FROM actividades
       WHERE id_ayudantia = $1
       ORDER BY fecha DESC`,
      [id_ayudantia]
    );

    if (actividades.rows.length === 0) {
      return res.status(404).json({
        error: '❌ No hay actividades registradas para este ayudante.'
      });
    }

    res.json(actividades.rows);
  } catch (err) {
    console.error('❌ Error al obtener actividades por cédula del ayudante:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un período (no se permite eliminar el período actual)
app.delete('/periodos/:nombre', async (req, res) => {
  const { nombre } = req.params;

  try {
    // Verificar si el período existe
    const check = await pool.query('SELECT actual FROM periodo WHERE nombre = $1', [nombre]);

    if (check.rows.length === 0) {
      return res.status(404).json({ error: '❌ El período no existe' });
    }

    // Si el período está marcado como actual, no se puede eliminar
    if (check.rows[0].actual === true) {
      return res.status(400).json({
        error: '⚠️ No se puede eliminar el período actual. Primero desactívalo antes de eliminarlo.'
      });
    }

    // Eliminar el período
    await pool.query('DELETE FROM periodo WHERE nombre = $1', [nombre]);

    res.json({ status: '✅ Período eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar período:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener el estado actual de la ventana de aprobación
app.get('/ventana-aprob', async (req, res) => {
  try {
    const result = await pool.query('SELECT activa FROM ventana_aprob LIMIT 1');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ No se encontró la ventana de aprobación' });
    }

    res.status(200).json({
      activa: result.rows[0].activa,
      estado: result.rows[0].activa ? '✅ Ventana activa' : '⛔ Ventana cerrada'
    });
  } catch (err) {
    console.error('❌ Error al obtener ventana_aprob:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Cambiar el estado de la ventana de aprobación
app.put('/ventana-aprob', async (req, res) => {
  const { activa } = req.body; // true o false

  if (typeof activa !== 'boolean') {
    return res.status(400).json({ error: '⚠️ El valor de "activa" debe ser true o false' });
  }

  try {
    const result = await pool.query(
      'UPDATE ventana_aprob SET activa = $1 WHERE id = (SELECT id FROM ventana_aprob LIMIT 1) RETURNING activa',
      [activa]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '❌ No se encontró la ventana de aprobación' });
    }

    res.status(200).json({
      status: '✅ Estado actualizado correctamente',
      nuevaVentana: {
        activa: result.rows[0].activa,
        estado: result.rows[0].activa ? '✅ Ventana activa' : '⛔ Ventana cerrada'
      }
    });
  } catch (err) {
    console.error('❌ Error al actualizar ventana_aprob:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Listar todas las actividades de una ayudantía específica
app.get('/actividades/ayudantia/:id_ayudantia', async (req, res) => {
  const { id_ayudantia } = req.params;

  try {
    // Verificar que la ayudantía exista
    const check = await pool.query(
      'SELECT 1 FROM ayudantia WHERE id = $1',
      [id_ayudantia]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: '❌ La ayudantía no existe' });
    }

    // Buscar las actividades asociadas a esa ayudantía
    const result = await pool.query(
      `SELECT id, fecha, descripcion, evidencia, periodo
       FROM actividades
       WHERE id_ayudantia = $1
       ORDER BY fecha DESC`,
      [id_ayudantia]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: '⚠️ Esta ayudantía no tiene actividades registradas aún.'
      });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener actividades por ayudantía:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener actividades de una ayudantía en el período actual
app.get('/actividades/ayudantia/:id_ayudantia/actual', async (req, res) => {
  const { id_ayudantia } = req.params;

  try {
    // 1️⃣ Obtener el período actual
    const periodoActual = await pool.query(
      'SELECT nombre FROM periodo WHERE actual = true LIMIT 1'
    );

    if (periodoActual.rows.length === 0) {
      return res.status(404).json({ error: '❌ No hay un período activo actualmente' });
    }

    const periodo = periodoActual.rows[0].nombre;

    // 2️⃣ Buscar las actividades de esa ayudantía en el período activo
    const actividades = await pool.query(
      `SELECT id, id_ayudantia, fecha, descripcion, evidencia, periodo
       FROM actividades
       WHERE id_ayudantia = $1 AND periodo = $2
       ORDER BY fecha DESC`,
      [id_ayudantia, periodo]
    );

    if (actividades.rows.length === 0) {
      return res.json({
        status: '✅ No hay actividades registradas para esta ayudantía en el período actual',
        actividades: [],
      });
    }

    res.json({
      status: '✅ Actividades encontradas',
      periodo_actual: periodo,
      actividades: actividades.rows,
    });
  } catch (err) {
    console.error('❌ Error al obtener actividades del período actual:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Obtener todas las ayudantías de un supervisor
app.get('/ayudantias/supervisor/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, cedula_ayudante, cedula_supervisor, plaza, desc_objetivo, tipo_ayudante
       FROM ayudantia
       WHERE cedula_supervisor = $1
       ORDER BY id DESC`,
      [cedula]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ No se encontraron ayudantías para este supervisor' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener ayudantías por supervisor:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los ayudantes que tiene un supervisor a cargo
app.get('/ayudantes/supervisor/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.cedula, a.nombre, a.correo, a.nivel, a.facultad, a.carrera, ay.plaza, ay.tipo_ayudante
       FROM ayudante a
       INNER JOIN ayudantia ay ON ay.cedula_ayudante = a.cedula
       WHERE ay.cedula_supervisor = $1
       ORDER BY a.nombre ASC`,
      [cedula]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ Este supervisor no tiene ayudantes registrados' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener ayudantes por supervisor:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener supervisor por correo
app.get('/supervisores/correo/:correo', async (req, res) => {
  const { correo } = req.params;

  try {
    const result = await pool.query(
      `SELECT cedula, nombre, correo, contraseña
       FROM supervisor
       WHERE correo = $1`,
      [correo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ No se encontró ningún supervisor con ese correo' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener supervisor por correo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Crear aprobación de ayudantía
app.post('/aprobado', async (req, res) => {
  const { id_ayudantia } = req.body;

  try {
    // Buscar periodo actual
    const periodoActual = await pool.query(
      'SELECT nombre FROM periodo WHERE actual = true LIMIT 1'
    );

    if (periodoActual.rows.length === 0) {
      return res.status(400).json({ error: '❌ No hay un período activo actualmente.' });
    }

    const periodo = periodoActual.rows[0].nombre;

    // Insertar nueva aprobación
    const nuevaAprobacion = await pool.query(
      `INSERT INTO aprobado (id_ayudantia, periodo)
       VALUES ($1, $2)
       RETURNING id, id_ayudantia, periodo`,
      [id_ayudantia, periodo]
    );

    res.status(201).json({
      status: '✅ Aprobación registrada correctamente',
      aprobado: nuevaAprobacion.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al crear aprobación:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener ayudantías aprobadas por período
app.get('/aprobado/periodo/:nombre', async (req, res) => {
  const { nombre } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.id, a.id_ayudantia, a.periodo
       FROM aprobado a
       WHERE a.periodo = $1`,
      [nombre]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener aprobaciones:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener período de aprobación por ayudantía
app.get('/aprobado/ayudantia/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT periodo
       FROM aprobado
       WHERE id_ayudantia = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ Esta ayudantía no tiene período registrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener período de ayudantía:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener detalles de todas las ayudantías aprobadas
app.get('/aprobado/detalles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ayu.nombre AS nombre_ayudante,
        sup.nombre AS nombre_supervisor,
        ayt.plaza
      FROM aprobado AS ap
      JOIN ayudantia AS ayt ON ap.id_ayudantia = ayt.id
      JOIN ayudante AS ayu ON ayt.cedula_ayudante = ayu.cedula
      JOIN supervisor AS sup ON ayt.cedula_supervisor = sup.cedula
      ORDER BY ayu.nombre ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener detalles de ayudantías aprobadas:', err.message);
    res.status(500).json({ error: err.message });
  }
}); 



// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
  console.log('🌐 En producción, accede con la URL de Railway.');
});