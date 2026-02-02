const mysql = require('mysql2/promise');

async function checkPrecios() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== TODOS LOS REGISTROS EN td_precios_talleres ===\n');
    
    const [todos] = await connection.execute(`
      SELECT 
        cdPrecio,
        cdTipoTaller,
        DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
        nuPrecioCompletoEfectivo,
        cdEstado
      FROM TD_PRECIOS_TALLERES
      ORDER BY feInicioVigencia DESC, cdTipoTaller
    `);

    console.log(`Total registros: ${todos.length}\n`);
    todos.forEach((p) => {
      console.log(`ID: ${p.cdPrecio} | Taller: ${p.cdTipoTaller} | Vigencia: ${p.feInicioVigencia} | Precio: ${p.nuPrecioCompletoEfectivo} | Estado: ${p.cdEstado}`);
    });

    console.log('\n=== QUERY DEL API (agrupado=true, cdEstado=1) ===\n');
    
    const [agrupados] = await connection.execute(`
      SELECT 
        DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
        u.dsNombreCompleto as nombreUsuarioAlta,
        MIN(DATE_FORMAT(p.feAlta, '%Y-%m-%d')) as feAlta,
        COUNT(DISTINCT p.cdTipoTaller) as cantidadTalleres
      FROM TD_PRECIOS_TALLERES p
      LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
      WHERE p.cdEstado = 1
      GROUP BY DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d'), u.dsNombreCompleto
      ORDER BY DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') DESC
    `);

    console.log(`Vigencias agrupadas: ${agrupados.length}\n`);
    agrupados.forEach((v) => {
      console.log(`Vigencia: ${v.feInicioVigencia} | Usuario: ${v.nombreUsuarioAlta} | Talleres: ${v.cantidadTalleres}`);
    });

    console.log('\n=== REGISTROS POR ESTADO ===\n');
    const [porEstado] = await connection.execute(`
      SELECT cdEstado, COUNT(*) as total
      FROM TD_PRECIOS_TALLERES
      GROUP BY cdEstado
    `);
    
    porEstado.forEach((e) => {
      console.log(`Estado ${e.cdEstado}: ${e.total} registros`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

checkPrecios();
