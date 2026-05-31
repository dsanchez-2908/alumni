import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// DELETE - Borrar un pago (solo para administradores)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea administrador
    const userRoles = (session.user?.roles as string[]) || [];
    if (!userRoles.includes('Administrador')) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden borrar pagos' },
        { status: 403 }
      );
    }

    const cdPago = parseInt(params.id);

    if (isNaN(cdPago)) {
      return NextResponse.json(
        { error: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    // Verificar que el pago existe
    const [pagoRows]: any = await connection.execute(
      `SELECT p.cdPago, p.nuMes, p.nuAnio, p.nuMontoTotal,
              CONCAT(a.dsApellido, ', ', a.dsNombre) as nombreAlumno
       FROM TD_PAGOS p
       INNER JOIN TD_ALUMNOS a ON p.cdAlumno = a.cdAlumno
       WHERE p.cdPago = ?`,
      [cdPago]
    );

    if (pagoRows.length === 0) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const pago = pagoRows[0];

    // Iniciar transacción
    await connection.beginTransaction();

    // Primero borrar los detalles del pago
    await connection.execute(
      'DELETE FROM TD_PAGOS_DETALLE WHERE cdPago = ?',
      [cdPago]
    );

    // Luego borrar el pago principal
    await connection.execute(
      'DELETE FROM TD_PAGOS WHERE cdPago = ?',
      [cdPago]
    );

    // Commit de la transacción
    await connection.commit();

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Pagos',
      dsAccion: 'Eliminar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdPago,
      dsDetalle: `Pago borrado: #${cdPago} - ${pago.nombreAlumno} - ${pago.nuMes}/${pago.nuAnio} - Total: $${pago.nuMontoTotal}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Pago borrado exitosamente',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al borrar pago:', error);
    
    return NextResponse.json(
      { error: 'Error al borrar el pago' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
