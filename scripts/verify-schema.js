const mysql = require('mysql2/promise');

async function verifySchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('=== Verificando estructura de TD_ALUMNOS ===');
    const [alumnosColumns] = await connection.query('DESCRIBE TD_ALUMNOS');
    console.log('Columnas en TD_ALUMNOS:');
    alumnosColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    const hasCdGrupoFamiliar = alumnosColumns.some(col => col.Field === 'cdGrupoFamiliar');
    console.log(`\n¿Tiene cdGrupoFamiliar? ${hasCdGrupoFamiliar ? 'SÍ (DEBE SER ELIMINADO)' : 'NO (CORRECTO)'}`);

    console.log('\n=== Verificando estructura de TD_PAGOS ===');
    const [pagosColumns] = await connection.query('DESCRIBE TD_PAGOS');
    console.log('Columnas en TD_PAGOS:');
    pagosColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    const hasNumonto = pagosColumns.some(col => col.Field === 'nuMonto');
    const hasNumontoTotal = pagosColumns.some(col => col.Field === 'nuMontoTotal');
    console.log(`\n¿Tiene nuMonto? ${hasNumonto ? 'SÍ' : 'NO'}`);
    console.log(`¿Tiene nuMontoTotal? ${hasNumontoTotal ? 'SÍ' : 'NO'}`);

    console.log('\n=== Verificando TR_ALUMNO_GRUPO_FAMILIAR ===');
    const [junctionTables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'alumni' AND TABLE_NAME = 'TR_ALUMNO_GRUPO_FAMILIAR'"
    );
    console.log(`Existe TR_ALUMNO_GRUPO_FAMILIAR: ${junctionTables.length > 0 ? 'SÍ' : 'NO'}`);
    
    if (junctionTables.length > 0) {
      const [junctionColumns] = await connection.query('DESCRIBE TR_ALUMNO_GRUPO_FAMILIAR');
      console.log('Columnas en TR_ALUMNO_GRUPO_FAMILIAR:');
      junctionColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    }

    console.log('\n=== Verificando estructura de TD_TALLERES ===');
    const [talleresColumns] = await connection.query('DESCRIBE TD_TALLERES');
    console.log('Columnas en TD_TALLERES:');
    talleresColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    const hasCdEstado = talleresColumns.some(col => col.Field === 'cdEstado');
    console.log(`\n¿Tiene cdEstado? ${hasCdEstado ? 'SÍ (CORRECTO)' : 'NO (DEBE SER AGREGADO)'}`);

    console.log('\n=== RESUMEN ===');
    console.log('Para corregir el esquema, ejecutar:');
    if (hasCdGrupoFamiliar) {
      console.log('1. ALTER TABLE TD_ALUMNOS DROP COLUMN cdGrupoFamiliar;');
    }
    if (!hasNumontoTotal && hasNumonto) {
      console.log('2. ALTER TABLE TD_PAGOS CHANGE nuMonto nuMontoTotal DECIMAL(10,2) NOT NULL;');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

verifySchema();
