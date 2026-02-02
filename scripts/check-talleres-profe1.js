const mysql = require('mysql2/promise');

async function checkTalleres() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Verificando todos los talleres de profe1...\n');
    
    // Buscar profe1
    const [personal] = await connection.execute(`
      SELECT cdPersonal, dsNombreCompleto 
      FROM TD_PERSONAL 
      WHERE dsNombreCompleto LIKE '%profe1%'
    `);

    if (personal.length === 0) {
      console.log('No se encontró profe1');
      return;
    }

    const cdPersonal = personal[0].cdPersonal;
    console.log(`Profesor: ${personal[0].dsNombreCompleto} (ID: ${cdPersonal})\n`);

    // Ver todos los talleres
    const [talleres] = await connection.execute(`
      SELECT 
        t.cdTaller,
        t.cdPersonal,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.cdEstado,
        t.feInicioTaller,
        CASE t.cdEstado
          WHEN 1 THEN 'Activo'
          WHEN 2 THEN 'Finalizado'
          WHEN 3 THEN 'Inactivo'
          ELSE 'Desconocido'
        END as estado_desc
      FROM TD_TALLERES t
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE t.cdPersonal = ?
      ORDER BY t.nuAnioTaller DESC, tt.dsNombreTaller
    `, [cdPersonal]);

    console.log('=== TODOS LOS TALLERES ===');
    talleres.forEach((t) => {
      console.log(`ID: ${t.cdTaller}`);
      console.log(`Taller: ${t.dsNombreTaller} (${t.nuAnioTaller})`);
      console.log(`Estado: ${t.cdEstado} (${t.estado_desc})`);
      console.log(`Fecha inicio: ${t.feInicioTaller}`);
      console.log('---');
    });

    // Ver cuáles cumplen con la condición del dashboard
    const currentYear = 2026;
    const [talleresFiltrados] = await connection.execute(`
      SELECT 
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.cdEstado
      FROM TD_TALLERES t
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE t.cdPersonal = ?
        AND t.cdEstado = 1
        AND t.nuAnioTaller = ?
    `, [cdPersonal, currentYear]);

    console.log('\n=== TALLERES QUE CUMPLEN CONDICIÓN (cdEstado=1, año=2026) ===');
    talleresFiltrados.forEach((t) => {
      console.log(`${t.dsNombreTaller} (${t.nuAnioTaller}) - Estado: ${t.cdEstado}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTalleres();
