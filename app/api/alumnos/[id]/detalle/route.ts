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

    // 2. Grupo familiar (si tiene) - usando TR_ALUMNO_GRUPO_FAMILIAR
    let grupoFamiliar = null;
    let miembrosGrupo = [];
    
    const [grupoRelacion] = await pool.execute<any[]>(
      `SELECT cdGrupoFamiliar FROM TR_ALUMNO_GRUPO_FAMILIAR WHERE cdAlumno = ?`,
      [cdAlumno]
    );

    if (grupoRelacion.length > 0) {
      const cdGrupoFamiliar = grupoRelacion[0].cdGrupoFamiliar;
      
      const [grupo] = await pool.execute<any[]>(
        `SELECT 
          gf.*,
          (SELECT COUNT(*) FROM TR_ALUMNO_GRUPO_FAMILIAR WHERE cdGrupoFamiliar = gf.cdGrupoFamiliar) as cantidadMiembros
        FROM TD_GRUPOS_FAMILIARES gf
        WHERE gf.cdGrupoFamiliar = ?`,
        [cdGrupoFamiliar]
      );

      if (grupo.length > 0) {
        grupoFamiliar = grupo[0];

        // Todos los miembros del grupo (incluyendo el actual)
        const [miembros] = await pool.execute<any[]>(
          `SELECT 
            a.cdAlumno,
            CONCAT(a.dsNombre, ' ', a.dsApellido) as dsNombreCompleto,
            a.dsDNI,
            TIMESTAMPDIFF(YEAR, a.feNacimiento, CURDATE()) as edad,
            e.dsEstado
          FROM TR_ALUMNO_GRUPO_FAMILIAR agf
          INNER JOIN TD_ALUMNOS a ON agf.cdAlumno = a.cdAlumno
          INNER JOIN TD_ESTADOS e ON a.cdEstado = e.cdEstado
          WHERE agf.cdGrupoFamiliar = ? AND a.cdEstado != 3
          ORDER BY a.dsApellido, a.dsNombre`,
          [cdGrupoFamiliar]
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

    // 6. Pagos pendientes detallados por mes (del alumno y su grupo familiar)
    // Primero obtenemos los talleres activos y generamos los meses esperados
    const [inscripciones] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        (
          SELECT tp.nuPrecioCompletoEfectivo 
          FROM TD_PRECIOS_TALLERES tp
          WHERE tp.cdTipoTaller = tt.cdTipoTaller
          AND tp.feInicioVigencia <= CURDATE()
          AND tp.cdEstado = 1
          ORDER BY tp.feInicioVigencia DESC
          LIMIT 1
        ) as precio,
        MIN(at.feInscripcion) as feInscripcion
      FROM tr_alumno_taller at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON a.cdAlumno = agf.cdAlumno
      WHERE (
        a.cdAlumno = ? 
        OR agf.cdGrupoFamiliar = (
          SELECT cdGrupoFamiliar 
          FROM TR_ALUMNO_GRUPO_FAMILIAR 
          WHERE cdAlumno = ?
        )
      )
      AND at.cdEstado = 1
      AND t.cdEstado = 1
      AND a.cdEstado != 3
      GROUP BY a.cdAlumno, t.cdTaller, tt.cdTipoTaller, tt.dsNombreTaller, t.nuAnioTaller`,
      [cdAlumno, cdAlumno]
    );

    // Obtener todos los pagos ya realizados
    const [pagosRealizadosDetalle] = await pool.execute<any[]>(
      `SELECT 
        pd.cdAlumno,
        pd.cdTaller,
        p.nuMes,
        p.nuAnio
      FROM TD_PAGOS p
      INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
      WHERE pd.cdAlumno IN (
        SELECT a.cdAlumno 
        FROM TR_ALUMNO_GRUPO_FAMILIAR agf1
        INNER JOIN TD_ALUMNOS a ON agf1.cdAlumno = a.cdAlumno
        WHERE agf1.cdGrupoFamiliar = (
          SELECT cdGrupoFamiliar 
          FROM TR_ALUMNO_GRUPO_FAMILIAR 
          WHERE cdAlumno = ?
        )
        UNION
        SELECT ? as cdAlumno
      )`,
      [cdAlumno, cdAlumno]
    );

    // Generar la lista de pagos pendientes por mes
    const pagosPendientes: any[] = [];
    const pagosSet = new Set(
      pagosRealizadosDetalle.map((p: any) => 
        `${p.cdAlumno}-${p.cdTaller}-${p.nuMes}-${p.nuAnio}`
      )
    );

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    for (const inscripcion of inscripciones) {
      const fechaInscripcion = new Date(inscripcion.feInscripcion);
      const hoy = new Date();
      
      let fecha = new Date(fechaInscripcion.getFullYear(), fechaInscripcion.getMonth(), 1);
      
      while (fecha <= hoy) {
        const mes = fecha.getMonth() + 1;
        const anio = fecha.getFullYear();
        const key = `${inscripcion.cdAlumno}-${inscripcion.cdTaller}-${mes}-${anio}`;
        
        if (!pagosSet.has(key)) {
          pagosPendientes.push({
            cdAlumno: inscripcion.cdAlumno,
            nombreAlumno: inscripcion.nombreAlumno,
            cdTaller: inscripcion.cdTaller,
            dsNombreTaller: inscripcion.dsNombreTaller,
            nuAnioTaller: inscripcion.nuAnioTaller,
            mes: mes,
            mesNombre: mesesNombres[mes - 1],
            anio: anio,
            monto: inscripcion.precio
          });
        }
        
        fecha.setMonth(fecha.getMonth() + 1);
      }
    }

    // Ordenar por alumno, taller y fecha
    pagosPendientes.sort((a, b) => {
      if (a.cdAlumno !== b.cdAlumno) return a.cdAlumno - b.cdAlumno;
      if (a.cdTaller !== b.cdTaller) return a.cdTaller - b.cdTaller;
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

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
        montoPendienteTotal: pagosPendientes.reduce((sum: number, p: any) => sum + parseFloat(p.monto || 0), 0),
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
