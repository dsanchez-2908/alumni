const mysql = require('mysql2/promise');

async function addFinalizadoEstado() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('🔧 Agregando estado "Finalizado" a TD_ESTADOS...\n');
    
    // Primero ver qué estados existen
    const [allEstados] = await connection.execute('SELECT * FROM TD_ESTADOS ORDER BY cdEstado');
    console.log('Estados actuales:');
    allEstados.forEach(estado => {
      console.log(`  ${estado.cdEstado}. ${estado.dsEstado} - ${estado.dsDescripcion}`);
    });
    
    // Verificar si ya existe el estado "Finalizado"
    const [exists] = await connection.execute(
      'SELECT cdEstado FROM TD_ESTADOS WHERE dsEstado = ?',
      ['Finalizado']
    );
    
    if (exists.length > 0) {
      console.log('\n⚠️  El estado "Finalizado" ya existe (cdEstado:', exists[0].cdEstado, ')');
    } else {
      // Insertar el estado con cdEstado 4 para evitar conflictos
      await connection.execute(
        "INSERT INTO TD_ESTADOS (dsEstado, dsDescripcion) VALUES ('Finalizado', 'Estado finalizado o completado')"
      );
      console.log('\n✅ Estado "Finalizado" agregado correctamente');
    }
    
    // Agregar columna feFinalizacion a tr_alumno_taller si no existe
    console.log('\n🔧 Verificando columna feFinalizacion en tr_alumno_taller...');
    
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM tr_alumno_taller LIKE 'feFinalizacion'"
    );
    
    if (columns.length > 0) {
      console.log('⚠️  La columna feFinalizacion ya existe');
    } else {
      await connection.execute(
        'ALTER TABLE tr_alumno_taller ADD COLUMN feFinalizacion TIMESTAMP NULL AFTER feBaja'
      );
      console.log('✅ Columna feFinalizacion agregada a tr_alumno_taller');
    }
    
    console.log('\n📋 Estados actuales:');
    const [estados] = await connection.execute('SELECT * FROM TD_ESTADOS ORDER BY cdEstado');
    estados.forEach(estado => {
      console.log(`  ${estado.cdEstado}. ${estado.dsEstado} - ${estado.dsDescripcion}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addFinalizadoEstado();
