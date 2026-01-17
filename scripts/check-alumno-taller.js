const mysql = require('mysql2/promise');

async function checkAlumnoTaller() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Estructura de TR_ALUMNO_TALLER ===');
    const [structure] = await connection.execute('DESCRIBE tr_alumno_taller');
    structure.forEach(col => {
      console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAlumnoTaller();
