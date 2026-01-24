import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener detalle completo del alumno
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);

    // 1. Datos del alumno
    const [alumno] = await pool.execute<any[]>(
      `SELECT 
        a.*,
        e.dsEstado,
        TIMESTAMPDIFF(YEAR, a.feNacimiento, CURDATE()) as edad
      FROM TD_ALUMNOS a
      INNER JOIN TD_ESTADOS e ON a.cdEstado = e.cdEstado
      WHERE a.cdAlumno = ?`,
      [cdAlumno]
    );

    if (alumno.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const alumnoData = alumno[0];

    // 2. Grupo familiar (si tiene)
    let grupoFamiliar = null;
    let miembrosGrupo = [];
    
    if (alumnoData.cdGrupoFamiliar) {
      const [grupo] = await pool.execute<any[]>(
        `SELECT 
          gf.*,
          (SELECT COUNT(*) FROM TD_ALUMNOS WHERE cdGrupoFamiliar = gf.cdGrupoFamiliar AND cdEstado != 3) as cantidadMiembros
        FROM TD_GRUPOS_FAMILIARES gf
        WHERE gf.cdGrupoFamiliar = ?`,
        [alumnoData.cdGrupoFamiliar]
      );

      if (grupo.length > 0) {
        grupoFamiliar = grupo[0];

        // Otros miembros del grupo
        const [miembros] = await pool.execute<any[]>(
          `SELECT 
            cdAlumno,
            CONCAT(dsNombre, ' ', dsApellido) as dsNombreCompleto,
            dsDNI,
            TIMESTAMPDIFF(YEAR, feNacimiento, CURDATE()) as edad,
            e.dsEstado
          FROM TD_ALUMNOS a
          INNER JOIN TD_ESTADOS e ON a.cdEstado = e.cdEstado
          WHERE cdGrupoFamiliar = ? AND cdAlumno != ? AND a.cdEstado != 3
          ORDER BY dsApellido, dsNombre`,
          [alumnoData.cdGrupoFamiliar, cdAlumno]
        );
        miembrosGrupo = miembros;
      }
    }

    // 3. Talleres activos
    const [talleresActivos] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        p.dsNombreCompleto as nombreProfesor,
        at.feInscripcion,
        et.dsEstado as estadoEnTaller,
        at.cdEstado as cdEstadoEnTaller
      FROM tr_alumno_taller at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      INNER JOIN TD_ESTADOS et ON at.cdEstado = et.cdEstado
      WHERE at.cdAlumno = ? AND at.cdEstado = 1
      ORDER BY t.nuAnioTaller DESC, tt.dsNombreTaller`,
      [cdAlumno]
    );

    // 4. Talleres finalizados
    const [talleresFinalizados] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        p.dsNombreCompleto as nombreProfesor,
        at.feInscripcion,
        at.feFinalizacion,
        et.dsEstado as estadoEnTaller
      FROM tr_alumno_taller at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      INNER JOIN TD_ESTADOS et ON at.cdEstado = et.cdEstado
      WHERE at.cdAlumno = ? AND at.cdEstado = 4
      ORDER BY at.feFinalizacion DESC, t.nuAnioTaller DESC`,
      [cdAlumno]
    );

    // 5. Pagos realizados (detalle de cada item)
    const [pagosRealizados] = await pool.execute<any[]>(
      `SELECT 
        pd.cdPagoDetalle,
        p.cdPago,
        p.fePago,
        pd.nuMonto,
        pd.dsTipoPago,
        p.nuMes,
        p.nuAnio,
        p.dsObservacion,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as alumno,
        tt.dsNombreTaller,
        t.nuAnioTaller
      FROM TD_PAGOS_DETALLE pd
      INNER JOIN TD_PAGOS p ON pd.cdPago = p.cdPago
      INNER JOIN TD_ALUMNOS a ON pd.cdAlumno = a.cdAlumno
      LEFT JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
      LEFT JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE pd.cdAlumno = ?
      ORDER BY p.fePago DESC, p.cdPago DESC, pd.cdPagoDetalle DESC
      LIMIT 50`,
      [cdAlumno]
    );

    // 6. Pagos pendientes (talleres activos del alumno)
    const [pagosPendientes] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        tp.nuPrecioCompletoEfectivo as precioPorClase,
        at.feInscripcion,
        (
          SELECT COUNT(DISTINCT DATE(p.fePago))
          FROM TD_PAGOS p
          INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
          WHERE pd.cdAlumno = ?
          AND pd.cdTaller = t.cdTaller
        ) as mesesPagados,
        TIMESTAMPDIFF(MONTH, at.feInscripcion, CURDATE()) + 1 as mesesTranscurridos
      FROM tr_alumno_taller at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PRECIOS_TALLERES tp ON tt.cdTipoTaller = tp.cdTipoTaller 
        AND tp.feInicioVigencia <= CURDATE()
        AND tp.cdEstado = 1
      WHERE at.cdAlumno = ?
      AND at.cdEstado = 1
      AND t.cdEstado = 1
      GROUP BY t.cdTaller, tt.dsNombreTaller, t.nuAnioTaller, tp.nuPrecioCompletoEfectivo, at.feInscripcion
      HAVING mesesTranscurridos > mesesPagados
      ORDER BY tt.dsNombreTaller`,
      [cdAlumno, cdAlumno]
    );

    // 7. Asistencias (últimas 100) - ahora incluye presentes y ausentes
    const [faltas] = await pool.execute<any[]>(
      `SELECT 
        f.cdFalta,
        f.feFalta,
        f.snPresente,
        f.dsObservacion,
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller
      FROM td_asistencias f
      INNER JOIN TD_TALLERES t ON f.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE f.cdAlumno = ?
      ORDER BY f.feFalta DESC
      LIMIT 100`,
      [cdAlumno]
    );

    // Retornar todo
    return NextResponse.json({
      alumno: alumnoData,
      grupoFamiliar,
      miembrosGrupo,
      talleresActivos,
      talleresFinalizados,
      pagosRealizados,
      pagosPendientes,
      faltas,
      resumen: {
        totalTalleresActivos: talleresActivos.length,
        totalTalleresFinalizados: talleresFinalizados.length,
        totalPagosRealizados: pagosRealizados.length,
        montoPagadoTotal: pagosRealizados.reduce((sum: number, p: any) => sum + parseFloat(p.nuMonto || 0), 0),
        totalPagosPendientes: pagosPendientes.length,
        montoPendienteTotal: pagosPendientes.reduce((sum: number, p: any) => {
          const mesesDebe = p.mesesTranscurridos - p.mesesPagados;
          return sum + (mesesDebe * p.precioPorClase);
        }, 0),
        totalFaltas: faltas.filter((f: any) => f.snPresente === 0).length,
        totalAsistencias: faltas.filter((f: any) => f.snPresente === 1).length,
      }
    });

  } catch (error: any) {
    console.error('Error al obtener detalle del alumno:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalle del alumno', details: error.message },
      { status: 500 }
    );
  }
}
