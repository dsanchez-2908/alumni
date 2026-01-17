const mysql = require('mysql2/promise');

async function checkTipoTaller() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Buscando tabla de tipos ===');
    const [tables] = await connection.execute("SHOW TABLES LIKE '%TIPO%'");
    console.log('Tablas con TIPO:', tables);

    const [allTables] = await connection.execute("SHOW TABLES");
    console.log('\n=== Todas las tablas ===');
    allTables.forEach(t => console.log(Object.values(t)[0]));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTipoTaller();
