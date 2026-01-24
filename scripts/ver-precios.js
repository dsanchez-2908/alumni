const mysql = require('mysql2/promise');

async function verEstructuraPrecios() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Estructura de TD_PRECIOS_TALLERES:');
    const [estructura] = await connection.execute('DESCRIBE TD_PRECIOS_TALLERES');
    console.table(estructura);
  } finally {
    await connection.end();
  }
}

verEstructuraPrecios().catch(console.error);
