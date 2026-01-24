const mysql = require('mysql2/promise');

async function modificarTablaFaltas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Iniciando modificación de tabla TD_FALTAS...\n');

    // 1. Agregar columna snPresente (0 = Ausente, 1 = Presente)
    console.log('1. Agregando columna snPresente...');
    await connection.execute(`
      ALTER TABLE TD_FALTAS
      ADD COLUMN snPresente TINYINT(1) NOT NULL DEFAULT 0
      AFTER feFalta
    `);
    console.log('✓ Columna snPresente agregada (0 = Ausente, 1 = Presente)\n');

    // 2. Actualizar registros existentes - todos son ausencias
    console.log('2. Actualizando registros existentes...');
    const [result] = await connection.execute(`
      UPDATE TD_FALTAS
      SET snPresente = 0
    `);
    console.log(`✓ ${result.affectedRows} registros actualizados como ausencias (snPresente = 0)\n`);

    // 3. Cambiar nombre de la tabla (opcional pero más claro)
    console.log('3. Renombrando tabla TD_FALTAS a TD_ASISTENCIAS...');
    await connection.execute(`
      RENAME TABLE TD_FALTAS TO TD_ASISTENCIAS
    `);
    console.log('✓ Tabla renombrada a TD_ASISTENCIAS\n');

    // 4. Mostrar resumen
    console.log('Resumen de la nueva estructura:');
    const [estructura] = await connection.execute(`
      DESCRIBE TD_ASISTENCIAS
    `);
    console.table(estructura);

    console.log('\n✅ Modificación completada exitosamente');
    console.log('\nNOTA: Ahora la tabla TD_ASISTENCIAS puede registrar tanto presencias (snPresente=1) como ausencias (snPresente=0)');
    console.log('Será necesario actualizar los endpoints API para usar el nuevo nombre de tabla y columna.');

  } catch (error) {
    console.error('❌ Error durante la modificación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

modificarTablaFaltas().catch(console.error);
