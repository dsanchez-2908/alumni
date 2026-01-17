const mysql = require('mysql2/promise');

async function checkTalleres() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Estructura de TD_TALLERES ===');
    const [structure] = await connection.execute('DESCRIBE TD_TALLERES');
    structure.forEach(col => {
      console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
    });

    console.log('\n=== Datos de ejemplo ===');
    const [talleres] = await connection.execute(`
      SELECT t.*, 
             tt.dsNombreTaller,
             CONCAT(p.dsNombre, ' ', p.dsApellido) as nombrePersonal
      FROM TD_TALLERES t
      LEFT JOIN TD_TIPOS_TALLER tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      LIMIT 3
    `);
    console.log(talleres);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTalleres();
