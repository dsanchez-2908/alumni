const mysql = require('mysql2/promise');

async function addAlumnoFields() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Agregando nuevos campos a TD_ALUMNOS...\n');

    // 1. Nombre a llamar (después de dsSexo)
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsNombreLlamar VARCHAR(100) NULL
        AFTER dsSexo
      `);
      console.log('✓ dsNombreLlamar agregado');
    } catch (e) {
      console.log('⚠ dsNombreLlamar ya existe');
    }

    // 2. Discapacidad (ENUM SI/NO, por defecto NO)
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN snDiscapacidad ENUM('SI', 'NO') NOT NULL DEFAULT 'NO'
        AFTER dsNombreLlamar
      `);
      console.log('✓ snDiscapacidad agregado');
    } catch (e) {
      console.log('⚠ snDiscapacidad ya existe');
    }

    // 3. Observaciones de Discapacidad
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsObservacionesDiscapacidad TEXT NULL
        AFTER snDiscapacidad
      `);
      console.log('✓ dsObservacionesDiscapacidad agregado');
    } catch (e) {
      console.log('⚠ dsObservacionesDiscapacidad ya existe');
    }

    // 4. Observaciones generales
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsObservaciones TEXT NULL
        AFTER dsObservacionesDiscapacidad
      `);
      console.log('✓ dsObservaciones agregado');
    } catch (e) {
      console.log('⚠ dsObservaciones ya existe');
    }

    console.log('\n✅ Campos agregados exitosamente!\n');

    // Mostrar estructura actualizada
    const [columns] = await connection.query('DESCRIBE TD_ALUMNOS');
    console.log('Estructura actualizada de TD_ALUMNOS:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(35)} ${col.Type.padEnd(25)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addAlumnoFields().catch(console.error);
