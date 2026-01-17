import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { updateUser, changePassword } from '@/lib/auth';
import { registrarTraza } from '@/lib/db-utils';
import { softDelete } from '@/lib/db-utils';

// PUT - Actualizar usuario
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdUsuario = parseInt(params.id);
    const data = await request.json();

    // Validaciones
    if (!data.dsNombreCompleto || !data.dsUsuario) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!data.roles || data.roles.length === 0) {
      return NextResponse.json(
        { error: 'Debe asignar al menos un rol' },
        { status: 400 }
      );
    }

    await updateUser(cdUsuario, data);

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Usuario',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdUsuario,
      dsDetalle: `Usuario modificado: ${data.dsUsuario}`,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Usuario actualizado exitosamente' 
    });
  } catch (error: any) {
    console.error('Error en PUT /api/usuarios:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar usuario (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdUsuario = parseInt(params.id);

    // No permitir eliminar el propio usuario
    if (cdUsuario === session.user.cdUsuario) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propio usuario' },
        { status: 400 }
      );
    }

    await softDelete('TD_USUARIOS', 'cdUsuario', cdUsuario, 2); // Estado Inactivo = 2

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Usuario',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdUsuario,
      dsDetalle: 'Usuario desactivado',
    });

    return NextResponse.json({ 
      success: true,
      message: 'Usuario desactivado exitosamente' 
    });
  } catch (error) {
    console.error('Error en DELETE /api/usuarios:', error);
    return NextResponse.json(
      { error: 'Error al desactivar usuario' },
      { status: 500 }
    );
  }
}
