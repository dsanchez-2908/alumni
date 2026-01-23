const mysql = require('mysql2/promise');

async function checkAlumnos() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM TD_ALUMNOS"
    );
    
    console.log('Estructura de TD_ALUMNOS:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Key ? ' - ' + col.Key : ''}`);
    });

  } finally {
    await connection.end();
  }
}

checkAlumnos().catch(console.error);
