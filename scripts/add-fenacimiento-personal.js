const mysql = require('mysql2/promise');

async function addFeNacimientoToPersonal() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Agregando columna feNacimiento a TD_PERSONAL...');
    
    await connection.execute(`
      ALTER TABLE TD_PERSONAL 
      ADD COLUMN feNacimiento DATE NULL AFTER dsNombreCompleto
    `);
    
    console.log('✓ Columna feNacimiento agregada exitosamente a TD_PERSONAL');
    
    // Verificar
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM TD_PERSONAL WHERE Field = 'feNacimiento'"
    );
    
    if (columns.length > 0) {
      console.log('\nVerificación:');
      console.log(`  ${columns[0].Field}: ${columns[0].Type} - Null: ${columns[0].Null}`);
    }
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('La columna feNacimiento ya existe en TD_PERSONAL');
    } else {
      console.error('Error:', error.message);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addFeNacimientoToPersonal();
