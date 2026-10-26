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

    return NextResponse.json({
      anioActual: getAnioActual(),
      aniosHabilitados: await getAniosPermitidos(),
    });
  } catch (error: any) {
    console.error('Error al obtener configuración de inscripciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de inscripciones', details: error.message },
      { status: 500 }
    );
  }
}
