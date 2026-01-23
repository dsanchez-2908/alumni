const mysql = require('mysql2/promise');

async function addUsuarioProfesor() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Agregando campo cdPersonal a TD_USUARIOS...');
    
    // Agregar columna cdPersonal (nullable) con FK a TD_PERSONAL
    await connection.query(`
      ALTER TABLE TD_USUARIOS 
      ADD COLUMN cdPersonal INT NULL,
      ADD CONSTRAINT fk_usuarios_personal 
        FOREIGN KEY (cdPersonal) 
        REFERENCES TD_PERSONAL(cdPersonal)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);
    
    console.log('✓ Campo cdPersonal agregado exitosamente');
    console.log('✓ Foreign key configurada con TD_PERSONAL');
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addUsuarioProfesor()
  .then(() => {
    console.log('\n✓ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error ejecutando script:', error);
    process.exit(1);
  });
