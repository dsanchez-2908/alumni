import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// PUT - Cambiar estado del alumno en el taller (dar de baja/reactivar)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; alumnoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = parseInt(params.alumnoId);
    const { activo } = await request.json();

    if (activo) {
      // Reactivar alumno (cdEstado = 1)
      await pool.execute(
        'UPDATE TR_ALUMNO_TALLER SET cdEstado = 1, feBaja = NULL WHERE id = ?',
        [id]
      );
    } else {
      // Dar de baja alumno (cdEstado = 2)
      await pool.execute(
        'UPDATE TR_ALUMNO_TALLER SET cdEstado = 2, feBaja = NOW() WHERE id = ?',
        [id]
      );
    }

    await registrarTraza({
      dsProceso: 'Talleres - Alumnos',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: id,
      dsDetalle: `Alumno ${activo ? 'reactivado' : 'dado de baja'} en taller`,
    });

    return NextResponse.json({ message: 'Estado actualizado exitosamente' });
  } catch (error: any) {
    console.error('Error al cambiar estado:', error);
    return NextResponse.json(
      { error: 'Error al cambiar estado', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar inscripción (opcional, si lo prefieres puedes solo usar PUT para dar de baja)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; alumnoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = parseInt(params.alumnoId);

    await pool.execute(
      'DELETE FROM TR_ALUMNO_TALLER WHERE id = ?',
      [id]
    );

    await registrarTraza({
      dsProceso: 'Talleres - Alumnos',
      dsAccion: 'Eliminar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: id,
      dsDetalle: 'Inscripción eliminada',
    });

    return NextResponse.json({ message: 'Inscripción eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar inscripción:', error);
    return NextResponse.json(
      { error: 'Error al eliminar inscripción', details: error.message },
      { status: 500 }
    );
  }
}
