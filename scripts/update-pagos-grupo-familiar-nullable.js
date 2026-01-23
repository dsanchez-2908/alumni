const mysql = require('mysql2/promise');

async function updatePagosGrupoFamiliar() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni',
    port: 3306
  });

  try {
    console.log('Verificando si cdGrupoFamiliar en TD_PAGOS permite NULL...');

    // Modificar la columna para permitir NULL
    await connection.execute(`
      ALTER TABLE TD_PAGOS 
      MODIFY COLUMN cdGrupoFamiliar INT NULL
    `);

    console.log('✅ Columna cdGrupoFamiliar actualizada para permitir NULL');
    console.log('Ahora los pagos pueden registrarse para alumnos sin grupo familiar');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

updatePagosGrupoFamiliar()
  .then(() => {
    console.log('\n✅ Actualización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en la actualización:', error);
    process.exit(1);
  });
