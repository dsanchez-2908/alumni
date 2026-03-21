const mysql = require('mysql2/promise');

async function addCdFaltaToNovedades() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Agregando campo cdFalta a TD_NOVEDADES_ALUMNO ===\n');

    // Verificar si la columna ya existe
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM TD_NOVEDADES_ALUMNO WHERE Field = 'cdFalta'"
    );

    if (columns.length > 0) {
      console.log('⚠️  La columna cdFalta ya existe en TD_NOVEDADES_ALUMNO');
      console.log('No es necesario hacer cambios.\n');
    } else {
      console.log('Agregando columna cdFalta...');
      
      // Agregar la columna cdFalta (nullable para mantener compatibilidad con novedades generales)
      await connection.execute(`
        ALTER TABLE TD_NOVEDADES_ALUMNO 
        ADD COLUMN cdFalta INT NULL 
        COMMENT 'Relación opcional con una falta específica'
        AFTER cdAlumno
      `);
      
      console.log('✓ Columna cdFalta agregada exitosamente');

      // Agregar índice para mejorar el rendimiento de consultas
      console.log('Agregando índice idx_falta...');
      await connection.execute(`
        ALTER TABLE TD_NOVEDADES_ALUMNO 
        ADD KEY idx_falta (cdFalta)
      `);
      
      console.log('✓ Índice idx_falta agregado exitosamente');

      // Agregar foreign key constraint (sin ON DELETE para mantener novedades aunque se elimine la falta)
      console.log('Agregando constraint de foreign key...');
      await connection.execute(`
        ALTER TABLE TD_NOVEDADES_ALUMNO 
        ADD CONSTRAINT td_novedades_alumno_ibfk_4 
        FOREIGN KEY (cdFalta) REFERENCES TD_ASISTENCIAS(cdFalta) 
        ON DELETE SET NULL
      `);
      
      console.log('✓ Foreign key constraint agregado exitosamente\n');
    }

    // Mostrar la estructura de la tabla
    console.log('Estructura actualizada de TD_NOVEDADES_ALUMNO:');
    const [structure] = await connection.execute('DESCRIBE TD_NOVEDADES_ALUMNO');
    console.table(structure);

    // Mostrar estadísticas
    console.log('\nEstadísticas de TD_NOVEDADES_ALUMNO:');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_novedades,
        SUM(CASE WHEN cdFalta IS NULL THEN 1 ELSE 0 END) as novedades_generales,
        SUM(CASE WHEN cdFalta IS NOT NULL THEN 1 ELSE 0 END) as novedades_asociadas_faltas
      FROM TD_NOVEDADES_ALUMNO
    `);
    console.table(stats);

    console.log('\n✅ Script ejecutado correctamente');
    console.log('\n📝 Notas importantes:');
    console.log('- cdFalta es NULL para novedades generales del alumno');
    console.log('- cdFalta tiene valor cuando la novedad está asociada a una falta específica');
    console.log('- Las novedades existentes quedan con cdFalta = NULL (compatibilidad)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addCdFaltaToNovedades()
  .then(() => {
    console.log('\n=== Proceso completado ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== Error durante el proceso ===');
    console.error(error);
    process.exit(1);
  });
