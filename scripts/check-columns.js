const mysql = require('mysql2/promise');

async function checkColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni',
    port: 3306
  });

  try {
    // Check TD_ALUMNOS
    const [alumnosColumns] = await connection.execute('SHOW COLUMNS FROM TD_ALUMNOS');
    console.log('\n=== TD_ALUMNOS COLUMNS ===');
    alumnosColumns.forEach(col => {
      if (col.Field.toLowerCase().includes('nacimiento') || col.Field.toLowerCase().includes('fecha')) {
        console.log(`${col.Field}: ${col.Type}`);
      }
    });

    // Check TD_PERSONAL
    const [personalColumns] = await connection.execute('SHOW COLUMNS FROM TD_PERSONAL');
    console.log('\n=== TD_PERSONAL COLUMNS ===');
    personalColumns.forEach(col => {
      if (col.Field.toLowerCase().includes('nacimiento') || col.Field.toLowerCase().includes('fecha')) {
        console.log(`${col.Field}: ${col.Type}`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkColumns();
