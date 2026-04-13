const { Pool } = require("pg");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});

pool.on("connect", (client) => {
  client.query("SET TIME ZONE 'America/La_Paz'").catch((err) => {
    console.error(
      "⚠️ No se pudo configurar timezone America/La_Paz:",
      err.message,
    );
  });
});

// Test conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Error conectando a PostgreSQL:", err.stack);
  } else {
    console.log("✅ Conectado a Supabase exitosamente");
    release();
  }
});

module.exports = pool;
