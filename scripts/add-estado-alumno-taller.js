const mysql = require('mysql2/promise');

async function addEstadoAlumnoTaller() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Iniciando migración de estados en tr_alumno_taller...\n');

    // 1. Agregar columna cdEstado
    console.log('1. Agregando columna cdEstado...');
    await connection.execute(`
      ALTER TABLE tr_alumno_taller
      ADD COLUMN cdEstado INT NOT NULL DEFAULT 1
      AFTER cdAlumno
    `);
    console.log('✓ Columna cdEstado agregada\n');

    // 2. Agregar foreign key
    console.log('2. Agregando foreign key a TD_ESTADOS...');
    await connection.execute(`
      ALTER TABLE tr_alumno_taller
      ADD CONSTRAINT fk_alumno_taller_estado
      FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
    `);
    console.log('✓ Foreign key agregada\n');

    // 3. Actualizar registros existentes según su estado actual
    console.log('3. Actualizando estados existentes...');
    
    // Primero, marcar como Finalizado (4) los que tienen feFinalizacion
    const [resultFinalizados] = await connection.execute(`
      UPDATE tr_alumno_taller
      SET cdEstado = 4
      WHERE feFinalizacion IS NOT NULL
    `);
    console.log(`✓ ${resultFinalizados.affectedRows} alumnos marcados como Finalizados (cdEstado=4)`);

    // Luego, marcar como Inactivo (2) los que tienen feBaja (pero no feFinalizacion)
    const [resultInactivos] = await connection.execute(`
      UPDATE tr_alumno_taller
      SET cdEstado = 2
      WHERE feBaja IS NOT NULL AND feFinalizacion IS NULL
    `);
    console.log(`✓ ${resultInactivos.affectedRows} alumnos marcados como Inactivos (cdEstado=2)`);

    // Los demás quedan como Activo (1) por el DEFAULT
    const [resultActivos] = await connection.execute(`
      SELECT COUNT(*) as total
      FROM tr_alumno_taller
      WHERE cdEstado = 1
    `);
    console.log(`✓ ${resultActivos[0].total} alumnos quedan como Activos (cdEstado=1)\n`);

    // 4. Mostrar resumen
    console.log('Resumen de estados en tr_alumno_taller:');
    const [estados] = await connection.execute(`
      SELECT 
        e.dsEstado,
        COUNT(*) as cantidad
      FROM tr_alumno_taller at
      INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
      GROUP BY e.dsEstado
      ORDER BY at.cdEstado
    `);
    estados.forEach(e => {
      console.log(`  - ${e.dsEstado}: ${e.cantidad} registros`);
    });

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addEstadoAlumnoTaller().catch(console.error);
