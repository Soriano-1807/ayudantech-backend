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

//listar ayudantes
app.get('/ayudantes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ayudante');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//crear ayudante
app.post('/ayudantes', async (req, res) => {
  const { cedula, nombre, correo, nivel, facultad, carrera } = req.body;
  //contrasena aleatoria generada
  const contraseña = crypto.randomBytes(4).toString('hex'); 

  try {
    await pool.query(
      'INSERT INTO ayudante (cedula, nombre, correo, nivel, facultad, carrera, contraseña) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [cedula, nombre, correo, nivel, facultad, carrera, contraseña]
    );
    res.json({ status: '✅ Ayudante creado correctamente'});
  } catch (err) {
    console.error('❌ Error al crear ayudante:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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

// Crear supervisor
app.post('/supervisores', async (req, res) => {
  const { cedula, nombre, correo, contraseña } = req.body;

  try {
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
    const result = await pool.query('SELECT * FROM facultad');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar carreras de una facultad específica
app.get('/facultades/:id/carreras', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM carrera WHERE id_facultad = $1',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
  console.log('🌐 En producción, accede con la URL de Railway.');
});
