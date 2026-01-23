const mysql = require('mysql2/promise');

async function addContactosFields() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('🔧 Agregando campos de contactos a TD_ALUMNOS...\n');

    // Verificar campos existentes
    const [columns] = await connection.query('DESCRIBE TD_ALUMNOS');
    const columnNames = columns.map(col => col.Field);

    console.log('Campos actuales:', columnNames.filter(c => c.includes('Contacto') || c.includes('parentesco')));

    // Eliminar TODOS los campos viejos si existen
    const oldFields = [
      'dsTelefonoContacto1', 'dsParentesco1', 
      'dsTelefonoContacto2', 'dsParentesco2',
      'dsNombreCompletoContacto1', 'dsParentescoContacto1', 'dsDNIContacto1', 'dsMailContacto1',
      'dsNombreCompletoContacto2', 'dsParentescoContacto2', 'dsDNIContacto2', 'dsMailContacto2'
    ];
    
    for (const field of oldFields) {
      if (columnNames.includes(field)) {
        try {
          await connection.query(`ALTER TABLE TD_ALUMNOS DROP COLUMN ${field}`);
          console.log(`  ✓ Campo ${field} eliminado`);
        } catch (e) {
          console.log(`  ⚠ No se pudo eliminar ${field}: ${e.message}`);
        }
      }
    }

    // Refrescar lista de columnas
    const [columnsAfterDrop] = await connection.query('DESCRIBE TD_ALUMNOS');
    const columnNamesAfterDrop = columnsAfterDrop.map(col => col.Field);

    // Agregar TODOS los campos nuevos
    const fieldsToAdd = [
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsNombreCompletoContacto1 VARCHAR(255) NULL AFTER dsTelefonoFijo',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsParentescoContacto1 VARCHAR(100) NULL AFTER dsNombreCompletoContacto1',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsDNIContacto1 VARCHAR(20) NULL AFTER dsParentescoContacto1',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsTelefonoContacto1 VARCHAR(50) NULL AFTER dsDNIContacto1',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsMailContacto1 VARCHAR(100) NULL AFTER dsTelefonoContacto1',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsNombreCompletoContacto2 VARCHAR(255) NULL AFTER dsMailContacto1',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsParentescoContacto2 VARCHAR(100) NULL AFTER dsNombreCompletoContacto2',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsDNIContacto2 VARCHAR(20) NULL AFTER dsParentescoContacto2',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsTelefonoContacto2 VARCHAR(50) NULL AFTER dsDNIContacto2',
      'ALTER TABLE TD_ALUMNOS ADD COLUMN dsMailContacto2 VARCHAR(100) NULL AFTER dsTelefonoContacto2'
    ];

    for (const sql of fieldsToAdd) {
      try {
        await connection.query(sql);
        const fieldName = sql.match(/ADD COLUMN (\w+)/)[1];
        console.log(`  ✓ ${fieldName} agregado`);
      } catch (e) {
        console.log(`  ⚠ Error al agregar campo: ${e.message}`);
      }
    }

    console.log('\n✅ Campos actualizados correctamente!\n');

    // Mostrar estructura actualizada
    const [newColumns] = await connection.query('DESCRIBE TD_ALUMNOS');
    console.log('Estructura actualizada de TD_ALUMNOS:');
    newColumns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addContactosFields();
