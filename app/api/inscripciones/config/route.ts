import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { registrarTraza } from '@/lib/db-utils';
import {
  getAnioActual,
  getAnioProximoHabilitado,
  setAnioProximoHabilitado,
} from '@/lib/inscripciones';

// GET - Años de inscripción disponibles para pagar
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const anioActual = getAnioActual();
    const anioProximoHabilitado = await getAnioProximoHabilitado();
    return NextResponse.json({
      anioActual,
      anioProximo: anioActual + 1,
      anioProximoHabilitado: anioProximoHabilitado !== null,
    });
  } catch (error: any) {
    console.error('Error al obtener configuración de inscripciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de inscripciones', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Habilitar / deshabilitar el pago anticipado de la inscripción del año próximo
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRoles: string[] = (session.user as any).roles || [];
    if (!userRoles.some((r) => ['Administrador', 'Supervisor'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { habilitado } = await request.json();
    if (typeof habilitado !== 'boolean') {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    await setAnioProximoHabilitado(habilitado);

    await registrarTraza({
      dsProceso: 'Inscripciones',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      dsDetalle: `${habilitado ? 'Habilitada' : 'Deshabilitada'} la inscripción del año ${getAnioActual() + 1}`,
    });

    return NextResponse.json({ habilitado });
  } catch (error: any) {
    console.error('Error al actualizar configuración de inscripciones:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración de inscripciones', details: error.message },
      { status: 500 }
    );
  }
}
