import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { update, softDelete, registrarTraza } from '@/lib/db-utils';

// PUT - Actualizar tipo de taller
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTipoTaller = parseInt(params.id);
    const data = await request.json();

    // Validaciones
    if (!data.dsNombreTaller) {
      return NextResponse.json(
        { error: 'El nombre del taller es requerido' },
        { status: 400 }
      );
    }

    if (data.nuEdadDesde && data.nuEdadHasta && data.nuEdadDesde > data.nuEdadHasta) {
      return NextResponse.json(
        { error: 'La edad desde no puede ser mayor que la edad hasta' },
        { status: 400 }
      );
    }

    await update(
      'TD_TIPO_TALLERES',
      {
        dsNombreTaller: data.dsNombreTaller,
        dsDescripcionTaller: data.dsDescripcionTaller || null,
        nuEdadDesde: data.nuEdadDesde || null,
        nuEdadHasta: data.nuEdadHasta || null,
        cdEstado: data.cdEstado,
      },
      'cdTipoTaller',
      cdTipoTaller
    );

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Tipo de Taller',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdTipoTaller,
      dsDetalle: `Tipo de taller modificado: ${data.dsNombreTaller}`,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Tipo de taller actualizado exitosamente' 
    });
  } catch (error) {
    console.error('Error en PUT /api/tipo-talleres:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tipo de taller' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar tipo de taller
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTipoTaller = parseInt(params.id);

    await softDelete('TD_TIPO_TALLERES', 'cdTipoTaller', cdTipoTaller, 2);

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Tipo de Taller',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdTipoTaller,
      dsDetalle: 'Tipo de taller desactivado',
    });

    return NextResponse.json({ 
      success: true,
      message: 'Tipo de taller desactivado exitosamente' 
    });
  } catch (error) {
    console.error('Error en DELETE /api/tipo-talleres:', error);
    return NextResponse.json(
      { error: 'Error al desactivar tipo de taller' },
      { status: 500 }
    );
  }
}
