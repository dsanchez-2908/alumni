const mysql = require('mysql2/promise');

async function addContactadoField() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Agregando campo snContactado a td_asistencias...\n');

    try {
      await connection.execute(`
        ALTER TABLE td_asistencias
        ADD COLUMN snContactado TINYINT(1) DEFAULT 0
        AFTER dsObservacion
      `);
      console.log('✓ snContactado agregado');
    } catch (e) {
      console.log('⚠ snContactado ya existe');
    }

    console.log('\n✅ Campo agregado exitosamente!\n');

    // Mostrar estructura actualizada
    const [columns] = await connection.query('DESCRIBE td_asistencias');
    console.log('Estructura actualizada de td_asistencias:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addContactadoField().catch(console.error);
