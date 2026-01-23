import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// GET - Listar vigencias agrupadas o precios individuales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cdTipoTaller = searchParams.get('cdTipoTaller');
    const vigente = searchParams.get('vigente'); // 'true' para obtener solo precios vigentes
    const agrupado = searchParams.get('agrupado'); // 'true' para obtener vigencias agrupadas

    // Si se solicita agrupado, devolver lista de vigencias
    if (agrupado === 'true') {
      const query = `
        SELECT 
          DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
          u.dsNombreCompleto as nombreUsuarioAlta,
          MIN(DATE_FORMAT(p.feAlta, '%Y-%m-%d')) as feAlta,
          COUNT(DISTINCT p.cdTipoTaller) as cantidadTalleres
        FROM TD_PRECIOS_TALLERES p
        LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
        WHERE p.cdEstado = 1
        GROUP BY DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d'), u.dsNombreCompleto
        ORDER BY DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') DESC
      `;
      
      const [vigencias] = await pool.execute<any[]>(query);
      return NextResponse.json(vigencias);
    }

    // Consulta normal de precios individuales
    let query = `
      SELECT 
        p.*,
        tt.dsNombreTaller,
        u.dsNombreCompleto as nombreUsuarioAlta
      FROM TD_PRECIOS_TALLERES p
      INNER JOIN td_tipo_talleres tt ON p.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
      WHERE p.cdEstado = 1
    `;

    const params: any[] = [];

    if (cdTipoTaller) {
      query += ' AND p.cdTipoTaller = ?';
      params.push(parseInt(cdTipoTaller));
    }

    if (vigente === 'true') {
      query += ' AND p.feInicioVigencia <= CURDATE()';
    }

    query += ' ORDER BY p.feInicioVigencia DESC, tt.dsNombreTaller';

    const [precios] = await pool.execute<any[]>(query, params);

    return NextResponse.json(precios);
  } catch (error: any) {
    console.error('Error al obtener precios:', error);
    return NextResponse.json(
      { error: 'Error al obtener precios', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear precio(s) - soporta creación masiva
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const cdUsuario = (session.user as any).cdUsuario;

    // Verificar si es registro masivo (array) o individual (objeto)
    const precios = Array.isArray(body) ? body : [body];

    // Validaciones
    for (const precio of precios) {
      const {
        feInicioVigencia,
        cdTipoTaller,
        nuPrecioCompletoEfectivo,
        nuPrecioCompletoTransferencia,
        nuPrecioDescuentoEfectivo,
        nuPrecioDescuentoTransferencia,
      } = precio;

      if (!feInicioVigencia || !cdTipoTaller) {
        return NextResponse.json(
          { error: 'Fecha de vigencia y tipo de taller son requeridos' },
          { status: 400 }
        );
      }

      if (!nuPrecioCompletoEfectivo || !nuPrecioCompletoTransferencia ||
          !nuPrecioDescuentoEfectivo || !nuPrecioDescuentoTransferencia) {
        return NextResponse.json(
          { error: 'Todos los precios son requeridos' },
          { status: 400 }
        );
      }
    }

    // Insertar todos los precios
    const insertedIds = [];
    for (const precio of precios) {
      const {
        feInicioVigencia,
        cdTipoTaller,
        nuPrecioCompletoEfectivo,
        nuPrecioCompletoTransferencia,
        nuPrecioDescuentoEfectivo,
        nuPrecioDescuentoTransferencia,
      } = precio;

      const [result] = await pool.execute<any>(
        `INSERT INTO TD_PRECIOS_TALLERES (
          cdUsuarioAlta,
          feInicioVigencia,
          cdTipoTaller,
          nuPrecioCompletoEfectivo,
          nuPrecioCompletoTransferencia,
          nuPrecioDescuentoEfectivo,
          nuPrecioDescuentoTransferencia,
          cdEstado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          cdUsuario,
          feInicioVigencia,
          cdTipoTaller,
          nuPrecioCompletoEfectivo,
          nuPrecioCompletoTransferencia,
          nuPrecioDescuentoEfectivo,
          nuPrecioDescuentoTransferencia,
        ]
      );

      insertedIds.push(result.insertId);
    }

    await registrarTraza({
      dsProceso: 'Precios',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: insertedIds[0],
      dsDetalle: `${precios.length} precio(s) creado(s) vigente desde ${precios[0].feInicioVigencia}`,
    });

    return NextResponse.json(
      { 
        message: `${precios.length} precio(s) creado(s) exitosamente`, 
        insertedIds 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al crear precio:', error);
    return NextResponse.json(
      { error: 'Error al crear precio', details: error.message },
      { status: 500 }
    );
  }
}
