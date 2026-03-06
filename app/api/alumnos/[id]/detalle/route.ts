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
        at.cdEstado as cdEstadoEnTaller,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado,
        t.dsDescripcionHorarios,
        t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.dsSabadoHoraDesde, t.dsSabadoHoraHasta
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
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
        et.dsEstado as estadoEnTaller,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado,
        t.dsDescripcionHorarios,
        t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.dsSabadoHoraDesde, t.dsSabadoHoraHasta
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
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
      LEFT JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
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
        p.dsNombreCompleto as nombreProfesor,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado,
        t.dsDescripcionHorarios,
        t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.dsSabadoHoraDesde, t.dsSabadoHoraHasta,
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
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
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
      GROUP BY a.cdAlumno, t.cdTaller, tt.cdTipoTaller, tt.dsNombreTaller, t.nuAnioTaller, p.dsNombreCompleto,
               t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, t.snJueves, t.snViernes, t.snSabado, t.dsDescripcionHorarios,
               t.dsDomingoHoraDesde, t.dsDomingoHoraHasta, t.dsLunesHoraDesde, t.dsLunesHoraHasta,
               t.dsMartesHoraDesde, t.dsMartesHoraHasta, t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
               t.dsJuevesHoraDesde, t.dsJuevesHoraHasta, t.dsViernesHoraDesde, t.dsViernesHoraHasta,
               t.dsSabadoHoraDesde, t.dsSabadoHoraHasta`,
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
      
      // Función helper para formatear hora TIME a HH:MM
      const formatTime = (time: string | null) => {
        if (!time) return null;
        return time.substring(0, 5);
      };
      
      // Formatear días de la semana con horarios
      const diasInfo = [];
      if (inscripcion.snDomingo) {
        const desde = formatTime(inscripcion.dsDomingoHoraDesde);
        const hasta = formatTime(inscripcion.dsDomingoHoraHasta);
        diasInfo.push({ dia: 'Dom', desde, hasta });
      }
      if (inscripcion.snLunes) {
        const desde = formatTime(inscripcion.dsLunesHoraDesde);
        const hasta = formatTime(inscripcion.dsLunesHoraHasta);
        diasInfo.push({ dia: 'Lun', desde, hasta });
      }
      if (inscripcion.snMartes) {
        const desde = formatTime(inscripcion.dsMartesHoraDesde);
        const hasta = formatTime(inscripcion.dsMartesHoraHasta);
        diasInfo.push({ dia: 'Mar', desde, hasta });
      }
      if (inscripcion.snMiercoles) {
        const desde = formatTime(inscripcion.dsMiercolesHoraDesde);
        const hasta = formatTime(inscripcion.dsMiercolesHoraHasta);
        diasInfo.push({ dia: 'Mié', desde, hasta });
      }
      if (inscripcion.snJueves) {
        const desde = formatTime(inscripcion.dsJuevesHoraDesde);
        const hasta = formatTime(inscripcion.dsJuevesHoraHasta);
        diasInfo.push({ dia: 'Jue', desde, hasta });
      }
      if (inscripcion.snViernes) {
        const desde = formatTime(inscripcion.dsViernesHoraDesde);
        const hasta = formatTime(inscripcion.dsViernesHoraHasta);
        diasInfo.push({ dia: 'Vie', desde, hasta });
      }
      if (inscripcion.snSabado) {
        const desde = formatTime(inscripcion.dsSabadoHoraDesde);
        const hasta = formatTime(inscripcion.dsSabadoHoraHasta);
        diasInfo.push({ dia: 'Sáb', desde, hasta });
      }
      
      const diasTexto = diasInfo.map(d => {
        if (d.desde && d.hasta) {
          return `${d.dia} ${d.desde}-${d.hasta}`;
        }
        return d.dia;
      }).join(', ');
      
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
            nombreProfesor: inscripcion.nombreProfesor,
            diasClase: diasTexto,
            horarioClase: inscripcion.dsDescripcionHorarios || '',
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
      FROM TD_ASISTENCIAS f
      INNER JOIN TD_TALLERES t ON f.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE f.cdAlumno = ?
      ORDER BY f.feFalta DESC
      LIMIT 100`,
      [cdAlumno]
    );

    // Formatear días de clase para talleres activos y finalizados
    const formatearDiasYHorarios = (talleres: any[]) => {
      return talleres.map(taller => {
        const diasInfo = [];
        
        // Función helper para formatear hora TIME a HH:MM
        const formatTime = (time: string | null) => {
          if (!time) return null;
          // TIME viene como "HH:MM:SS", tomamos solo HH:MM
          return time.substring(0, 5);
        };
        
        // Procesar cada día con su horario específico
        if (taller.snDomingo) {
          const desde = formatTime(taller.dsDomingoHoraDesde);
          const hasta = formatTime(taller.dsDomingoHoraHasta);
          diasInfo.push({ dia: 'Dom', desde, hasta });
        }
        if (taller.snLunes) {
          const desde = formatTime(taller.dsLunesHoraDesde);
          const hasta = formatTime(taller.dsLunesHoraHasta);
          diasInfo.push({ dia: 'Lun', desde, hasta });
        }
        if (taller.snMartes) {
          const desde = formatTime(taller.dsMartesHoraDesde);
          const hasta = formatTime(taller.dsMartesHoraHasta);
          diasInfo.push({ dia: 'Mar', desde, hasta });
        }
        if (taller.snMiercoles) {
          const desde = formatTime(taller.dsMiercolesHoraDesde);
          const hasta = formatTime(taller.dsMiercolesHoraHasta);
          diasInfo.push({ dia: 'Mié', desde, hasta });
        }
        if (taller.snJueves) {
          const desde = formatTime(taller.dsJuevesHoraDesde);
          const hasta = formatTime(taller.dsJuevesHoraHasta);
          diasInfo.push({ dia: 'Jue', desde, hasta });
        }
        if (taller.snViernes) {
          const desde = formatTime(taller.dsViernesHoraDesde);
          const hasta = formatTime(taller.dsViernesHoraHasta);
          diasInfo.push({ dia: 'Vie', desde, hasta });
        }
        if (taller.snSabado) {
          const desde = formatTime(taller.dsSabadoHoraDesde);
          const hasta = formatTime(taller.dsSabadoHoraHasta);
          diasInfo.push({ dia: 'Sáb', desde, hasta });
        }
        
        // Construir texto de días con horarios
        const diasTexto = diasInfo.map(d => {
          if (d.desde && d.hasta) {
            return `${d.dia} ${d.desde}-${d.hasta}`;
          }
          return d.dia;
        }).join(', ');
        
        // Si hay dsDescripcionHorarios, usarlo como descripción adicional
        const horarioClase = taller.dsDescripcionHorarios || '';
        
        return {
          ...taller,
          diasClase: diasTexto,
          horarioClase
        };
      });
    };

    const talleresActivosFormateados = formatearDiasYHorarios(talleresActivos);
    const talleresFinalizadosFormateados = formatearDiasYHorarios(talleresFinalizados);

    // Retornar todo
    return NextResponse.json({
      alumno: alumnoData,
      grupoFamiliar,
      miembrosGrupo,
      talleresActivos: talleresActivosFormateados,
      talleresFinalizados: talleresFinalizadosFormateados,
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
