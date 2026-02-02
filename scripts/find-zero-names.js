const mysql = require('mysql2/promise');

async function findZeroInNames() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Buscando nombres con "0" al final...\n');
    
    // Buscar en alumnos
    const [alumnos] = await connection.execute(`
      SELECT cdAlumno, dsNombre, dsApellido, feNacimiento
      FROM TD_ALUMNOS 
      WHERE cdEstado = 1 
        AND (dsNombre LIKE '%0' OR dsApellido LIKE '%0')
      LIMIT 10
    `);

    console.log('=== ALUMNOS CON 0 EN EL NOMBRE ===');
    alumnos.forEach((row) => {
      console.log(`ID: ${row.cdAlumno}`);
      console.log(`Nombre: "${row.dsNombre}"`);
      console.log(`Apellido: "${row.dsApellido}"`);
      console.log('---');
    });

    // Buscar en personal
    const [personal] = await connection.execute(`
      SELECT cdPersonal, dsNombreCompleto, feNacimiento
      FROM TD_PERSONAL 
      WHERE cdEstado = 1 
        AND dsTipoPersonal = 'Profesor'
        AND dsNombreCompleto LIKE '%0'
      LIMIT 10
    `);

    console.log('\n=== PERSONAL CON 0 EN EL NOMBRE ===');
    personal.forEach((row) => {
      console.log(`ID: ${row.cdPersonal}`);
      console.log(`Nombre: "${row.dsNombreCompleto}"`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

findZeroInNames();
