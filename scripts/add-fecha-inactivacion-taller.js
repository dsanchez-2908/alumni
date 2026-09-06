// Agrega la columna feInactivacion a TD_TALLERES (dev) para registrar cuándo un taller pasó a Inactivo.
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'admin', database: 'alumni',
  });

  try {
    const [existe] = await connection.query(
      "SHOW COLUMNS FROM TD_TALLERES WHERE Field = 'feInactivacion'"
    );

    if (existe.length > 0) {
      console.log('La columna feInactivacion ya existe en TD_TALLERES.');
      return;
    }

    await connection.query(
      'ALTER TABLE TD_TALLERES ADD COLUMN feInactivacion TIMESTAMP NULL DEFAULT NULL AFTER cdEstado'
    );
    console.log('✅ Columna feInactivacion agregada a TD_TALLERES.');

    // Completar el dato para talleres que ya están Inactivo hoy, usando feModificacion como mejor estimación disponible
    const [result] = await connection.query(
      `UPDATE TD_TALLERES SET feInactivacion = feModificacion WHERE cdEstado = 2 AND feInactivacion IS NULL`
    );
    console.log(`✅ feInactivacion completado (estimado con feModificacion) en ${result.affectedRows} taller(es) ya inactivos.`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
