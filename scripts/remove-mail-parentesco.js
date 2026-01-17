const mysql = require('mysql2/promise');

async function removeMailParentesco() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Eliminando campos dsParentescoMail1 y dsParentescoMail2 ===\n');
    
    try {
      await conn.query(`ALTER TABLE TD_GRUPOS_FAMILIARES DROP COLUMN dsParentescoMail1`);
      console.log('✓ Eliminado dsParentescoMail1');
    } catch (e) { 
      if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('- dsParentescoMail1 no existe');
      } else {
        throw e;
      }
    }
    
    try {
      await conn.query(`ALTER TABLE TD_GRUPOS_FAMILIARES DROP COLUMN dsParentescoMail2`);
      console.log('✓ Eliminado dsParentescoMail2');
    } catch (e) { 
      if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('- dsParentescoMail2 no existe');
      } else {
        throw e;
      }
    }
    
    console.log('\n=== Estructura Final ===\n');
    const [cols] = await conn.query('DESCRIBE TD_GRUPOS_FAMILIARES');
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await conn.end();
  }
}

removeMailParentesco();
