const mysql = require('mysql2/promise');

async function checkInscriptionTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Verificando tablas de inscripción ===\n');
    
    // Alumno Matias Torrez
    const cdAlumno = 6;
    
    console.log('1. Tabla tr_alumno_taller (usada en pantalla de talleres):');
    const [tallerInscripciones] = await connection.execute(
      'SELECT * FROM tr_alumno_taller WHERE cdAlumno = ?',
      [cdAlumno]
    );
    console.log(`Registros encontrados: ${tallerInscripciones.length}`);
    console.log(tallerInscripciones);
    
    console.log('\n2. Tabla tr_inscripcion_alumno (usada en consulta de alumnos):');
    const [inscripcionAlumno] = await connection.execute(
      'SELECT * FROM tr_inscripcion_alumno WHERE cdAlumno = ?',
      [cdAlumno]
    );
    console.log(`Registros encontrados: ${inscripcionAlumno.length}`);
    console.log(inscripcionAlumno);
    
    console.log('\n3. Comparación de registros en ambas tablas:');
    const [comparison] = await connection.execute(`
      SELECT 
        'tr_alumno_taller' as tabla,
        COUNT(*) as total_registros
      FROM tr_alumno_taller
      UNION ALL
      SELECT 
        'tr_inscripcion_alumno' as tabla,
        COUNT(*) as total_registros
      FROM tr_inscripcion_alumno
    `);
    console.log(comparison);
    
    console.log('\n4. Alumnos con inscripción solo en tr_alumno_taller:');
    const [onlyInTaller] = await connection.execute(`
      SELECT DISTINCT
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI
      FROM tr_alumno_taller tat
      INNER JOIN TD_ALUMNOS a ON tat.cdAlumno = a.cdAlumno
      LEFT JOIN tr_inscripcion_alumno ia ON tat.cdAlumno = ia.cdAlumno AND tat.cdTaller = ia.cdTaller
      WHERE ia.cdInscripcion IS NULL
    `);
    console.log(`Total: ${onlyInTaller.length} alumnos`);
    console.log(onlyInTaller);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkInscriptionTables();
