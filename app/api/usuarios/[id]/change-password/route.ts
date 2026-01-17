import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { changePassword } from '@/lib/auth';
import { registrarTraza } from '@/lib/db-utils';

// POST - Cambiar contraseña
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdUsuario = parseInt(params.id);
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 3) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 3 caracteres' },
        { status: 400 }
      );
    }

    const success = await changePassword(cdUsuario, newPassword);

    if (!success) {
      return NextResponse.json(
        { error: 'Error al cambiar la contraseña' },
        { status: 500 }
      );
    }

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Usuario',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdUsuario,
      dsDetalle: 'Contraseña modificada',
    });

    return NextResponse.json({ 
      success: true,
      message: 'Contraseña cambiada exitosamente' 
    });
  } catch (error) {
    console.error('Error en POST /api/usuarios/[id]/change-password:', error);
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    );
  }
}
