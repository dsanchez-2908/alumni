// Script para configurar datos de notificación de un alumno para testing
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function configurarNotificaciones() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Listar algunos alumnos
    console.log('\n📋 Alumnos en el sistema:');
    const [alumnos] = await connection.execute(`
      SELECT 
        cdAlumno,
        CONCAT(dsNombre, ' ', dsApellido) as nombreCompleto,
        dsDNI,
        dsMailNotificacion,
        dsWhatsappNotificacion
      FROM TD_ALUMNOS
      ORDER BY cdAlumno
      LIMIT 10
    `);

    console.table(alumnos);

    // Ejemplo: Actualizar el primer alumno con datos de prueba
    const cdAlumno = alumnos[0].cdAlumno;
    
    console.log(`\n✏️ Configurando notificaciones para alumno ID: ${cdAlumno}`);
    
    // IMPORTANTE: Reemplaza estos valores con datos reales para testing
    const emailNotificacion = 'tu-email@example.com'; // ⚠️ CAMBIAR ESTO
    const whatsappNotificacion = '1234567890'; // ⚠️ CAMBIAR ESTO (solo números, sin +54 ni espacios)

    await connection.execute(`
      UPDATE TD_ALUMNOS 
      SET 
        dsMailNotificacion = ?,
        dsWhatsappNotificacion = ?
      WHERE cdAlumno = ?
    `, [emailNotificacion, whatsappNotificacion, cdAlumno]);

    console.log('✅ Datos actualizados:');
    console.log(`   Email: ${emailNotificacion}`);
    console.log(`   WhatsApp: ${whatsappNotificacion}`);

    // Verificar
    const [result] = await connection.execute(`
      SELECT 
        cdAlumno,
        CONCAT(dsNombre, ' ', dsApellido) as nombreCompleto,
        dsMailNotificacion,
        dsWhatsappNotificacion
      FROM TD_ALUMNOS
      WHERE cdAlumno = ?
    `, [cdAlumno]);

    console.log('\n📊 Datos actualizados:');
    console.table(result);

    console.log('\n💡 Ahora puedes registrar un pago para este alumno y probar las notificaciones.');
    console.log('   1. Selecciona método "WhatsApp"');
    console.log('   2. Registra el pago');
    console.log('   3. Deberías ver el enlace de WhatsApp y la descarga del PDF');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

configurarNotificaciones();
