import bcrypt from 'bcryptjs';
import pool from '../lib/db';
import { executeUpdate, insert } from '../lib/db-utils';

/**
 * Script para inicializar la base de datos con el usuario admin
 * Usuario: admin
 * Contraseña: 123
 */
async function initializeDatabase() {
  try {
    console.log('🔧 Iniciando configuración de base de datos...');

    // Verificar conexión
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida');
    connection.release();

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash('123', 10);
    console.log('🔐 Contraseña encriptada');

    // Verificar si ya existe el usuario admin
    const [existingUsers]: any = await pool.execute(
      'SELECT cdUsuario FROM TD_USUARIOS WHERE dsUsuario = ?',
      ['admin']
    );

    if (existingUsers.length > 0) {
      console.log('⚠️  El usuario admin ya existe');
      
      // Actualizar contraseña si es necesario
      await pool.execute(
        'UPDATE TD_USUARIOS SET dsClave = ? WHERE dsUsuario = ?',
        [hashedPassword, 'admin']
      );
      console.log('✅ Contraseña del usuario admin actualizada');
    } else {
      // Insertar usuario admin
      const [result]: any = await pool.execute(
        `INSERT INTO TD_USUARIOS 
        (dsNombreCompleto, dsUsuario, dsClave, cdEstado) 
        VALUES (?, ?, ?, ?)`,
        ['Administrador', 'admin', hashedPassword, 1]
      );

      const adminUserId = result.insertId;
      console.log(`✅ Usuario admin creado con ID: ${adminUserId}`);

      // Asignar rol de Administrador (cdRol = 1)
      await pool.execute(
        'INSERT INTO TR_USUARIO_ROL (cdUsuario, cdRol) VALUES (?, ?)',
        [adminUserId, 1]
      );
      console.log('✅ Rol de Administrador asignado');
    }

    console.log('\n🎉 Base de datos inicializada correctamente');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: 123');
    console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña en producción\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

export default initializeDatabase;
