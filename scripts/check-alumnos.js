const mysql = require('mysql2/promise');

async function checkAlumnosTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Verificando estructura de TD_ALUMNOS...\n');
    
    const [columns] = await connection.query("DESCRIBE TD_ALUMNOS");
    
    console.log('Columnas de TD_ALUMNOS:');
    columns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - Null: ${col.Null} - Key: ${col.Key} - Default: ${col.Default}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAlumnosTable();
