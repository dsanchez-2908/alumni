const mysql = require('mysql2/promise');

async function simple() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'admin', database: 'alumni'
  });

  const [all] = await conn.execute('SELECT * FROM TD_PRECIOS_TALLERES ORDER BY feInicioVigencia DESC');
  console.log(`\nTotal registros: ${all.length}`);
  
  const [active] = await conn.execute('SELECT * FROM TD_PRECIOS_TALLERES WHERE cdEstado = 1 ORDER BY feInicioVigencia DESC');
  console.log(`Registros activos (cdEstado=1): ${active.length}`);
  
  const [grouped] = await conn.execute(`
    SELECT DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as fecha, COUNT(*) as total
    FROM TD_PRECIOS_TALLERES
    WHERE cdEstado = 1
    GROUP BY DATE_FORMAT(feInicioVigencia, '%Y-%m-%d')
    ORDER BY fecha DESC
  `);
  
  console.log(`\nVigencias agrupadas: ${grouped.length}`);
  grouped.forEach(g => console.log(`  ${g.fecha}: ${g.total} talleres`));
  
  await conn.end();
  process.exit(0);
}

simple();
