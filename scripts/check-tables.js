const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Verificando tablas en la base de datos...\n');
    
    // Mostrar todas las tablas TR_
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'TR_%'"
    );
    
    console.log('Tablas de relación (TR_):');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${Object.values(table)[0]}`);
    });
    
    // Verificar específicamente TR_INSCRIPCION_ALUMNO
    console.log('\n--- Verificando TR_INSCRIPCION_ALUMNO ---');
    const [inscripcionTables] = await connection.query(
      "SHOW TABLES LIKE 'TR_INSCRIPCION_ALUMNO'"
    );
    
    if (inscripcionTables.length === 0) {
      console.log('❌ La tabla TR_INSCRIPCION_ALUMNO NO EXISTE');
    } else {
      console.log('✅ La tabla TR_INSCRIPCION_ALUMNO existe');
      
      // Mostrar estructura
      const [columns] = await connection.query(
        "DESCRIBE TR_INSCRIPCION_ALUMNO"
      );
      console.log('\nEstructura de TR_INSCRIPCION_ALUMNO:');
      columns.forEach(col => {
        console.log(`  ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables();
