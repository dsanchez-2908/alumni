const mysql = require('mysql2/promise');

async function addAvisoColumn() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Agregando columna snAviso a TD_ASISTENCIAS ===\n');

    // Verificar si la columna ya existe
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM TD_ASISTENCIAS WHERE Field = 'snAviso'"
    );

    if (columns.length > 0) {
      console.log('⚠️  La columna snAviso ya existe en TD_ASISTENCIAS');
      console.log('No es necesario hacer cambios.\n');
    } else {
      console.log('Agregando columna snAviso...');
      
      // Agregar la columna
      await connection.execute(`
        ALTER TABLE TD_ASISTENCIAS 
        ADD COLUMN snAviso TINYINT(1) NOT NULL DEFAULT 0 
        COMMENT '0=No avisó, 1=Avisó antes de faltar'
        AFTER dsObservacion
      `);
      
      console.log('✓ Columna snAviso agregada exitosamente\n');
    }

    // Mostrar la estructura de la tabla
    console.log('Estructura actual de TD_ASISTENCIAS:');
    const [structure] = await connection.execute('DESCRIBE TD_ASISTENCIAS');
    console.table(structure);

    // Mostrar estadísticas
    console.log('\nEstadísticas de TD_ASISTENCIAS:');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_registros,
        SUM(CASE WHEN snAviso = 0 THEN 1 ELSE 0 END) as sin_aviso,
        SUM(CASE WHEN snAviso = 1 THEN 1 ELSE 0 END) as con_aviso
      FROM TD_ASISTENCIAS
    `);
    console.table(stats);

    console.log('\n✅ Script ejecutado correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addAvisoColumn()
  .then(() => {
    console.log('\n=== Proceso completado ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== Error durante el proceso ===');
    console.error(error);
    process.exit(1);
  });
