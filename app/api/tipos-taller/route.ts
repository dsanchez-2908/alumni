import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener todos los tipos de talleres activos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [tipos] = await pool.execute<any[]>(
      'SELECT * FROM TD_TIPO_TALLERES WHERE cdEstado = 1 ORDER BY dsNombreTaller'
    );

    return NextResponse.json(tipos);
  } catch (error: any) {
    console.error('Error al obtener tipos de talleres:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de talleres', details: error.message },
      { status: 500 }
    );
  }
}
