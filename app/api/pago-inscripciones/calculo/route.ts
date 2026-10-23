import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { calcularInscripcionGrupo, getAniosPermitidos } from '@/lib/inscripciones';

// GET - Grupo familiar del alumno con el precio de inscripción de cada miembro para un año
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cdAlumno = parseInt(searchParams.get('cdAlumno') || '');
    const cdGrupoFamiliar = parseInt(searchParams.get('cdGrupoFamiliar') || '') || null;
    const anio = parseInt(searchParams.get('anio') || '');

    if (!cdAlumno || !anio) {
      return NextResponse.json({ error: 'Alumno y año son requeridos' }, { status: 400 });
    }

    const aniosPermitidos = await getAniosPermitidos();
    if (!aniosPermitidos.includes(anio)) {
      return NextResponse.json(
        { error: `La inscripción ${anio} no está habilitada para pagar` },
        { status: 400 }
      );
    }

    const calculo = await calcularInscripcionGrupo(pool, { cdAlumno, cdGrupoFamiliar, anio });
    if (calculo.miembros.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    return NextResponse.json(calculo);
  } catch (error: any) {
    console.error('Error al calcular inscripción:', error);
    return NextResponse.json(
      { error: 'Error al calcular inscripción', details: error.message },
      { status: 500 }
    );
  }
}
