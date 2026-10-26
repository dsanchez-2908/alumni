// Agrega a TD_ALUMNOS: dsCiudad, dsComoNosConocio, dsEscuela, dsTurnoEscuela, snPermisoUsoImagen y snPermisoRetiroSolo (idempotente).
// Usa las variables DB_* (por defecto, la base local).
// Ejemplo producción: $env:DB_HOST='...'; $env:DB_PORT='...'; $env:DB_USER='...'; $env:DB_PASSWORD='...'; $env:DB_NAME='...'; node scripts/add-alumno-campos-adicionales.js
const mysql = require('mysql2/promise');

const COLUMNAS = [
  { nombre: 'dsCiudad', ddl: 'VARCHAR(100) NULL DEFAULT NULL AFTER dsDomicilio' },
  { nombre: 'dsComoNosConocio', ddl: 'VARCHAR(255) NULL DEFAULT NULL' },
  { nombre: 'dsEscuela', ddl: "VARCHAR(150) NULL DEFAULT NULL COMMENT 'Solo menores de edad'" },
  { nombre: 'dsTurnoEscuela', ddl: "VARCHAR(20) NULL DEFAULT NULL COMMENT 'Manana, Tarde o Jornada completa (solo menores de edad)'" },
  { nombre: 'snPermisoUsoImagen', ddl: "ENUM('SI','NO') NULL DEFAULT NULL COMMENT 'Obligatorio'" },
  { nombre: 'snPermisoRetiroSolo', ddl: "ENUM('SI','NO') NULL DEFAULT NULL COMMENT 'Obligatorio solo para menores de edad'" },
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'alumni',
  });

  try {
    for (const { nombre, ddl } of COLUMNAS) {
      const [existe] = await connection.query('SHOW COLUMNS FROM TD_ALUMNOS WHERE Field = ?', [nombre]);
      if (existe.length > 0) {
        console.log(`La columna ${nombre} ya existe en TD_ALUMNOS.`);
        continue;
      }
      await connection.query(`ALTER TABLE TD_ALUMNOS ADD COLUMN ${nombre} ${ddl}`);
      console.log(`✅ Columna ${nombre} agregada a TD_ALUMNOS.`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
