const mysql = require('mysql2/promise');

async function fixPrecioTeatro() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Actualizando fecha de inicio de vigencia del precio 39...\n');
    
    const [result] = await conn.execute(
      'UPDATE TD_PRECIOS_TALLERES SET feInicioVigencia = ? WHERE cdPrecio = ?',
      ['2026-03-01', 39]
    );
    
    console.log('✅ Precio actualizado:', result.affectedRows, 'registro(s)\n');
    
    console.log('Verificando cambio:');
    const [precio] = await conn.execute(`
      SELECT 
        cdPrecio, 
        cdTipoTaller, 
        DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
        cdEstado,
        nuPrecioCompletoEfectivo,
        nuPrecioDescuentoEfectivo
      FROM TD_PRECIOS_TALLERES 
      WHERE cdPrecio = 39
    `);
    
    console.table(precio);
    
  } finally {
    await conn.end();
  }
}

fixPrecioTeatro().catch(console.error);
