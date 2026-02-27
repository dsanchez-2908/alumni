const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (match) {
        env[match[1]] = match[2].trim();
      }
    });
  }
  
  return env;
}

const env = loadEnv();

async function extractDatabaseStructure() {
  console.log('🔍 Extrayendo estructura de la base de datos de desarrollo...\n');
  
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: env.DB_HOST || 'localhost',
      port: parseInt(env.DB_PORT || '3306'),
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || 'admin',
      database: env.DB_NAME || 'alumni',
    });
    
    console.log('✅ Conexión exitosa a MySQL\n');
    console.log('📊 Base de datos:', env.DB_NAME || 'alumni');
    console.log('=' .repeat(80) + '\n');
    
    // Obtener lista de tablas
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log(`📋 Total de tablas encontradas: ${tableNames.length}\n`);
    console.log('Tablas:', tableNames.join(', '));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Extraer estructura completa de cada tabla
    const completeStructure = {};
    
    for (const tableName of tableNames) {
      console.log(`\n🔹 Analizando tabla: ${tableName}`);
      console.log('-'.repeat(80));
      
      // Obtener CREATE TABLE statement
      const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSQL = createTableResult[0]['Create Table'];
      
      // Obtener descripción de columnas
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
      
      // Contar registros
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const recordCount = countResult[0].count;
      
      completeStructure[tableName] = {
        createSQL: createTableSQL,
        columns: columns,
        recordCount: recordCount
      };
      
      console.log(`📊 Columnas: ${columns.length}`);
      console.log(`📝 Registros: ${recordCount}`);
      
      // Mostrar columnas
      console.log('\nColumnas:');
      columns.forEach(col => {
        const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.Key ? `[${col.Key}]` : '';
        const defaultVal = col.Default !== null ? `DEFAULT ${col.Default}` : '';
        console.log(`  - ${col.Field}: ${col.Type} ${nullable} ${key} ${defaultVal}`.trim());
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📄 ESTRUCTURA COMPLETA EN SQL:\n');
    console.log('='.repeat(80) + '\n');
    
    // Generar SQL completo
    let fullSQL = `-- =============================================\n`;
    fullSQL += `-- ALUMSYS - Sistema de Gestión de Talleres de Arte\n`;
    fullSQL += `-- Base de Datos: alumni\n`;
    fullSQL += `-- Fecha: ${new Date().toISOString().split('T')[0]}\n`;
    fullSQL += `-- Generado automáticamente desde base de datos de desarrollo\n`;
    fullSQL += `-- =============================================\n\n`;
    fullSQL += `-- Crear la base de datos\n`;
    fullSQL += `CREATE DATABASE IF NOT EXISTS alumni;\n`;
    fullSQL += `USE alumni;\n\n`;
    
    // Ordenar tablas para mantener integridad referencial
    const orderedTables = [
      'td_parametros',
      'td_estados',
      'td_roles',
      'td_tipo_talleres',
      'td_personal',
      'tr_personal_tipo_taller',
      'td_usuarios',
      'tr_usuario_rol',
      'td_alumnos',
      'td_grupos_familiares',
      'tr_alumno_grupo_familiar',
      'td_talleres',
      'tr_alumno_taller',
      'td_asistencias',
      'td_notificaciones_faltas',
      'td_precios_talleres',
      'td_pagos',
      'td_pagos_detalle',
      'td_traza',
      'td_novedades_alumno'
    ];
    
    // Añadir tablas ordenadas
    for (const tableName of orderedTables) {
      if (completeStructure[tableName]) {
        fullSQL += `-- =============================================\n`;
        fullSQL += `-- TABLA: ${tableName.toUpperCase()}\n`;
        fullSQL += `-- Registros actuales: ${completeStructure[tableName].recordCount}\n`;
        fullSQL += `-- =============================================\n`;
        fullSQL += completeStructure[tableName].createSQL + ';\n\n';
      }
    }
    
    // Añadir tablas no listadas (si hay alguna adicional)
    for (const tableName of tableNames) {
      if (!orderedTables.includes(tableName.toLowerCase())) {
        console.log(`⚠️  Tabla adicional no esperada: ${tableName}`);
        fullSQL += `-- =============================================\n`;
        fullSQL += `-- TABLA ADICIONAL: ${tableName.toUpperCase()}\n`;
        fullSQL += `-- Registros actuales: ${completeStructure[tableName].recordCount}\n`;
        fullSQL += `-- =============================================\n`;
        fullSQL += completeStructure[tableName].createSQL + ';\n\n';
      }
    }
    
    // Guardar en archivo
    const outputPath = path.join(__dirname, '..', 'database', 'schema-extracted.sql');
    fs.writeFileSync(outputPath, fullSQL, 'utf8');
    
    console.log(`\n✅ Estructura completa guardada en: ${outputPath}\n`);
    
    // Comparación con schema.sql
    console.log('='.repeat(80));
    console.log('\n🔍 COMPARACIÓN CON schema.sql:\n');
    console.log('='.repeat(80) + '\n');
    
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Extraer nombres de tablas de schema.sql
      const schemaTableRegex = /CREATE TABLE\s+([`"]?)(\w+)\1\s*\(/gi;
      const schemaTables = [];
      let match;
      while ((match = schemaTableRegex.exec(schemaContent)) !== null) {
        schemaTables.push(match[2].toLowerCase());
      }
      
      console.log(`📄 Tablas en schema.sql: ${schemaTables.length}`);
      console.log(`💾 Tablas en base de datos: ${tableNames.length}\n`);
      
      // Tablas faltantes en schema.sql
      const missingInSchema = tableNames.filter(t => 
        !schemaTables.includes(t.toLowerCase())
      );
      
      // Tablas extra en schema.sql
      const extraInSchema = schemaTables.filter(t => 
        !tableNames.map(tn => tn.toLowerCase()).includes(t.toLowerCase())
      );
      
      if (missingInSchema.length > 0) {
        console.log('❌ Tablas que FALTAN en schema.sql:');
        missingInSchema.forEach(t => console.log(`   - ${t}`));
        console.log();
      }
      
      if (extraInSchema.length > 0) {
        console.log('⚠️  Tablas en schema.sql que NO están en la BD:');
        extraInSchema.forEach(t => console.log(`   - ${t}`));
        console.log();
      }
      
      if (missingInSchema.length === 0 && extraInSchema.length === 0) {
        console.log('✅ Todas las tablas coinciden!\n');
      }
      
      // Comparar columnas de tablas comunes
      console.log('📋 Verificando columnas de cada tabla:\n');
      for (const tableName of tableNames) {
        const tableNameLower = tableName.toLowerCase();
        if (schemaTables.includes(tableNameLower)) {
          // Extraer columnas de esta tabla en schema.sql
          const tableRegex = new RegExp(`CREATE TABLE\\s+[\`"]?${tableNameLower}[\`"]?\\s*\\((.*?)\\)\\s*ENGINE`, 'is');
          const tableMatch = schemaContent.match(tableRegex);
          
          if (tableMatch) {
            const tableDefinition = tableMatch[1];
            const columnRegex = /^\s*([a-z_]\w+)\s+/gmi;
            const schemaColumns = [];
            let colMatch;
            while ((colMatch = columnRegex.exec(tableDefinition)) !== null) {
              const colName = colMatch[1].toLowerCase();
              if (colName !== 'foreign' && colName !== 'primary' && 
                  colName !== 'unique' && colName !== 'key' && 
                  colName !== 'index' && colName !== 'constraint') {
                schemaColumns.push(colName);
              }
            }
            
            const dbColumns = completeStructure[tableName].columns.map(c => c.Field.toLowerCase());
            
            const missingCols = dbColumns.filter(c => !schemaColumns.includes(c));
            const extraCols = schemaColumns.filter(c => !dbColumns.includes(c));
            
            if (missingCols.length > 0 || extraCols.length > 0) {
              console.log(`🔸 ${tableName}:`);
              if (missingCols.length > 0) {
                console.log(`   ❌ Columnas FALTANTES en schema.sql: ${missingCols.join(', ')}`);
              }
              if (extraCols.length > 0) {
                console.log(`   ⚠️  Columnas EXTRA en schema.sql: ${extraCols.join(', ')}`);
              }
            }
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Análisis completado!\n');
    console.log(`📁 Archivo generado: database/schema-extracted.sql`);
    console.log(`   Este archivo contiene la estructura REAL de tu base de datos de desarrollo.\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar
extractDatabaseStructure();
