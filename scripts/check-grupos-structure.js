const mysql = require('mysql2/promise');

async function checkGruposFamiliares() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    // Ver todas las tablas con 'grupo' o 'familiar'
    const [tables] = await connection.execute(
      "SHOW TABLES"
    );
    
    console.log('Todas las tablas relacionadas con grupos familiares:');
    console.log('='.repeat(80));
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      if (tableName.toLowerCase().includes('grupo') || tableName.toLowerCase().includes('familiar')) {
        console.log(tableName);
      }
    });
    
    console.log('\n');
    
    // Ver estructura de TD_GRUPOS_FAMILIARES
    const [columnsGF] = await connection.execute(
      "SHOW COLUMNS FROM TD_GRUPOS_FAMILIARES"
    );
    
    console.log('Estructura de TD_GRUPOS_FAMILIARES:');
    console.log('='.repeat(80));
    columnsGF.forEach(col => {
      console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Key ? ' - ' + col.Key : ''}`);
    });

  } finally {
    await connection.end();
  }
}

checkGruposFamiliares().catch(console.error);
