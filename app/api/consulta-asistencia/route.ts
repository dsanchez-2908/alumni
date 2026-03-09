import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cdPersonal = searchParams.get('cdPersonal');
    const cdTaller = searchParams.get('cdTaller');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!cdPersonal || !cdTaller || !anio || !mes) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      );
    }

    // Obtener todas las fechas en que SÍ se registró asistencia para ese taller en ese mes/año
    const [fechasRegistradas] = await pool.execute<any[]>(
      `SELECT DISTINCT 
        DATE(a.feFalta) as fecha,
        COUNT(DISTINCT a.cdAlumno) as totalAlumnos,
        SUM(CASE WHEN a.snPresente = 1 THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN a.snPresente = 0 THEN 1 ELSE 0 END) as ausentes
      FROM TD_ASISTENCIAS a
      WHERE a.cdTaller = ?
        AND YEAR(a.feFalta) = ?
        AND MONTH(a.feFalta) = ?
      GROUP BY DATE(a.feFalta)
      ORDER BY DATE(a.feFalta) DESC`,
      [parseInt(cdTaller), parseInt(anio), parseInt(mes)]
    );

    // Obtener información del taller
    const [tallerInfo] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        t.nuAnioTaller,
        tt.dsNombreTaller,
        t.feInicioTaller,
        t.snLunes, t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.snMartes, t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.snMiercoles, t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.snJueves, t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.snViernes, t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.snSabado, t.dsSabadoHoraDesde, t.dsSabadoHoraHasta,
        t.snDomingo, t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        p.dsNombreCompleto as nombreProfesor
      FROM TD_TALLERES t
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      WHERE t.cdTaller = ? AND t.cdPersonal = ?`,
      [parseInt(cdTaller), parseInt(cdPersonal)]
    );

    if (tallerInfo.length === 0) {
      return NextResponse.json(
        { error: 'Taller no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fechasRegistradas,
      taller: tallerInfo[0]
    });
  } catch (error) {
    console.error('Error al obtener fechas registradas:', error);
    return NextResponse.json(
      { error: 'Error al obtener fechas registradas' },
      { status: 500 }
    );
  }
}
