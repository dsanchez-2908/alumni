/**
 * Script para agregar los campos DNI, CUIL, Entidad, CBU/CVU y Observaciones 
 * a la tabla TD_PERSONAL
 */

const mysql = require('mysql2/promise');

async function addPersonalFields() {
  let connection;
  
  try {
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'admin',
      database: 'alumni',
      port: 3306,
    });

    console.log('Conexión exitosa a la base de datos');

    // Verificar si las columnas ya existen
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'alumni' AND TABLE_NAME = 'TD_PERSONAL'`
    );

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('Columnas existentes:', existingColumns);

    // Agregar columnas si no existen
    const newColumns = [
      { name: 'dsDni', sql: 'ADD COLUMN dsDni VARCHAR(20)' },
      { name: 'dsCuil', sql: 'ADD COLUMN dsCuil VARCHAR(20)' },
      { name: 'dsEntidad', sql: 'ADD COLUMN dsEntidad VARCHAR(255)' },
      { name: 'dsCbuCvu', sql: 'ADD COLUMN dsCbuCvu VARCHAR(50)' },
      { name: 'dsObservaciones', sql: 'ADD COLUMN dsObservaciones TEXT' }
    ];

    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Agregando columna ${column.name}...`);
        await connection.execute(`ALTER TABLE TD_PERSONAL ${column.sql}`);
        console.log(`✓ Columna ${column.name} agregada exitosamente`);
      } else {
        console.log(`⚠ La columna ${column.name} ya existe, omitiendo...`);
      }
    }

    console.log('\n✓ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addPersonalFields();
