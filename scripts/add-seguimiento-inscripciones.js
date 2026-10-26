// Ejecuta database/add-seguimiento-inscripciones.sql (idempotente). Usa las variables DB_* (por defecto, la base local).
// Ejemplo producción: $env:DB_HOST='...'; $env:DB_PORT='...'; $env:DB_USER='...'; $env:DB_PASSWORD='...'; $env:DB_NAME='...'; node scripts/add-seguimiento-inscripciones.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'alumni',
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'add-seguimiento-inscripciones.sql'), 'utf8');
    await connection.query(sql);

    const [tablas] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('TD_INSCRIPCIONES','TD_INSCRIPCIONES_ALUMNOS','TD_INSCRIPCIONES_HISTORIAL')"
    );
    console.log('✅ Tablas de seguimiento disponibles:', tablas.map((t) => t.TABLE_NAME).join(', '));
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
