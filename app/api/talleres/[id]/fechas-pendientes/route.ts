import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener fechas de clase pendientes de registro
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTaller = parseInt(params.id);

    // Obtener información del taller
    const [tallerRows] = await pool.execute<any[]>(
      `SELECT 
        t.feInicioTaller,
        t.snLunes, t.snMartes, t.snMiercoles, t.snJueves, 
        t.snViernes, t.snSabado, t.snDomingo
      FROM TD_TALLERES t
      WHERE t.cdTaller = ?`,
      [cdTaller]
    );

    if (tallerRows.length === 0) {
      return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });
    }

    const taller = tallerRows[0];
    const fechaInicio = new Date(taller.feInicioTaller);
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    // Días de la semana que tiene clase (0=Domingo, 6=Sábado)
    const diasClase: number[] = [];
    if (taller.snDomingo) diasClase.push(0);
    if (taller.snLunes) diasClase.push(1);
    if (taller.snMartes) diasClase.push(2);
    if (taller.snMiercoles) diasClase.push(3);
    if (taller.snJueves) diasClase.push(4);
    if (taller.snViernes) diasClase.push(5);
    if (taller.snSabado) diasClase.push(6);

    // Obtener todas las fechas que ya tienen registro
    const [registradas] = await pool.execute<any[]>(
      `SELECT DISTINCT DATE(feFalta) as fecha
       FROM TD_ASISTENCIAS
       WHERE cdTaller = ?`,
      [cdTaller]
    );

    const fechasRegistradas = new Set(
      registradas.map((r: any) => r.fecha.toISOString().split('T')[0])
    );

    // Generar fechas de clase pendientes
    const fechasPendientes: string[] = [];
    let fechaActual = new Date(fechaInicio);

    while (fechaActual <= fechaHoy) {
      const diaSemana = fechaActual.getDay();
      const fechaStr = fechaActual.toISOString().split('T')[0];

      // Si es un día de clase y no está registrado
      if (diasClase.includes(diaSemana) && !fechasRegistradas.has(fechaStr)) {
        fechasPendientes.push(fechaStr);
      }

      // Avanzar un día
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return NextResponse.json({
      fechasPendientes,
      diasClase,
      fechaInicio: fechaInicio.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('Error al obtener fechas pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener fechas pendientes', details: error.message },
      { status: 500 }
    );
  }
}
