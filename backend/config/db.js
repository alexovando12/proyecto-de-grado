const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Probar conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error conectando a PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado a PostgreSQL exitosamente');
    
    // Verificar tabla usuarios
    client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      )
    `, (err, res) => {
      if (err) {
        console.error('Error verificando tabla usuarios:', err);
      } else {
        console.log('¿Tabla usuarios existe?', res.rows[0].exists);
        
        // Mostrar usuarios existentes
        if (res.rows[0].exists) {
          client.query('SELECT * FROM usuarios', (err, res) => {
            if (err) {
              console.error('Error consultando usuarios:', err);
            } else {
              console.log('Usuarios existentes:', res.rows);
            }
            release();
          });
        } else {
          release();
        }
      }
    });
  }
});

module.exports = pool;