import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// POST - Finalizar taller y sus alumnos activos
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTaller = parseInt(params.id);
    const cdUsuario = (session.user as any).cdUsuario;

    await connection.beginTransaction();

    // Verificar que el taller exista y esté activo
    const [taller] = await connection.execute<any[]>(
      'SELECT cdTaller, cdEstado FROM TD_TALLERES WHERE cdTaller = ?',
      [cdTaller]
    );

    if (taller.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });
    }

    if (taller[0].cdEstado !== 1) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Solo se pueden finalizar talleres en estado Activo' },
        { status: 400 }
      );
    }

    // Actualizar el estado del taller a Finalizado (cdEstado = 4)
    await connection.execute(
      'UPDATE TD_TALLERES SET cdEstado = 4 WHERE cdTaller = ?',
      [cdTaller]
    );

    // Finalizar todos los alumnos activos del taller (cdEstado = 1)
    const [result]: any = await connection.execute(
      `UPDATE TR_ALUMNO_TALLER 
       SET cdEstado = 4, feFinalizacion = CURRENT_TIMESTAMP 
       WHERE cdTaller = ? 
       AND cdEstado = 1`,
      [cdTaller]
    );

    const alumnosFinalizados = result.affectedRows;

    await connection.commit();

    await registrarTraza({
      dsProceso: 'Talleres',
      dsAccion: 'Modificar',
      cdUsuario,
      cdElemento: cdTaller,
      dsDetalle: `Taller finalizado con ${alumnosFinalizados} alumnos`,
    });

    return NextResponse.json({
      message: 'Taller finalizado exitosamente',
      alumnosFinalizados,
    });
    
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al finalizar taller:', error);
    return NextResponse.json(
      { error: 'Error al finalizar taller', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
