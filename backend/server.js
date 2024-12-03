const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = 3000;

// Configuración de Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de PostgreSQL
const localDbPool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
});

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Ruta para registrar un nuevo cliente
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Validación básica
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  try {
    // Insertar en PostgreSQL local
    const localQuery = `
      INSERT INTO clients (first_name, last_name, email, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const localResult = await localDbPool.query(localQuery, [firstName, lastName, email, password]);
    const clientId = localResult.rows[0].id;

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('clients')
      .insert([{ id: clientId, first_name: firstName, last_name: lastName, email, password }]);

    if (error) throw error;

    // Respuesta exitosa
    res.status(201).json({ message: 'Cliente registrado exitosamente.', clientId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el cliente.' });
  }
});

// Arrancar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
