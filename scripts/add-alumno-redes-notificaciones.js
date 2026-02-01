const mysql = require('mysql2/promise');

async function addAlumnoRedesNotificaciones() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Agregando campos de redes sociales y notificaciones a TD_ALUMNOS...\n');

    // 1. Instagram (después de dsMail)
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsInstagram VARCHAR(100) NULL
        AFTER dsMail
      `);
      console.log('✓ dsInstagram agregado');
    } catch (e) {
      console.log('⚠ dsInstagram ya existe');
    }

    // 2. Facebook
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsFacebook VARCHAR(100) NULL
        AFTER dsInstagram
      `);
      console.log('✓ dsFacebook agregado');
    } catch (e) {
      console.log('⚠ dsFacebook ya existe');
    }

    // 3. Mail Notificación
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsMailNotificacion VARCHAR(100) NULL
        AFTER dsFacebook
      `);
      console.log('✓ dsMailNotificacion agregado');
    } catch (e) {
      console.log('⚠ dsMailNotificacion ya existe');
    }

    // 4. Whatsapp Notificación
    try {
      await connection.execute(`
        ALTER TABLE TD_ALUMNOS
        ADD COLUMN dsWhatsappNotificacion VARCHAR(50) NULL
        AFTER dsMailNotificacion
      `);
      console.log('✓ dsWhatsappNotificacion agregado');
    } catch (e) {
      console.log('⚠ dsWhatsappNotificacion ya existe');
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

addAlumnoRedesNotificaciones().catch(console.error);
