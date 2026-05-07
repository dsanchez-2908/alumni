/**
 * Script para actualizar alumnos dados de baja a estado "Incompleto"
 * 
 * Uso: node scripts/actualizar-talleres-incompletos.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function actualizarTalleresIncompletos() {
  let connection;

  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    });

    console.log('✅ Conectado a la base de datos\n');

    // Paso 1: Verificar si el estado "Incompleto" existe
    const [estadoExists] = await connection.execute(
      "SELECT cdEstado FROM TD_ESTADOS WHERE dsEstado = 'Incompleto'"
    );

    if (estadoExists.length === 0) {
      console.log('⚠️  El estado "Incompleto" no existe. Creándolo...');
      await connection.execute(
        "INSERT INTO TD_ESTADOS (cdEstado, dsEstado, dsDescripcion) VALUES (5, 'Incompleto', 'Alumno dado de baja antes de finalizar el taller')"
      );
      console.log('✅ Estado "Incompleto" creado\n');
    } else {
      console.log('✅ Estado "Incompleto" ya existe\n');
    }

    // Paso 2: Obtener todos los registros de TR_ALUMNO_TALLER que fueron dados de baja
    // (tienen feBaja pero no son Finalizados)
    const [registros] = await connection.execute(
      `SELECT 
        at.id,
        at.cdAlumno,
        at.cdTaller,
        at.cdEstado,
        at.feBaja,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        e.dsEstado as estadoActual
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
      WHERE at.feBaja IS NOT NULL 
        AND at.feFinalizacion IS NULL
        AND at.cdEstado != 5
      ORDER BY at.feBaja DESC`
    );

    console.log(`📊 Total de registros a actualizar: ${registros.length}\n`);

    if (registros.length === 0) {
      console.log('✅ No hay registros para actualizar\n');
      return;
    }

    let actualizados = 0;
    let errores = 0;

    // Paso 3: Actualizar cada registro a estado "Incompleto"
    for (const registro of registros) {
      try {
        await connection.execute(
          'UPDATE TR_ALUMNO_TALLER SET cdEstado = 5 WHERE id = ?',
          [registro.id]
        );

        console.log(
          `   ${registro.nombreAlumno} - ${registro.dsNombreTaller} ${registro.nuAnioTaller} | ${registro.estadoActual} → Incompleto`
        );
        actualizados++;
      } catch (error) {
        console.error(`   ❌ Error al actualizar registro ${registro.id}:`, error.message);
        errores++;
      }
    }

    console.log('\n=================================================');
    console.log('📈 RESUMEN DE ACTUALIZACIÓN');
    console.log('=================================================');
    console.log(`   Total procesados:      ${registros.length}`);
    console.log(`   ✅ Actualizados:        ${actualizados}`);
    console.log(`   ❌ Errores:             ${errores}`);
    console.log('=================================================\n');

    // Paso 4: Mostrar estadísticas de estados en TR_ALUMNO_TALLER
    const [estadisticas] = await connection.execute(`
      SELECT 
        e.dsEstado,
        COUNT(*) as cantidad
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
      GROUP BY e.dsEstado, e.cdEstado
      ORDER BY e.cdEstado
    `);

    console.log('📊 ESTADO ACTUAL DE TR_ALUMNO_TALLER:');
    console.log('=================================================');
    estadisticas.forEach(stat => {
      console.log(`   ${stat.dsEstado}: ${stat.cantidad}`);
    });
    console.log('=================================================\n');

    // Paso 5: Verificar alumnos que quedaron inactivos
    console.log('🔍 Verificando alumnos que deberían estar inactivos...\n');

    const [alumnosAfectados] = await connection.execute(`
      SELECT DISTINCT
        a.cdAlumno,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreCompleto,
        a.cdEstado,
        ea.dsEstado as estadoAlumno,
        (
          SELECT COUNT(*) 
          FROM TR_ALUMNO_TALLER at2 
          INNER JOIN TD_TALLERES t2 ON at2.cdTaller = t2.cdTaller
          WHERE at2.cdAlumno = a.cdAlumno 
            AND at2.cdEstado = 1 
            AND at2.feBaja IS NULL
            AND t2.cdEstado = 1
        ) as talleresActivos
      FROM TD_ALUMNOS a
      INNER JOIN TD_ESTADOS ea ON a.cdEstado = ea.cdEstado
      WHERE a.cdAlumno IN (
        SELECT DISTINCT cdAlumno 
        FROM TR_ALUMNO_TALLER 
        WHERE cdEstado = 5
      )
      ORDER BY a.dsApellido, a.dsNombre
    `);

    console.log(`   Total de alumnos afectados: ${alumnosAfectados.length}`);

    let alumnosAInactivar = 0;
    for (const alumno of alumnosAfectados) {
      if (alumno.talleresActivos === 0 && alumno.cdEstado === 1) {
        console.log(`   ⚠️  ${alumno.nombreCompleto} - Activo pero sin talleres activos`);
        
        // Actualizar a Inactivo
        await connection.execute(
          'UPDATE TD_ALUMNOS SET cdEstado = 2, feModificacion = NOW() WHERE cdAlumno = ?',
          [alumno.cdAlumno]
        );
        alumnosAInactivar++;
      }
    }

    if (alumnosAInactivar > 0) {
      console.log(`\n   ✅ ${alumnosAInactivar} alumnos actualizados a estado Inactivo`);
    } else {
      console.log(`\n   ✅ Todos los estados de alumnos son consistentes`);
    }

    console.log('\n=================================================');
    console.log('📋 VERIFICACIONES FINALES');
    console.log('=================================================');

    // Verificar inconsistencias
    const [inconsistencias] = await connection.execute(`
      SELECT 
        at.id,
        a.cdAlumno,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as alumno,
        tt.dsNombreTaller,
        at.feBaja,
        e.dsEstado
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
      WHERE at.feBaja IS NOT NULL 
        AND at.cdEstado NOT IN (4, 5)
    `);

    if (inconsistencias.length > 0) {
      console.log(`   ⚠️  Se encontraron ${inconsistencias.length} inconsistencias:`);
      inconsistencias.forEach(inc => {
        console.log(`   - ${inc.alumno} en ${inc.dsNombreTaller} con estado ${inc.dsEstado}`);
      });
    } else {
      console.log('   ✅ No se encontraron inconsistencias');
    }

    console.log('=================================================\n');
    console.log('✨ Script completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar el script
actualizarTalleresIncompletos();
