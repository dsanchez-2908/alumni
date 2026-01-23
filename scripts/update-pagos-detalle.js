const mysql = require('mysql2/promise');

async function updatePagosDetalle() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Actualizando TD_PAGOS_DETALLE...\n');

    // Agregar campo para tipo de pago y excepción
    try {
      await connection.execute(`
        ALTER TABLE TD_PAGOS_DETALLE 
        ADD COLUMN dsTipoPago ENUM('Efectivo','Transferencia','Excepcion') NOT NULL DEFAULT 'Efectivo' AFTER nuMonto
      `);
      console.log('✓ Campo dsTipoPago agregado\n');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('- Campo dsTipoPago ya existe\n');
      } else {
        throw e;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE TD_PAGOS_DETALLE 
        ADD COLUMN snEsExcepcion BOOLEAN DEFAULT FALSE AFTER dsTipoPago
      `);
      console.log('✓ Campo snEsExcepcion agregado\n');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('- Campo snEsExcepcion ya existe\n');
      } else {
        throw e;
      }
    }

    // Verificar estructura final
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM TD_PAGOS_DETALLE"
    );
    
    console.log('Estructura actualizada de TD_PAGOS_DETALLE:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Default !== null ? ' - Default: ' + col.Default : ''}`);
    });

  } finally {
    await connection.end();
  }
}

updatePagosDetalle().catch(console.error);
