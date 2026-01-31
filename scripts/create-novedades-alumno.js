const mysql = require('mysql2/promise');

async function createNovedadesTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Creando tabla TD_NOVEDADES_ALUMNO...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS TD_NOVEDADES_ALUMNO (
        cdNovedad INT AUTO_INCREMENT PRIMARY KEY,
        cdAlumno INT NOT NULL,
        dsNovedad TEXT NOT NULL,
        cdUsuario INT NOT NULL,
        feAlta DATETIME DEFAULT CURRENT_TIMESTAMP,
        cdEstado INT DEFAULT 1,
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno),
        FOREIGN KEY (cdUsuario) REFERENCES TD_USUARIOS(cdUsuario),
        FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado),
        INDEX idx_alumno (cdAlumno),
        INDEX idx_fecha (feAlta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Tabla TD_NOVEDADES_ALUMNO creada exitosamente');

    await connection.end();
    console.log('\n¡Script ejecutado correctamente!');
  } catch (error) {
    console.error('Error al crear la tabla:', error);
    await connection.end();
    process.exit(1);
  }
}

createNovedadesTable();
