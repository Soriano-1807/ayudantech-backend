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

// Ejemplo: listar ayudantes
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
    res.json({ status: '✅ Ayudante creado correctamente', generatedPassword: contraseña});
  } catch (err) {
    console.error('❌ Error al crear ayudante:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
  console.log('🌐 En producción, accede con la URL de Railway.');
});
