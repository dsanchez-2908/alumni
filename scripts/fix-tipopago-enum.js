const mysql = require('mysql2/promise');

async function fixTipoPagoEnum() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('🔧 Actualizando columna dsTipoPago en TD_PAGOS...\n');
    
    // Modificar el ENUM para incluir 'Excepcion'
    await connection.query(`
      ALTER TABLE TD_PAGOS 
      MODIFY COLUMN dsTipoPago ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo'
    `);
    
    console.log('✅ Columna dsTipoPago actualizada correctamente!');
    console.log('   Valores permitidos: Efectivo, Transferencia, Excepcion\n');
    
    // Verificar la estructura
    const [columns] = await connection.query("DESCRIBE TD_PAGOS");
    const tipoPagoColumn = columns.find(col => col.Field === 'dsTipoPago');
    
    console.log('📋 Estructura actual de dsTipoPago:');
    console.log(`   Type: ${tipoPagoColumn.Type}`);
    console.log(`   Null: ${tipoPagoColumn.Null}`);
    console.log(`   Default: ${tipoPagoColumn.Default}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixTipoPagoEnum();
