import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener historial de faltas de un alumno
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const cdTaller = searchParams.get('cdTaller');

    let query = `
      SELECT 
        f.cdFalta,
        f.feFalta,
        f.snPresente,
        f.dsObservacion,
        f.feRegistro,
        t.nuAnioTaller,
        tt.dsNombreTaller,
        p.dsNombreCompleto as nombreProfesor,
        u.dsNombreCompleto as nombreUsuarioRegistro
      FROM td_asistencias f
      INNER JOIN TD_TALLERES t ON f.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      LEFT JOIN TD_USUARIOS u ON f.cdUsuarioRegistro = u.cdUsuario
      WHERE f.cdAlumno = ?
        AND f.snPresente = 0
    `;

    const params_query: any[] = [cdAlumno];

    if (cdTaller) {
      query += ' AND f.cdTaller = ?';
      params_query.push(parseInt(cdTaller));
    }

    query += ' ORDER BY f.feFalta DESC';

    const [faltas] = await pool.execute<any[]>(query, params_query);

    return NextResponse.json(faltas);
  } catch (error: any) {
    console.error('Error al obtener historial de faltas:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial de faltas', details: error.message },
      { status: 500 }
    );
  }
}
