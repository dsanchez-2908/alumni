// Script para ejecutar archivos SQL
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno de .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

async function ejecutarSQL(archivoSQL) {
  let connection;
  
  try {
    const env = loadEnv();
    
    // Crear conexión
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      port: env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✓ Conectado a la base de datos');

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', archivoSQL);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log(`\n📄 Ejecutando: ${archivoSQL}\n`);

    // Ejecutar SQL
    const [results] = await connection.query(sqlContent);

    // Mostrar resultados
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result && result.length > 0) {
          console.log(`\n--- Resultado ${index + 1} ---`);
          console.table(result);
        } else if (result && result.affectedRows !== undefined) {
          console.log(`\n--- Operación ${index + 1} ---`);
          console.log(`✓ Filas afectadas: ${result.affectedRows}`);
        }
      });
    }

    console.log('\n✓ Script ejecutado correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Obtener nombre del archivo desde los argumentos
const archivo = process.argv[2];
if (!archivo) {
  console.error('❌ Uso: node ejecutar-sql.js <nombre-archivo.sql>');
  process.exit(1);
}

ejecutarSQL(archivo);
