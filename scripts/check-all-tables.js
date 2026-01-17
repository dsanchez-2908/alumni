const mysql = require('mysql2/promise');

async function checkAllTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Verificando estructura de tablas ===\n');
    
    // TD_ALUMNOS
    console.log('--- TD_ALUMNOS ---');
    const [alumnosColumns] = await connection.query("DESCRIBE TD_ALUMNOS");
    alumnosColumns.forEach(col => {
      console.log(`  ${col.Field}`);
    });
    
    // TD_GRUPOS_FAMILIARES
    console.log('\n--- TD_GRUPOS_FAMILIARES ---');
    const [gruposColumns] = await connection.query("DESCRIBE TD_GRUPOS_FAMILIARES");
    gruposColumns.forEach(col => {
      console.log(`  ${col.Field}`);
    });
    
    // TD_TALLERES
    console.log('\n--- TD_TALLERES ---');
    const [talleresColumns] = await connection.query("DESCRIBE TD_TALLERES");
    talleresColumns.forEach(col => {
      console.log(`  ${col.Field}`);
    });
    
    // TD_PAGOS
    console.log('\n--- TD_PAGOS ---');
    const [pagosColumns] = await connection.query("DESCRIBE TD_PAGOS");
    pagosColumns.forEach(col => {
      console.log(`  ${col.Field}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAllTables();
