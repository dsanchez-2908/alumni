import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener asistencias de un alumno en un taller específico
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
    const { searchParams } = new URL(request.url);
    const cdTaller = searchParams.get('cdTaller');

    if (!cdTaller) {
      return NextResponse.json(
        { error: 'cdTaller es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del taller
    const [tallerRows] = await pool.execute<any[]>(
      `SELECT 
        t.feInicioTaller,
        t.snLunes, t.snMartes, t.snMiercoles, t.snJueves, 
        t.snViernes, t.snSabado, t.snDomingo,
        at.feInscripcion,
        at.feBaja
      FROM TD_TALLERES t
      INNER JOIN tr_alumno_taller at ON t.cdTaller = at.cdTaller
      WHERE t.cdTaller = ? AND at.cdAlumno = ?`,
      [cdTaller, cdAlumno]
    );

    if (tallerRows.length === 0) {
      return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });
    }

    const taller = tallerRows[0];
    
    // Determinar fecha de inicio (la mayor entre feInicioTaller y feInscripcion)
    const fechaInicioTaller = new Date(taller.feInicioTaller);
    const fechaInscripcion = new Date(taller.feInscripcion);
    const fechaInicio = fechaInicioTaller > fechaInscripcion ? fechaInicioTaller : fechaInscripcion;
    
    // Determinar fecha de fin (hoy o fecha de baja si existe)
    const fechaFin = taller.feBaja ? new Date(taller.feBaja) : new Date();
    fechaFin.setHours(0, 0, 0, 0);

    // Días de la semana que tiene clase (0=Domingo, 6=Sábado)
    const diasClase: number[] = [];
    if (taller.snDomingo) diasClase.push(0);
    if (taller.snLunes) diasClase.push(1);
    if (taller.snMartes) diasClase.push(2);
    if (taller.snMiercoles) diasClase.push(3);
    if (taller.snJueves) diasClase.push(4);
    if (taller.snViernes) diasClase.push(5);
    if (taller.snSabado) diasClase.push(6);

    // Generar todas las fechas de clase
    const fechasClase: string[] = [];
    let fechaActual = new Date(fechaInicio);
    fechaActual.setHours(0, 0, 0, 0);

    while (fechaActual <= fechaFin) {
      if (diasClase.includes(fechaActual.getDay())) {
        const fechaStr = fechaActual.toISOString().split('T')[0];
        fechasClase.push(fechaStr);
      }
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Obtener asistencias registradas
    const [asistencias] = await pool.execute<any[]>(
      `SELECT 
        DATE(feFalta) as fecha,
        snPresente,
        dsObservacion,
        cdFalta
      FROM td_asistencias
      WHERE cdAlumno = ? AND cdTaller = ?
      ORDER BY feFalta`,
      [cdAlumno, cdTaller]
    );

    const asistenciasFormateadas = asistencias.map((a) => ({
      fecha: a.fecha.toISOString().split('T')[0],
      snPresente: a.snPresente,
      dsObservacion: a.dsObservacion,
      cdFalta: a.cdFalta,
    }));

    return NextResponse.json({
      fechasClase,
      asistencias: asistenciasFormateadas,
    });
  } catch (error: any) {
    console.error('Error al obtener asistencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener asistencias', details: error.message },
      { status: 500 }
    );
  }
}
