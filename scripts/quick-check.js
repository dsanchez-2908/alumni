const mysql = require('mysql2/promise');

async function quickCheck() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    // Query simple
    const [result] = await connection.execute(`
      SELECT 
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.cdEstado,
        p.dsNombreCompleto
      FROM TD_TALLERES t
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE p.dsNombreCompleto LIKE '%profe1%'
      ORDER BY tt.dsNombreTaller
    `);

    console.log('Talleres de profe1:');
    result.forEach((t) => {
      console.log(`- ${t.dsNombreTaller} (${t.nuAnioTaller}) - Estado: ${t.cdEstado} - ID: ${t.cdTaller}`);
    });

    console.log('\nQuery del dashboard (cdEstado = 1, año = 2026):');
    const [filtrados] = await connection.execute(`
      SELECT 
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.cdEstado
      FROM TD_TALLERES t
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE t.cdEstado = 1 
        AND p.cdEstado = 1
        AND p.dsTipoPersonal = 'Profesor'
        AND t.nuAnioTaller = 2026
        AND p.dsNombreCompleto LIKE '%profe1%'
    `);

    filtrados.forEach((t) => {
      console.log(`- ${t.dsNombreTaller} (${t.nuAnioTaller}) - ID: ${t.cdTaller}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

quickCheck();
