import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getAnioActual, getAniosPermitidos } from '@/lib/inscripciones';

// GET - Años de inscripción disponibles para pagar
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const aniosHabilitados = await getAniosPermitidos();
    // Si hay una inscripción abierta de un año posterior (ej: la del año próximo), ese es el año por defecto
    // para que el usuario no tenga que acordarse de cambiarlo
    const anioPorDefecto = Math.max(getAnioActual(), ...aniosHabilitados);

    return NextResponse.json({
      anioActual: getAnioActual(),
      anioPorDefecto,
      aniosHabilitados,
    });
  } catch (error: any) {
    console.error('Error al obtener configuración de inscripciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de inscripciones', details: error.message },
      { status: 500 }
    );
  }
}
