/**
 * Script rápido para agregar el estado "Incompleto"
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
  }
  
  return env;
}

async function addEstadoIncompleto() {
  let connection;
  
  try {
    const env = loadEnv();
    
    connection = await mysql.createConnection({
      host: env.DB_HOST || 'localhost',
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'alumni',
      port: parseInt(env.DB_PORT || '3306'),
    });

    console.log('✅ Conectado a la base de datos\n');

    // 1. Insertar estado Incompleto
    console.log('Insertando estado "Incompleto"...');
    await connection.execute(`
      INSERT INTO TD_ESTADOS (cdEstado, dsEstado, dsDescripcion) 
      SELECT 5, 'Incompleto', 'Alumno dado de baja antes de finalizar el taller'
      WHERE NOT EXISTS (SELECT 1 FROM TD_ESTADOS WHERE cdEstado = 5)
    `);
    console.log('✅ Estado "Incompleto" agregado\n');

    // 2. Actualizar registros existentes
    console.log('Actualizando registros existentes...');
    const [result] = await connection.execute(`
      UPDATE TR_ALUMNO_TALLER 
      SET cdEstado = 5 
      WHERE cdEstado = 2 
        AND feBaja IS NOT NULL 
        AND feFinalizacion IS NULL
    `);
    console.log(`✅ ${result.affectedRows} registros actualizados\n`);

    // 3. Verificar
    const [estados] = await connection.execute('SELECT * FROM TD_ESTADOS ORDER BY cdEstado');
    console.log('Estados disponibles:');
    estados.forEach(e => {
      console.log(`  ${e.cdEstado} - ${e.dsEstado}: ${e.dsDescripcion}`);
    });

    console.log('\n✨ ¡Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addEstadoIncompleto();
