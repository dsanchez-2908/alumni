import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// GET - Obtener un taller por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTaller = parseInt(params.id);

    const [talleres] = await pool.execute<any[]>(
      `SELECT 
        t.*,
        e.dsEstado,
        tt.dsNombreTaller,
        tt.dsDescripcionTaller,
        p.dsNombreCompleto as nombrePersonal,
        COUNT(DISTINCT CASE WHEN at.feBaja IS NULL THEN at.cdAlumno END) as cantidadAlumnos
      FROM TD_TALLERES t
      INNER JOIN TD_ESTADOS e ON t.cdEstado = e.cdEstado
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      LEFT JOIN tr_alumno_taller at ON t.cdTaller = at.cdTaller
      WHERE t.cdTaller = ?
      GROUP BY t.cdTaller`,
      [cdTaller]
    );

    if (talleres.length === 0) {
      return NextResponse.json(
        { error: 'Taller no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(talleres[0]);
  } catch (error: any) {
    console.error('Error al obtener taller:', error);
    return NextResponse.json(
      { error: 'Error al obtener taller', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar taller
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTaller = parseInt(params.id);
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
      cdEstado,
    } = body;

    // Validaciones
    if (!nuAnioTaller || !cdTipoTaller || !cdPersonal || !feInicioTaller) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que al menos un día esté seleccionado
    const tieneDias = [snLunes, snMartes, snMiercoles, snJueves, snViernes, snSabado, snDomingo]
      .some(dia => dia === true || dia === 1);
    
    if (!tieneDias) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un día de la semana' },
        { status: 400 }
      );
    }

    await pool.execute(
      `UPDATE TD_TALLERES SET
        nuAnioTaller = ?,
        cdTipoTaller = ?,
        cdPersonal = ?,
        feInicioTaller = ?,
        dsDescripcionHorarios = ?,
        snLunes = ?, dsLunesHoraDesde = ?, dsLunesHoraHasta = ?,
        snMartes = ?, dsMartesHoraDesde = ?, dsMartesHoraHasta = ?,
        snMiercoles = ?, dsMiercolesHoraDesde = ?, dsMiercolesHoraHasta = ?,
        snJueves = ?, dsJuevesHoraDesde = ?, dsJuevesHoraHasta = ?,
        snViernes = ?, dsViernesHoraDesde = ?, dsViernesHoraHasta = ?,
        snSabado = ?, dsSabadoHoraDesde = ?, dsSabadoHoraHasta = ?,
        snDomingo = ?, dsDomingoHoraDesde = ?, dsDomingoHoraHasta = ?,
        cdEstado = ?
      WHERE cdTaller = ?`,
      [
        nuAnioTaller, cdTipoTaller, cdPersonal, feInicioTaller, dsDescripcionHorarios || null,
        snLunes ? 1 : 0, dsLunesHoraDesde || null, dsLunesHoraHasta || null,
        snMartes ? 1 : 0, dsMartesHoraDesde || null, dsMartesHoraHasta || null,
        snMiercoles ? 1 : 0, dsMiercolesHoraDesde || null, dsMiercolesHoraHasta || null,
        snJueves ? 1 : 0, dsJuevesHoraDesde || null, dsJuevesHoraHasta || null,
        snViernes ? 1 : 0, dsViernesHoraDesde || null, dsViernesHoraHasta || null,
        snSabado ? 1 : 0, dsSabadoHoraDesde || null, dsSabadoHoraHasta || null,
        snDomingo ? 1 : 0, dsDomingoHoraDesde || null, dsDomingoHoraHasta || null,
        cdEstado,
        cdTaller,
      ]
    );

    // Registrar traza
    await registrarTraza({
      dsProceso: 'Talleres',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: cdTaller,
      dsDetalle: `Taller actualizado - Año: ${nuAnioTaller}, Tipo: ${cdTipoTaller}`,
    });

    return NextResponse.json({ message: 'Taller actualizado exitosamente' });
  } catch (error: any) {
    console.error('Error al actualizar taller:', error);
    return NextResponse.json(
      { error: 'Error al actualizar taller', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar taller (lógico)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTaller = parseInt(params.id);

    // Verificar si tiene alumnos inscritos
    const [alumnos] = await pool.execute<any[]>(
      'SELECT COUNT(*) as cantidad FROM tr_alumno_taller WHERE cdTaller = ?',
      [cdTaller]
    );

    if (alumnos[0].cantidad > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un taller con alumnos inscritos' },
        { status: 400 }
      );
    }

    // Eliminación lógica
    await pool.execute(
      'UPDATE TD_TALLERES SET cdEstado = 3 WHERE cdTaller = ?',
      [cdTaller]
    );

    // Registrar traza
    await registrarTraza({
      dsProceso: 'Talleres',
      dsAccion: 'Eliminar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: cdTaller,
      dsDetalle: 'Taller eliminado (lógico)',
    });

    return NextResponse.json({ message: 'Taller eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar taller:', error);
    return NextResponse.json(
      { error: 'Error al eliminar taller', details: error.message },
      { status: 500 }
    );
  }
}
