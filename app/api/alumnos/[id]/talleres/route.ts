import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener talleres de un alumno (activos y finalizados)
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

    const [talleres] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        t.nuAnioTaller,
        tt.dsNombreTaller,
        t.feInicioTaller,
        t.snLunes,
        t.snMartes,
        t.snMiercoles,
        t.snJueves,
        t.snViernes,
        t.snSabado,
        t.snDomingo,
        at.feInscripcion,
        at.feBaja,
        at.cdEstado
      FROM tr_alumno_taller at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE at.cdAlumno = ?
      ORDER BY t.nuAnioTaller DESC, tt.dsNombreTaller`,
      [cdAlumno]
    );

    // Formatear días de la semana
    const talleresFormateados = talleres.map((taller) => {
      const diasSemana: string[] = [];
      if (taller.snLunes) diasSemana.push('Lunes');
      if (taller.snMartes) diasSemana.push('Martes');
      if (taller.snMiercoles) diasSemana.push('Miércoles');
      if (taller.snJueves) diasSemana.push('Jueves');
      if (taller.snViernes) diasSemana.push('Viernes');
      if (taller.snSabado) diasSemana.push('Sábado');
      if (taller.snDomingo) diasSemana.push('Domingo');

      return {
        cdTaller: taller.cdTaller,
        nuAnioTaller: taller.nuAnioTaller,
        dsNombreTaller: taller.dsNombreTaller,
        feInicioTaller: taller.feInicioTaller,
        diasSemana,
        feInscripcion: taller.feInscripcion,
        feBaja: taller.feBaja,
        cdEstado: taller.cdEstado,
      };
    });

    return NextResponse.json(talleresFormateados);
  } catch (error: any) {
    console.error('Error al obtener talleres:', error);
    return NextResponse.json(
      { error: 'Error al obtener talleres', details: error.message },
      { status: 500 }
    );
  }
}
