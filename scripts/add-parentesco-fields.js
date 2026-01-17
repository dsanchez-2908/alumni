const mysql = require('mysql2/promise');

async function checkSchema() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== TD_GRUPOS_FAMILIARES - Estructura Actual ===\n');
    const [cols] = await conn.query('DESCRIBE TD_GRUPOS_FAMILIARES');
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`));
    
    console.log('\n=== Agregando nuevos campos ===\n');
    
    try {
      // Agregar dsParentesco1 (para el primer contacto existente)
      await conn.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsParentesco1 VARCHAR(50) NULL AFTER dsTelefonoContacto
      `);
      console.log('✓ Agregado dsParentesco1');
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; console.log('- dsParentesco1 ya existe'); }
    
    try {
      // Agregar dsParentescoMail1 (para el mail existente)
      await conn.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsParentescoMail1 VARCHAR(50) NULL AFTER dsMailContacto
      `);
      console.log('✓ Agregado dsParentescoMail1');
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; console.log('- dsParentescoMail1 ya existe'); }
    
    try {
      // Agregar segundo contacto telefónico
      await conn.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsTelefonoContacto2 VARCHAR(50) NULL AFTER dsParentescoMail1
      `);
      console.log('✓ Agregado dsTelefonoContacto2');
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; console.log('- dsTelefonoContacto2 ya existe'); }
    
    try {
      await conn.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsParentesco2 VARCHAR(50) NULL AFTER dsTelefonoContacto2
      `);
      console.log('✓ Agregado dsParentesco2');
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; console.log('- dsParentesco2 ya existe'); }
    
    try {
      // Agregar segundo email
      await conn.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsMailContacto2 VARCHAR(100) NULL AFTER dsParentesco2
      `);
      console.log('✓ Agregado dsMailContacto2');
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; console.log('- dsMailContacto2 ya existe'); }
    
    try {
      await conn.query(`
        ALTER TABLE TD_GRUPOS_FAMILIARES 
        ADD COLUMN dsParentescoMail2 VARCHAR(50) NULL AFTER dsMailContacto2
      `);
      console.log('✓ Agregado dsParentescoMail2');
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; console.log('- dsParentescoMail2 ya existe'); }
    
    console.log('\n=== Estructura Final ===\n');
    const [newCols] = await conn.query('DESCRIBE TD_GRUPOS_FAMILIARES');
    newCols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await conn.end();
  }
}

checkSchema();
