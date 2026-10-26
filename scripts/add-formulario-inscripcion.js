// FASE 3: agrega TD_INSCRIPCIONES.dsMensajeFormulario y crea TD_INSCRIPCIONES_FORMULARIOS (idempotente).
// Requiere que ya existan las tablas de seguimiento (scripts/add-seguimiento-inscripciones.js).
// Usa las variables DB_* (por defecto, la base local).
// Ejemplo producción: $env:DB_HOST='...'; $env:DB_PORT='...'; $env:DB_USER='...'; $env:DB_PASSWORD='...'; $env:DB_NAME='...'; node scripts/add-formulario-inscripcion.js
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
    const [existe] = await connection.query(
      "SHOW COLUMNS FROM TD_INSCRIPCIONES WHERE Field = 'dsMensajeFormulario'"
    );
    if (existe.length > 0) {
      console.log('La columna dsMensajeFormulario ya existe en TD_INSCRIPCIONES.');
    } else {
      await connection.query(
        'ALTER TABLE TD_INSCRIPCIONES ADD COLUMN dsMensajeFormulario TEXT NULL DEFAULT NULL AFTER cdEstado'
      );
      console.log('✅ Columna dsMensajeFormulario agregada a TD_INSCRIPCIONES.');
    }

    // Se ejecuta solo el CREATE TABLE IF NOT EXISTS del archivo (el ALTER ya se resolvió arriba)
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'add-formulario-inscripcion.sql'), 'utf8');
    const create = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS'));
    await connection.query(create);

    const [tablas] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TD_INSCRIPCIONES_FORMULARIOS'"
    );

    // Instalaciones que ya tenían la tabla sin la copia cifrada del token
    const [cifrado] = await connection.query(
      "SHOW COLUMNS FROM TD_INSCRIPCIONES_FORMULARIOS WHERE Field = 'dsTokenCifrado'"
    );
    if (cifrado.length === 0) {
      await connection.query(
        "ALTER TABLE TD_INSCRIPCIONES_FORMULARIOS ADD COLUMN dsTokenCifrado VARCHAR(255) NULL AFTER dsTokenHash"
      );
      console.log('✅ Columna dsTokenCifrado agregada a TD_INSCRIPCIONES_FORMULARIOS.');
    }
    console.log('✅ Tabla de formularios disponible:', tablas.map((t) => t.TABLE_NAME).join(', '));
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
