import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener reporte de asistencia por taller
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cdTaller = searchParams.get('cdTaller');
    const anio = searchParams.get('anio');

    if (!cdTaller || !anio) {
      return NextResponse.json(
        { error: 'cdTaller y anio son requeridos' },
        { status: 400 }
      );
    }

    // Obtener información del taller
    const [tallerInfo] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        t.nuAnioTaller,
        tt.dsNombreTaller,
        t.feInicioTaller,
        p.dsNombreCompleto as nombrePersonal
      FROM TD_TALLERES t
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      WHERE t.cdTaller = ? AND t.nuAnioTaller = ?`,
      [cdTaller, anio]
    );

    if (tallerInfo.length === 0) {
      return NextResponse.json(
        { error: 'Taller no encontrado' },
        { status: 404 }
      );
    }

    const taller = tallerInfo[0];

    // Calcular fechas de clase del taller en el año
    const [diasClase] = await pool.execute<any[]>(
      `SELECT 
        COUNT(DISTINCT feFalta) as totalClases
      FROM td_asistencias
      WHERE cdTaller = ? 
        AND YEAR(feFalta) = ?`,
      [cdTaller, anio]
    );

    const totalClases = diasClase[0]?.totalClases || 0;

    // Obtener totales generales del taller
    const [totalesGenerales] = await pool.execute<any[]>(
      `SELECT 
        SUM(CASE WHEN snPresente = 1 THEN 1 ELSE 0 END) as totalPresentes,
        SUM(CASE WHEN snPresente = 0 THEN 1 ELSE 0 END) as totalAusentes,
        SUM(CASE WHEN snPresente = 3 THEN 1 ELSE 0 END) as totalFeriados
      FROM td_asistencias
      WHERE cdTaller = ? 
        AND YEAR(feFalta) = ?`,
      [cdTaller, anio]
    );

    // Obtener alumnos activos del taller
    const [alumnos] = await pool.execute<any[]>(
      `SELECT DISTINCT
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI
      FROM tr_alumno_taller at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      WHERE at.cdTaller = ?
      ORDER BY a.dsApellido, a.dsNombre`,
      [cdTaller]
    );

    // Obtener estadísticas por alumno
    const [estadisticasPorAlumno] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        SUM(CASE WHEN ast.snPresente = 1 THEN 1 ELSE 0 END) as totalPresentes,
        SUM(CASE WHEN ast.snPresente = 0 THEN 1 ELSE 0 END) as totalAusentes,
        SUM(CASE WHEN ast.snPresente = 3 THEN 1 ELSE 0 END) as totalFeriados,
        COUNT(DISTINCT ast.feFalta) as totalRegistros
      FROM tr_alumno_taller at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      LEFT JOIN td_asistencias ast ON at.cdAlumno = ast.cdAlumno 
        AND at.cdTaller = ast.cdTaller
        AND YEAR(ast.feFalta) = ?
      WHERE at.cdTaller = ?
      GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido
      ORDER BY a.dsApellido, a.dsNombre`,
      [anio, cdTaller]
    );

    // Obtener estadísticas por alumno y mes
    const [estadisticasPorMes] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        MONTH(ast.feFalta) as mes,
        SUM(CASE WHEN ast.snPresente = 1 THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN ast.snPresente = 0 THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN ast.snPresente = 3 THEN 1 ELSE 0 END) as feriados
      FROM tr_alumno_taller at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      LEFT JOIN td_asistencias ast ON at.cdAlumno = ast.cdAlumno 
        AND at.cdTaller = ast.cdTaller
        AND YEAR(ast.feFalta) = ?
      WHERE at.cdTaller = ?
      GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido, MONTH(ast.feFalta)
      ORDER BY a.dsApellido, a.dsNombre, mes`,
      [anio, cdTaller]
    );

    // Organizar datos por mes para cada alumno
    const alumnosPorMes = alumnos.map((alumno: any) => {
      const meses: any = {};
      for (let i = 1; i <= 12; i++) {
        meses[i] = { presentes: 0, ausentes: 0, feriados: 0 };
      }

      estadisticasPorMes
        .filter((e: any) => e.cdAlumno === alumno.cdAlumno)
        .forEach((e: any) => {
          if (e.mes) {
            meses[e.mes] = {
              presentes: e.presentes || 0,
              ausentes: e.ausentes || 0,
              feriados: e.feriados || 0,
            };
          }
        });

      return {
        cdAlumno: alumno.cdAlumno,
        dsNombre: alumno.dsNombre,
        dsApellido: alumno.dsApellido,
        dsDNI: alumno.dsDNI,
        meses,
      };
    });

    return NextResponse.json({
      taller,
      totalClases,
      totalesGenerales: {
        totalPresentes: totalesGenerales[0]?.totalPresentes || 0,
        totalAusentes: totalesGenerales[0]?.totalAusentes || 0,
        totalFeriados: totalesGenerales[0]?.totalFeriados || 0,
      },
      estadisticasPorAlumno,
      alumnosPorMes,
    });
  } catch (error: any) {
    console.error('Error al obtener reporte de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener reporte', details: error.message },
      { status: 500 }
    );
  }
}
