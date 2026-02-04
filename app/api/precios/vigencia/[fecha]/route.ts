import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener todos los precios de una vigencia específica
export async function GET(
  request: NextRequest,
  { params }: { params: { fecha: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const fecha = decodeURIComponent(params.fecha);
    console.log('Buscando precios para fecha:', fecha);

    const query = `
      SELECT 
        p.cdPrecio,
        p.cdUsuarioAlta,
        DATE_FORMAT(p.feAlta, '%Y-%m-%d') as feAlta,
        DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
        p.cdTipoTaller,
        p.nuPrecioCompletoEfectivo,
        p.nuPrecioCompletoTransferencia,
        p.nuPrecioDescuentoEfectivo,
        p.nuPrecioDescuentoTransferencia,
        p.cdEstado,
        tt.dsNombreTaller,
        u.dsNombreCompleto as nombreUsuarioAlta
      FROM TD_PRECIOS_TALLERES p
      INNER JOIN TD_TIPO_TALLERES tt ON p.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
      WHERE p.cdEstado = 1 
        AND DATE(p.feInicioVigencia) = DATE(?)
      ORDER BY tt.dsNombreTaller
    `;

    const [precios] = await pool.execute<any[]>(query, [fecha]);

    console.log('Precios encontrados:', precios.length);
    return NextResponse.json(precios);
  } catch (error: any) {
    console.error('Error al obtener precios de vigencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener precios de vigencia', details: error.message },
      { status: 500 }
    );
  }
}
