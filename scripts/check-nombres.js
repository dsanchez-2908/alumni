const mysql = require('mysql2/promise');

async function checkAlumnosNames() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Verificando nombres en TD_ALUMNOS...\n');
    
    const [rows] = await connection.execute(`
      SELECT 
        cdAlumno,
        dsNombre,
        dsApellido,
        CONCAT(dsNombre, ' ', dsApellido) as nombreCompleto,
        feNacimiento
      FROM TD_ALUMNOS 
      WHERE cdEstado = 1 AND feNacimiento IS NOT NULL
      ORDER BY feNacimiento
      LIMIT 5
    `);

    rows.forEach((row) => {
      console.log(`ID: ${row.cdAlumno}`);
      console.log(`Nombre: "${row.dsNombre}"`);
      console.log(`Apellido: "${row.dsApellido}"`);
      console.log(`Nombre completo: "${row.nombreCompleto}"`);
      console.log(`Fecha nacimiento: ${row.feNacimiento}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAlumnosNames();
