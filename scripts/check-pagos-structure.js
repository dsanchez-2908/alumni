const mysql = require('mysql2/promise');

async function checkPagosStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Verificando estructura de tablas de pagos...\n');

    // Verificar si existe TD_PRECIOS_TALLERES
    try {
      const [preciosColumns] = await connection.execute(
        "SHOW COLUMNS FROM TD_PRECIOS_TALLERES"
      );
      console.log('TD_PRECIOS_TALLERES:');
      console.log('='.repeat(80));
      preciosColumns.forEach(col => {
        console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Key ? ' - ' + col.Key : ''}${col.Default !== null ? ' - Default: ' + col.Default : ''}`);
      });
      console.log('\n');
    } catch (e) {
      console.log('TD_PRECIOS_TALLERES: NO EXISTE\n');
    }

    // Verificar TD_PAGOS
    try {
      const [pagosColumns] = await connection.execute(
        "SHOW COLUMNS FROM TD_PAGOS"
      );
      console.log('TD_PAGOS:');
      console.log('='.repeat(80));
      pagosColumns.forEach(col => {
        console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Key ? ' - ' + col.Key : ''}${col.Default !== null ? ' - Default: ' + col.Default : ''}`);
      });
      console.log('\n');
    } catch (e) {
      console.log('TD_PAGOS: NO EXISTE\n');
    }

    // Verificar TD_PAGOS_DETALLE
    try {
      const [detalleColumns] = await connection.execute(
        "SHOW COLUMNS FROM TD_PAGOS_DETALLE"
      );
      console.log('TD_PAGOS_DETALLE:');
      console.log('='.repeat(80));
      detalleColumns.forEach(col => {
        console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Key ? ' - ' + col.Key : ''}${col.Default !== null ? ' - Default: ' + col.Default : ''}`);
      });
      console.log('\n');
    } catch (e) {
      console.log('TD_PAGOS_DETALLE: NO EXISTE\n');
    }

    // Ver todas las tablas relacionadas con pagos
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE '%PAGO%' OR SHOW TABLES LIKE '%PRECIO%'"
    );
    console.log('Tablas relacionadas con pagos/precios encontradas:');
    console.log('='.repeat(80));
    tables.forEach(table => {
      console.log(Object.values(table)[0]);
    });

  } finally {
    await connection.end();
  }
}

checkPagosStructure().catch(console.error);
