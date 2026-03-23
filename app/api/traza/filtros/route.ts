import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener listas de filtros (sin búsqueda de trazas)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea Administrador o Supervisor
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('Administrador') && !userRoles.includes('Supervisor')) {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a este recurso' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    if (tipo === 'procesos') {
      const [procesos] = await pool.execute<any[]>(
        'SELECT DISTINCT dsProceso FROM TD_TRAZA ORDER BY dsProceso'
      );
      return NextResponse.json(procesos.map(p => p.dsProceso));
    }

    if (tipo === 'acciones') {
      const [acciones] = await pool.execute<any[]>(
        'SELECT DISTINCT dsAccion FROM TD_TRAZA ORDER BY dsAccion'
      );
      return NextResponse.json(acciones.map(a => a.dsAccion));
    }

    if (tipo === 'usuarios') {
      const [usuarios] = await pool.execute<any[]>(
        `SELECT DISTINCT u.cdUsuario, u.dsUsuario 
         FROM TD_TRAZA t
         INNER JOIN TD_USUARIOS u ON t.cdUsuario = u.cdUsuario
         ORDER BY u.dsUsuario`
      );
      return NextResponse.json(usuarios.map(u => ({ cdUsuario: u.cdUsuario, dsUsuario: u.dsUsuario })));
    }

    return NextResponse.json({ error: 'Tipo de filtro no válido' }, { status: 400 });
  } catch (error: any) {
    console.error('Error al obtener filtros:', error);
    return NextResponse.json(
      { error: 'Error al obtener filtros', details: error.message },
      { status: 500 }
    );
  }
}
