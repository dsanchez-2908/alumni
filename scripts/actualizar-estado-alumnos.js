/**
 * Script para actualizar el estado de todos los alumnos existentes
 * basándose en si tienen talleres activos o no
 * 
 * Uso: node scripts/actualizar-estado-alumnos.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function actualizarEstadoAlumnos() {
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

    console.log('✅ Conectado a la base de datos');

    // Paso 1: Obtener todos los alumnos
    const [alumnos] = await connection.execute(
      'SELECT cdAlumno, dsNombre, dsApellido, cdEstado FROM TD_ALUMNOS WHERE cdEstado IN (1, 2)'
    );

    console.log(`\n📊 Total de alumnos a procesar: ${alumnos.length}`);

    let actualizados = 0;
    let yaCorrectos = 0;
    let errores = 0;

    // Paso 2: Para cada alumno, verificar si tiene talleres activos
    for (const alumno of alumnos) {
      try {
        // Verificar si el alumno tiene talleres activos
        const [talleres] = await connection.execute(
          `SELECT COUNT(*) as count
           FROM TR_ALUMNO_TALLER at
           INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
           WHERE at.cdAlumno = ?
             AND at.cdEstado = 1
             AND at.feBaja IS NULL
             AND t.cdEstado = 1`,
          [alumno.cdAlumno]
        );

        const tieneTalleresActivos = talleres[0].count > 0;
        const nuevoEstado = tieneTalleresActivos ? 1 : 2;

        // Si el estado es diferente, actualizar
        if (alumno.cdEstado !== nuevoEstado) {
          await connection.execute(
            'UPDATE TD_ALUMNOS SET cdEstado = ?, feModificacion = NOW() WHERE cdAlumno = ?',
            [nuevoEstado, alumno.cdAlumno]
          );

          const estadoAnterior = alumno.cdEstado === 1 ? 'Activo' : 'Inactivo';
          const estadoNuevo = nuevoEstado === 1 ? 'Activo' : 'Inactivo';
          
          console.log(
            `   ${alumno.dsNombre} ${alumno.dsApellido} - ${estadoAnterior} → ${estadoNuevo}`
          );
          actualizados++;
        } else {
          yaCorrectos++;
        }
      } catch (error) {
        console.error(`   ❌ Error al procesar alumno ${alumno.cdAlumno}:`, error.message);
        errores++;
      }
    }

    // Paso 3: Mostrar resumen
    console.log('\n=================================================');
    console.log('📈 RESUMEN DE ACTUALIZACIÓN');
    console.log('=================================================');
    console.log(`   Total procesados:      ${alumnos.length}`);
    console.log(`   ✅ Actualizados:        ${actualizados}`);
    console.log(`   ✓  Ya correctos:        ${yaCorrectos}`);
    console.log(`   ❌ Errores:             ${errores}`);
    console.log('=================================================\n');

    // Paso 4: Mostrar estadísticas finales
    const [estadisticas] = await connection.execute(`
      SELECT 
        CASE 
          WHEN cdEstado = 1 THEN 'Activos'
          WHEN cdEstado = 2 THEN 'Inactivos'
          ELSE 'Otros'
        END as estado,
        COUNT(*) as cantidad
      FROM TD_ALUMNOS
      WHERE cdEstado IN (1, 2)
      GROUP BY cdEstado
    `);

    console.log('📊 ESTADO ACTUAL DE ALUMNOS:');
    console.log('=================================================');
    estadisticas.forEach(stat => {
      console.log(`   ${stat.estado}: ${stat.cantidad}`);
    });
    console.log('=================================================\n');

    // Paso 5: Verificar inconsistencias (alumnos inactivos con talleres activos)
    const [inconsistencias] = await connection.execute(`
      SELECT 
        a.cdAlumno,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreCompleto,
        COUNT(DISTINCT at.cdTaller) as cantidadTalleresActivos
      FROM TD_ALUMNOS a
      INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno 
        AND at.cdEstado = 1 
        AND at.feBaja IS NULL
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller AND t.cdEstado = 1
      WHERE a.cdEstado = 2
      GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido
    `);

    if (inconsistencias.length > 0) {
      console.log('⚠️  ADVERTENCIA: Se encontraron inconsistencias:');
      console.log('=================================================');
      inconsistencias.forEach(inc => {
        console.log(`   ${inc.nombreCompleto} (ID: ${inc.cdAlumno}) - ${inc.cantidadTalleresActivos} talleres activos pero marcado como Inactivo`);
      });
      console.log('=================================================\n');
    } else {
      console.log('✅ No se encontraron inconsistencias\n');
    }

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
actualizarEstadoAlumnos();
