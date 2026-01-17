const mysql = require('mysql2/promise');

async function checkPersonal() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Estructura de TD_PERSONAL ===');
    const [structure] = await connection.execute('DESCRIBE TD_PERSONAL');
    structure.forEach(col => {
      console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key}`);
    });

    console.log('\n=== Datos de ejemplo ===');
    const [data] = await connection.execute('SELECT * FROM TD_PERSONAL LIMIT 2');
    console.log(data);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkPersonal();
