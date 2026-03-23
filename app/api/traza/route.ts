import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Consultar historial de trazas
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
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const dsProceso = searchParams.get('dsProceso');
    const dsAccion = searchParams.get('dsAccion');
    const cdUsuario = searchParams.get('cdUsuario');
    const dsDetalle = searchParams.get('dsDetalle');

    // Validar que se proporcionen fechas (obligatorio)
    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: 'El rango de fechas es obligatorio' },
        { status: 400 }
      );
    }

    // Construir la consulta dinámica
    let query = `
      SELECT 
        t.cdTrazaDetalle,
        t.feHora,
        t.dsProceso,
        t.dsAccion,
        t.cdElemento,
        t.dsDetalle,
        u.dsUsuario as nombreUsuario,
        t.cdUsuario
      FROM TD_TRAZA t
      LEFT JOIN TD_USUARIOS u ON t.cdUsuario = u.cdUsuario
      WHERE DATE(t.feHora) >= ? AND DATE(t.feHora) <= ?
    `;

    const params: any[] = [fechaDesde, fechaHasta];

    if (dsProceso && dsProceso !== 'todos') {
      query += ' AND t.dsProceso = ?';
      params.push(dsProceso);
    }

    if (dsAccion && dsAccion !== 'todos') {
      query += ' AND t.dsAccion = ?';
      params.push(dsAccion);
    }

    if (cdUsuario && cdUsuario !== 'todos') {
      query += ' AND t.cdUsuario = ?';
      params.push(parseInt(cdUsuario));
    }

    if (dsDetalle && dsDetalle.trim() !== '') {
      query += ' AND t.dsDetalle LIKE ?';
      params.push(`%${dsDetalle}%`);
    }

    query += ' ORDER BY t.feHora DESC LIMIT 1001'; // Traer 1 registro extra para detectar si hay más

    const [trazas] = await pool.execute<any[]>(query, params);

    // Verificar si hay más de 1000 registros
    const limiteSuperado = trazas.length > 1000;
    const trazasRetornar = limiteSuperado ? trazas.slice(0, 1000) : trazas;

    // Obtener listas para los filtros
    const [procesos] = await pool.execute<any[]>(
      'SELECT DISTINCT dsProceso FROM TD_TRAZA ORDER BY dsProceso'
    );

    const [acciones] = await pool.execute<any[]>(
      'SELECT DISTINCT dsAccion FROM TD_TRAZA ORDER BY dsAccion'
    );

    const [usuarios] = await pool.execute<any[]>(
      `SELECT DISTINCT u.cdUsuario, u.dsUsuario 
       FROM TD_TRAZA t
       INNER JOIN TD_USUARIOS u ON t.cdUsuario = u.cdUsuario
       ORDER BY u.dsUsuario`
    );

    return NextResponse.json({
      trazas: trazasRetornar,
      limiteSuperado,
      filtros: {
        procesos: procesos.map(p => p.dsProceso),
        acciones: acciones.map(a => a.dsAccion),
        usuarios: usuarios.map(u => ({ cdUsuario: u.cdUsuario, dsUsuario: u.dsUsuario })),
      },
    });
  } catch (error: any) {
    console.error('Error al consultar trazas:', error);
    return NextResponse.json(
      { error: 'Error al consultar el historial', details: error.message },
      { status: 500 }
    );
  }
}
