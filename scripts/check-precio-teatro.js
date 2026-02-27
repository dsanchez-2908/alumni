const mysql = require('mysql2/promise');

async function checkPrecioTeatro() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Buscando precios para cdTipoTaller = 8 (Teatro Adulto) ===\n');
    
    const [precios] = await conn.execute(`
      SELECT 
        cdPrecio, 
        cdTipoTaller, 
        DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
        cdEstado,
        nuPrecioCompletoEfectivo,
        nuPrecioDescuentoEfectivo
      FROM TD_PRECIOS_TALLERES 
      WHERE cdTipoTaller = 8 
      ORDER BY feInicioVigencia DESC
    `);
    
    console.table(precios);
    
    console.log('\n=== Verificando precio vigente para 2026-03-01 ===');
    console.log('Condición: feInicioVigencia <= "2026-03-01" AND cdEstado = 1\n');
    
    const [vigentes] = await conn.execute(`
      SELECT * 
      FROM TD_PRECIOS_TALLERES 
      WHERE cdTipoTaller = 8 
        AND feInicioVigencia <= '2026-03-01'
        AND cdEstado = 1 
      ORDER BY feInicioVigencia DESC 
      LIMIT 1
    `);
    
    if (vigentes.length > 0) {
      console.log('✅ Precio encontrado:');
      console.table(vigentes);
    } else {
      console.log('❌ No se encontró precio vigente para marzo 2026');
    }
    
    console.log('\n=== Verificando tipo de taller 8 ===');
    const [tipoTaller] = await conn.execute(`
      SELECT * FROM TD_TIPO_TALLERES WHERE cdTipoTaller = 8
    `);
    console.table(tipoTaller);
    
  } finally {
    await conn.end();
  }
}

checkPrecioTeatro().catch(console.error);
