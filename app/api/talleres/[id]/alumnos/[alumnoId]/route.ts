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
      // Reactivar alumno
      await pool.execute(
        'UPDATE tr_alumno_taller SET feBaja = NULL WHERE id = ?',
        [id]
      );
    } else {
      // Dar de baja alumno
      await pool.execute(
        'UPDATE tr_alumno_taller SET feBaja = NOW() WHERE id = ?',
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
      'DELETE FROM tr_alumno_taller WHERE id = ?',
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
