const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n==============================================');
  console.log('  AGREGAR ESTADO "INCOMPLETO" A LA BD');
  console.log('==============================================\n');

  const host = await question('Host (Enter para localhost): ') || 'localhost';
  const user = await question('Usuario (Enter para root): ') || 'root';
  const password = await question('Contraseña: ');
  const database = await question('Nombre de la BD (Enter para alumni): ') || 'alumni';
  const port = await question('Puerto (Enter para 3306): ') || '3306';

  rl.close();

  let connection;
  try {
    console.log('\n⏳ Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });
    console.log('✅ Conectado exitosamente\n');

    // Verificar si ya existe
    console.log('🔍 Verificando si el estado ya existe...');
    const [existing] = await connection.execute(
      'SELECT * FROM TD_ESTADOS WHERE cdEstado = 5'
    );

    if (existing.length > 0) {
      console.log('⚠️  El estado "Incompleto" ya existe en la base de datos:');
      console.log(`   cdEstado: ${existing[0].cdEstado}`);
      console.log(`   dsEstado: ${existing[0].dsEstado}`);
      console.log(`   dsDescripcion: ${existing[0].dsDescripcion}`);
      console.log('\n✨ No es necesario hacer nada más');
      return;
    }

    // Insertar estado
    console.log('➕ Insertando estado "Incompleto"...');
    await connection.execute(`
      INSERT INTO TD_ESTADOS (cdEstado, dsEstado, dsDescripcion) 
      VALUES (5, 'Incompleto', 'Alumno dado de baja antes de finalizar el taller')
    `);
    console.log('✅ Estado insertado correctamente\n');

    // Actualizar registros existentes
    console.log('🔄 Actualizando registros existentes...');
    const [result] = await connection.execute(`
      UPDATE TR_ALUMNO_TALLER 
      SET cdEstado = 5 
      WHERE cdEstado = 2 
        AND feBaja IS NOT NULL 
        AND feFinalizacion IS NULL
    `);
    console.log(`✅ ${result.affectedRows} registro(s) actualizado(s)\n`);

    // Mostrar todos los estados
    console.log('📋 Estados disponibles en TD_ESTADOS:');
    console.log('==============================================');
    const [estados] = await connection.execute(
      'SELECT cdEstado, dsEstado, dsDescripcion FROM TD_ESTADOS ORDER BY cdEstado'
    );
    estados.forEach(e => {
      console.log(`  ${e.cdEstado} - ${e.dsEstado.padEnd(15)} | ${e.dsDescripcion}`);
    });
    console.log('==============================================\n');

    console.log('✨ ¡Migración completada exitosamente!');
    console.log('\nAhora puedes:');
    console.log('  1. Recargar la página en el navegador');
    console.log('  2. Intentar dar de baja al alumno nuevamente');
    console.log('  3. Debería mostrar la advertencia de deudas correctamente\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Verifica tu usuario y contraseña');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   No se puede conectar a MySQL. Verifica que esté corriendo.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   La base de datos especificada no existe');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
