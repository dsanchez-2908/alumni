import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Buscar alumnos por nombre, apellido o DNI
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const searchTerm = `%${query}%`;

    const [alumnos] = await pool.execute<any[]>(
      `SELECT 
        cdAlumno,
        dsNombre,
        dsApellido,
        dsDNI
      FROM TD_ALUMNOS
      WHERE (dsNombre LIKE ? OR dsApellido LIKE ? OR dsDNI LIKE ?)
        AND cdEstado = 1
      ORDER BY dsApellido, dsNombre
      LIMIT 10`,
      [searchTerm, searchTerm, searchTerm]
    );

    return NextResponse.json(alumnos);
  } catch (error: any) {
    console.error('Error al buscar alumnos:', error);
    return NextResponse.json(
      { error: 'Error al buscar alumnos', details: error.message },
      { status: 500 }
    );
  }
}
