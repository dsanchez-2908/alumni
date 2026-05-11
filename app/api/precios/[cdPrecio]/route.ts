import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// PUT - Actualizar un precio específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { cdPrecio: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea Administrador
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('Administrador')) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo los administradores pueden modificar precios.' },
        { status: 403 }
      );
    }

    const cdPrecio = parseInt(params.cdPrecio);
    const cdUsuario = (session.user as any).cdUsuario;
    const body = await request.json();

    const {
      nuPrecioCompletoEfectivo,
      nuPrecioCompletoTransferencia,
      nuPrecioDescuentoEfectivo,
      nuPrecioDescuentoTransferencia,
    } = body;

    // Validaciones
    if (!nuPrecioCompletoEfectivo || !nuPrecioCompletoTransferencia ||
        !nuPrecioDescuentoEfectivo || !nuPrecioDescuentoTransferencia) {
      return NextResponse.json(
        { error: 'Todos los precios son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el precio existe
    const [precioExistente] = await pool.execute<any[]>(
      `SELECT p.*, tt.dsNombreTaller 
       FROM TD_PRECIOS_TALLERES p
       INNER JOIN TD_TIPO_TALLERES tt ON p.cdTipoTaller = tt.cdTipoTaller
       WHERE p.cdPrecio = ? AND p.cdEstado = 1`,
      [cdPrecio]
    );

    if (precioExistente.length === 0) {
      return NextResponse.json(
        { error: 'Precio no encontrado' },
        { status: 404 }
      );
    }

    const precioActual = precioExistente[0];

    // Actualizar el precio
    await pool.execute(
      `UPDATE TD_PRECIOS_TALLERES 
       SET nuPrecioCompletoEfectivo = ?,
           nuPrecioCompletoTransferencia = ?,
           nuPrecioDescuentoEfectivo = ?,
           nuPrecioDescuentoTransferencia = ?
       WHERE cdPrecio = ?`,
      [
        nuPrecioCompletoEfectivo,
        nuPrecioCompletoTransferencia,
        nuPrecioDescuentoEfectivo,
        nuPrecioDescuentoTransferencia,
        cdPrecio,
      ]
    );

    // Registrar traza con detalles de los cambios
    const cambios = [];
    if (precioActual.nuPrecioCompletoEfectivo !== nuPrecioCompletoEfectivo) {
      cambios.push(`Completo Efectivo: $${precioActual.nuPrecioCompletoEfectivo} → $${nuPrecioCompletoEfectivo}`);
    }
    if (precioActual.nuPrecioCompletoTransferencia !== nuPrecioCompletoTransferencia) {
      cambios.push(`Completo Transfer: $${precioActual.nuPrecioCompletoTransferencia} → $${nuPrecioCompletoTransferencia}`);
    }
    if (precioActual.nuPrecioDescuentoEfectivo !== nuPrecioDescuentoEfectivo) {
      cambios.push(`Descuento Efectivo: $${precioActual.nuPrecioDescuentoEfectivo} → $${nuPrecioDescuentoEfectivo}`);
    }
    if (precioActual.nuPrecioDescuentoTransferencia !== nuPrecioDescuentoTransferencia) {
      cambios.push(`Descuento Transfer: $${precioActual.nuPrecioDescuentoTransferencia} → $${nuPrecioDescuentoTransferencia}`);
    }

    await registrarTraza({
      dsProceso: 'Precios',
      dsAccion: 'Modificar',
      cdUsuario,
      cdElemento: cdPrecio,
      dsDetalle: `Precio modificado para ${precioActual.dsNombreTaller}. Cambios: ${cambios.join(', ')}`,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Precio actualizado correctamente',
      cambios 
    });
  } catch (error: any) {
    console.error('Error al actualizar precio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar precio', details: error.message },
      { status: 500 }
    );
  }
}
