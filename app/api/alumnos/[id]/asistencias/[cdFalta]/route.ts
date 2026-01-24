import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// PATCH - Actualizar observación de una asistencia
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; cdFalta: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);
    const cdFalta = parseInt(params.cdFalta);
    const { dsObservacion } = await request.json();

    const cdUsuario = (session.user as any).cdUsuario;

    // Verificar que la asistencia existe y pertenece al alumno
    const [asistenciaRows] = await pool.execute<any[]>(
      'SELECT cdAlumno FROM td_asistencias WHERE cdFalta = ?',
      [cdFalta]
    );

    if (asistenciaRows.length === 0) {
      return NextResponse.json(
        { error: 'Asistencia no encontrada' },
        { status: 404 }
      );
    }

    if (asistenciaRows[0].cdAlumno !== cdAlumno) {
      return NextResponse.json(
        { error: 'La asistencia no pertenece a este alumno' },
        { status: 403 }
      );
    }

    // Actualizar observación
    await pool.execute(
      'UPDATE td_asistencias SET dsObservacion = ? WHERE cdFalta = ?',
      [dsObservacion || null, cdFalta]
    );

    await registrarTraza({
      dsProceso: 'Asistencias',
      dsAccion: 'Modificar',
      cdUsuario,
      cdElemento: cdFalta,
      dsDetalle: `Observación actualizada para asistencia ${cdFalta}`,
    });

    return NextResponse.json({ message: 'Observación actualizada exitosamente' });
  } catch (error: any) {
    console.error('Error al actualizar observación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar observación', details: error.message },
      { status: 500 }
    );
  }
}
