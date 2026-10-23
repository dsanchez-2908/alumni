// Agrega la columna nuCupoMaximo a TD_TALLERES (idempotente). Usa las variables DB_* (por defecto, la base local).
// Ejemplo producción: $env:DB_HOST='...'; $env:DB_PORT='...'; $env:DB_USER='...'; $env:DB_PASSWORD='...'; $env:DB_NAME='...'; node scripts/add-cupo-maximo-taller.js
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'alumni',
  });

  try {
    const [existe] = await connection.query(
      "SHOW COLUMNS FROM TD_TALLERES WHERE Field = 'nuCupoMaximo'"
    );

    if (existe.length > 0) {
      console.log('La columna nuCupoMaximo ya existe en TD_TALLERES.');
      return;
    }

    await connection.query(
      "ALTER TABLE TD_TALLERES ADD COLUMN nuCupoMaximo INT NULL DEFAULT NULL COMMENT 'Cantidad máxima de alumnos (NULL = sin límite)' AFTER feInicioTaller"
    );
    console.log('✅ Columna nuCupoMaximo agregada a TD_TALLERES (los talleres existentes quedan sin límite).');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
