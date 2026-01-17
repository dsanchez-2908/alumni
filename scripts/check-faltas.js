const mysql = require('mysql2/promise');

async function checkFaltas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Estructura de TD_FALTAS ===');
    const [structure] = await connection.execute('DESCRIBE TD_FALTAS');
    structure.forEach(col => {
      console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
    });

    console.log('\n=== Estructura de TD_NOTIFICACIONES_FALTAS ===');
    const [structure2] = await connection.execute('DESCRIBE TD_NOTIFICACIONES_FALTAS');
    structure2.forEach(col => {
      console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkFaltas();
