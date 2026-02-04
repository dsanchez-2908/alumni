import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener precio vigente para un tipo de taller
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTipoTaller = parseInt(params.id);

    // Obtener el precio vigente más reciente
    const [precios] = await pool.execute<any[]>(
      `SELECT 
        p.*,
        tt.dsNombreTaller
      FROM TD_PRECIOS_TALLERES p
      INNER JOIN TD_TIPO_TALLERES tt ON p.cdTipoTaller = tt.cdTipoTaller
      WHERE p.cdTipoTaller = ? 
        AND p.feInicioVigencia <= CURDATE()
        AND p.cdEstado = 1
      ORDER BY p.feInicioVigencia DESC
      LIMIT 1`,
      [cdTipoTaller]
    );

    if (precios.length === 0) {
      return NextResponse.json(
        { error: 'No hay precio vigente para este tipo de taller' },
        { status: 404 }
      );
    }

    return NextResponse.json(precios[0]);
  } catch (error: any) {
    console.error('Error al obtener precio vigente:', error);
    return NextResponse.json(
      { error: 'Error al obtener precio vigente', details: error.message },
      { status: 500 }
    );
  }
}
