const mysql = require('mysql2/promise');

async function checkAlumnoTalleres() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Verificando inscripciones del alumno Matias Torrez (DNI 16321456) ===\n');
    
    // 1. Datos básicos del alumno
    const [alumno] = await connection.execute(
      'SELECT * FROM TD_ALUMNOS WHERE dsDNI = ?',
      ['16321456']
    );
    console.log('1. Datos del alumno:');
    console.log(alumno[0]);
    
    // 2. Inscripciones del alumno
    console.log('\n2. Inscripciones en tr_inscripcion_alumno:');
    const [inscripciones] = await connection.execute(
      'SELECT * FROM tr_inscripcion_alumno WHERE cdAlumno = ?',
      [alumno[0].cdAlumno]
    );
    console.log(inscripciones);
    
    // 3. Detalles completos de las inscripciones
    console.log('\n3. Detalles completos con JOIN:');
    const [detalles] = await connection.execute(`
      SELECT 
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        ia.cdInscripcion,
        ia.cdEstado as estadoInscripcion,
        t.cdTaller,
        t.dsTaller,
        t.cdEstado as estadoTaller,
        tt.cdTipoTaller,
        tt.dsNombreTaller
      FROM TD_ALUMNOS a
      LEFT JOIN tr_inscripcion_alumno ia ON a.cdAlumno = ia.cdAlumno
      LEFT JOIN TD_TALLERES t ON ia.cdTaller = t.cdTaller
      LEFT JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE a.dsDNI = ?
    `, ['16321456']);
    console.log(detalles);
    
    // 4. Query que usa la API
    console.log('\n4. Query de la API (con filtro cdEstado = 1):');
    const [apiQuery] = await connection.execute(`
      SELECT 
        a.cdAlumno,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as dsNombreCompleto,
        a.dsDNI,
        GROUP_CONCAT(
          DISTINCT tt.dsNombreTaller
          ORDER BY tt.dsNombreTaller
          SEPARATOR ', '
        ) as talleres
      FROM TD_ALUMNOS a
      LEFT JOIN tr_inscripcion_alumno ia ON a.cdAlumno = ia.cdAlumno AND ia.cdEstado = 1
      LEFT JOIN TD_TALLERES t ON ia.cdTaller = t.cdTaller
      LEFT JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE a.dsDNI = ?
      GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido, a.dsDNI
    `, ['16321456']);
    console.log(apiQuery);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAlumnoTalleres();
