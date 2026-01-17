import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery, insert, registrarTraza } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// GET - Obtener todos los tipos de talleres
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tiposTalleres = await executeQuery<RowDataPacket>(
      `SELECT 
        tt.cdTipoTaller,
        tt.dsNombreTaller,
        tt.dsDescripcionTaller,
        tt.nuEdadDesde,
        tt.nuEdadHasta,
        tt.cdEstado,
        e.dsEstado,
        tt.feCreacion
      FROM TD_TIPO_TALLERES tt
      INNER JOIN TD_ESTADOS e ON tt.cdEstado = e.cdEstado
      ORDER BY tt.dsNombreTaller`
    );

    return NextResponse.json({ tiposTalleres });
  } catch (error) {
    console.error('Error en GET /api/tipo-talleres:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de talleres' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo tipo de taller
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validaciones
    if (!data.dsNombreTaller) {
      return NextResponse.json(
        { error: 'El nombre del taller es requerido' },
        { status: 400 }
      );
    }

    if (data.nuEdadDesde && data.nuEdadHasta && data.nuEdadDesde > data.nuEdadHasta) {
      return NextResponse.json(
        { error: 'La edad desde no puede ser mayor que la edad hasta' },
        { status: 400 }
      );
    }

    const cdTipoTaller = await insert('TD_TIPO_TALLERES', {
      dsNombreTaller: data.dsNombreTaller,
      dsDescripcionTaller: data.dsDescripcionTaller || null,
      nuEdadDesde: data.nuEdadDesde || null,
      nuEdadHasta: data.nuEdadHasta || null,
      cdEstado: data.cdEstado || 1,
    });

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Tipo de Taller',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdTipoTaller,
      dsDetalle: `Tipo de taller creado: ${data.dsNombreTaller}`,
    });

    return NextResponse.json({ 
      success: true, 
      cdTipoTaller,
      message: 'Tipo de taller creado exitosamente' 
    });
  } catch (error: any) {
    console.error('Error en POST /api/tipo-talleres:', error);
    
    return NextResponse.json(
      { error: 'Error al crear tipo de taller' },
      { status: 500 }
    );
  }
}
