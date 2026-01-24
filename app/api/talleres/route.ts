import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  cdTipoTaller: number;
  cdPersonal: number;
  feInicioTaller: string;
  dsDescripcionHorarios: string | null;
  snLunes: boolean;
  dsLunesHoraDesde: string | null;
  dsLunesHoraHasta: string | null;
  snMartes: boolean;
  dsMartesHoraDesde: string | null;
  dsMartesHoraHasta: string | null;
  snMiercoles: boolean;
  dsMiercolesHoraDesde: string | null;
  dsMiercolesHoraHasta: string | null;
  snJueves: boolean;
  dsJuevesHoraDesde: string | null;
  dsJuevesHoraHasta: string | null;
  snViernes: boolean;
  dsViernesHoraDesde: string | null;
  dsViernesHoraHasta: string | null;
  snSabado: boolean;
  dsSabadoHoraDesde: string | null;
  dsSabadoHoraHasta: string | null;
  snDomingo: boolean;
  dsDomingoHoraDesde: string | null;
  dsDomingoHoraHasta: string | null;
  cdEstado: number;
  dsEstado: string;
  dsNombreTaller: string;
  nombrePersonal: string;
  cantidadAlumnos: number;
}

// GET - Listar talleres
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [talleres] = await pool.execute<any[]>(`
      SELECT 
        t.*,
        e.dsEstado,
        tt.dsNombreTaller,
        p.dsNombreCompleto as nombrePersonal,
        COUNT(DISTINCT CASE WHEN at.feBaja IS NULL THEN at.cdAlumno END) as cantidadAlumnos
      FROM TD_TALLERES t
      INNER JOIN TD_ESTADOS e ON t.cdEstado = e.cdEstado
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      LEFT JOIN tr_alumno_taller at ON t.cdTaller = at.cdTaller
      WHERE t.cdEstado IN (1, 2, 4)
      GROUP BY t.cdTaller
      ORDER BY t.nuAnioTaller DESC, tt.dsNombreTaller, t.cdTaller
    `);

    return NextResponse.json(talleres);
  } catch (error: any) {
    console.error('Error al obtener talleres:', error);
    return NextResponse.json(
      { error: 'Error al obtener talleres', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear taller
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      nuAnioTaller,
      cdTipoTaller,
      cdPersonal,
      feInicioTaller,
      dsDescripcionHorarios,
      snLunes, dsLunesHoraDesde, dsLunesHoraHasta,
      snMartes, dsMartesHoraDesde, dsMartesHoraHasta,
      snMiercoles, dsMiercolesHoraDesde, dsMiercolesHoraHasta,
      snJueves, dsJuevesHoraDesde, dsJuevesHoraHasta,
      snViernes, dsViernesHoraDesde, dsViernesHoraHasta,
      snSabado, dsSabadoHoraDesde, dsSabadoHoraHasta,
      snDomingo, dsDomingoHoraDesde, dsDomingoHoraHasta,
    } = body;

    // Validaciones
    if (!nuAnioTaller || !cdTipoTaller || !cdPersonal || !feInicioTaller) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que al menos un día esté seleccionado con horarios
    const tieneDias = [snLunes, snMartes, snMiercoles, snJueves, snViernes, snSabado, snDomingo]
      .some(dia => dia === true || dia === 1);
    
    if (!tieneDias) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un día de la semana' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<any>(
      `INSERT INTO TD_TALLERES (
        nuAnioTaller, cdTipoTaller, cdPersonal, feInicioTaller, dsDescripcionHorarios,
        snLunes, dsLunesHoraDesde, dsLunesHoraHasta,
        snMartes, dsMartesHoraDesde, dsMartesHoraHasta,
        snMiercoles, dsMiercolesHoraDesde, dsMiercolesHoraHasta,
        snJueves, dsJuevesHoraDesde, dsJuevesHoraHasta,
        snViernes, dsViernesHoraDesde, dsViernesHoraHasta,
        snSabado, dsSabadoHoraDesde, dsSabadoHoraHasta,
        snDomingo, dsDomingoHoraDesde, dsDomingoHoraHasta,
        cdEstado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nuAnioTaller, cdTipoTaller, cdPersonal, feInicioTaller, dsDescripcionHorarios || null,
        snLunes ? 1 : 0, dsLunesHoraDesde || null, dsLunesHoraHasta || null,
        snMartes ? 1 : 0, dsMartesHoraDesde || null, dsMartesHoraHasta || null,
        snMiercoles ? 1 : 0, dsMiercolesHoraDesde || null, dsMiercolesHoraHasta || null,
        snJueves ? 1 : 0, dsJuevesHoraDesde || null, dsJuevesHoraHasta || null,
        snViernes ? 1 : 0, dsViernesHoraDesde || null, dsViernesHoraHasta || null,
        snSabado ? 1 : 0, dsSabadoHoraDesde || null, dsSabadoHoraHasta || null,
        snDomingo ? 1 : 0, dsDomingoHoraDesde || null, dsDomingoHoraHasta || null,
      ]
    );

    const cdTaller = result.insertId;

    // Registrar traza
    await registrarTraza({
      dsProceso: 'Talleres',
      dsAccion: 'Agregar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: cdTaller,
      dsDetalle: `Taller creado - Año: ${nuAnioTaller}, Tipo: ${cdTipoTaller}`,
    });

    return NextResponse.json(
      { message: 'Taller creado exitosamente', cdTaller },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al crear taller:', error);
    return NextResponse.json(
      { error: 'Error al crear taller', details: error.message },
      { status: 500 }
    );
  }
}
