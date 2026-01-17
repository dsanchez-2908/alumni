import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getAllUsers, createUser, getAllRoles, getAllEstados } from '@/lib/auth';
import { registrarTraza } from '@/lib/db-utils';

// GET - Obtener todos los usuarios
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const users = await getAllUsers();
    const roles = await getAllRoles();
    const estados = await getAllEstados();

    return NextResponse.json({ users, roles, estados });
  } catch (error) {
    console.error('Error en GET /api/usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validaciones
    if (!data.dsNombreCompleto || !data.dsUsuario || !data.dsClave) {
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

    const cdUsuario = await createUser(data);

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Usuario',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdUsuario,
      dsDetalle: `Usuario creado: ${data.dsUsuario}`,
    });

    return NextResponse.json({ 
      success: true, 
      cdUsuario,
      message: 'Usuario creado exitosamente' 
    });
  } catch (error: any) {
    console.error('Error en POST /api/usuarios:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
