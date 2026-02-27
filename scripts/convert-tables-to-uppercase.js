const fs = require('fs');
const path = require('path');

// Lista de nombres de tablas a convertir a mayúsculas
const tableNames = [
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
  'tr_inscripcion_alumno',
  'td_asistencias',
  'td_notificaciones_faltas',
  'td_precios_talleres',
  'td_precios',
  'td_pagos',
  'td_pagos_detalle',
  'td_traza',
  'td_novedades_alumno'
];

function convertToUpperCase(content) {
  let result = content;
  
  // Convertir cada nombre de tabla a mayúsculas
  tableNames.forEach(tableName => {
    const upperTableName = tableName.toUpperCase();
    
    // Reemplazar en CREATE TABLE `tabla`
    result = result.replace(
      new RegExp('CREATE TABLE `' + tableName + '`', 'gi'),
      'CREATE TABLE `' + upperTableName + '`'
    );
    
    // Reemplazar en REFERENCES `tabla`
    result = result.replace(
      new RegExp('REFERENCES `' + tableName + '`', 'gi'),
      'REFERENCES `' + upperTableName + '`'
    );
    
    // Reemplazar en INSERT INTO `tabla`
    result = result.replace(
      new RegExp('INSERT INTO `' + tableName + '`', 'gi'),
      'INSERT INTO `' + upperTableName + '`'
    );
    
    // Reemplazar en ALTER TABLE `tabla`
    result = result.replace(
      new RegExp('ALTER TABLE `' + tableName + '`', 'gi'),
      'ALTER TABLE `' + upperTableName + '`'
    );
    
    // Reemplazar en CREATE TABLE IF NOT EXISTS `tabla`
    result = result.replace(
      new RegExp('CREATE TABLE IF NOT EXISTS `' + tableName + '`', 'gi'),
      'CREATE TABLE IF NOT EXISTS `' + upperTableName + '`'
    );
  });
  
  return result;
}

// Archivos a procesar
const filesToProcess = [
  'database/schema-corrected.sql',
  'database/migration-to-corrected-schema.sql',
  'database/schema-extracted.sql'
];

console.log('🔄 Convirtiendo nombres de tabla a MAYÚSCULAS...\n');

filesToProcess.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }
  
  console.log(`📄 Procesando: ${filePath}`);
  
  // Leer archivo
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Convertir a mayúsculas
  const convertedContent = convertToUpperCase(content);
  
  // Guardar archivo
  fs.writeFileSync(fullPath, convertedContent, 'utf8');
  
  console.log(`✅ Completado: ${filePath}\n`);
});

console.log('✅ Conversión completada!');
console.log('\nArchivos actualizados con nombres de tabla en MAYÚSCULAS:');
filesToProcess.forEach(f => console.log(`  - ${f}`));
