const mysql = require('mysql2/promise');

async function addMissingTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni',
    multipleStatements: true
  });

  console.log('Conectado a MySQL. Creando tabla TR_INSCRIPCION_ALUMNO...');

  try {
    // Verificar si la tabla existe
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'TR_INSCRIPCION_ALUMNO'"
    );

    if (tables.length > 0) {
      console.log('La tabla TR_INSCRIPCION_ALUMNO ya existe.');
      await connection.end();
      return;
    }

    // Crear la tabla TR_INSCRIPCION_ALUMNO
    const createTableSQL = `
      CREATE TABLE TR_INSCRIPCION_ALUMNO (
        cdInscripcion INT AUTO_INCREMENT PRIMARY KEY,
        cdAlumno INT NOT NULL,
        cdTaller INT NOT NULL,
        feInscripcion DATE NOT NULL,
        cdEstado INT DEFAULT 1,
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        feActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
        FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller) ON DELETE CASCADE,
        UNIQUE KEY UK_Alumno_Taller (cdAlumno, cdTaller, cdEstado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableSQL);
    console.log('✅ Tabla TR_INSCRIPCION_ALUMNO creada exitosamente!');

    // También actualizar TD_GRUPOS_FAMILIARES si le faltan campos
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM TD_GRUPOS_FAMILIARES"
    );
    
    const columnNames = columns.map((col) => col.Field);
    
    if (!columnNames.includes('dsTelefonoContacto')) {
      console.log('Agregando campos faltantes a TD_GRUPOS_FAMILIARES...');
      
      await connection.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsTelefonoContacto VARCHAR(50) NULL AFTER dsNombreGrupo,
        ADD COLUMN dsMailContacto VARCHAR(255) NULL AFTER dsTelefonoContacto,
        ADD COLUMN dsDomicilioFamiliar VARCHAR(500) NULL AFTER dsMailContacto,
        ADD COLUMN cdEstado INT DEFAULT 1 AFTER dsDomicilioFamiliar,
        ADD COLUMN feActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER feCreacion;
      `);
      
      console.log('✅ Campos agregados a TD_GRUPOS_FAMILIARES!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('Conexión cerrada.');
  }
}

addMissingTable()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
