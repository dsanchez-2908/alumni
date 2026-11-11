import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import {
  ETIQUETA_ESTADO_INSCRIPCION,
  getTalleresDeLaInscripcion,
} from '@/lib/seguimiento-inscripciones';
import { SQL_LINK_VIGENTE } from '@/lib/formulario-inscripcion';

const MAX_MENSAJE = 1000;

// PUT - Mensaje que se muestra al alumno en el formulario digital de esta inscripción
export async function PUT(
  request: NextRequest,
  { params }: { params: { cdInscripcion: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const roles: string[] = (session.user as any).roles || [];
    if (!roles.some((r) => ['Administrador', 'Supervisor'].includes(r))) {
      return NextResponse.json(
        { error: 'Solo un Administrador o Supervisor puede modificar el mensaje del formulario' },
        { status: 403 }
      );
    }

    const cdInscripcion = parseInt(params.cdInscripcion);
    const { dsMensajeFormulario } = await request.json();
    if (dsMensajeFormulario !== null && typeof dsMensajeFormulario !== 'string') {
      return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });
    }

    const mensaje = (dsMensajeFormulario || '').trim();
    if (mensaje.length > MAX_MENSAJE) {
      return NextResponse.json(
        { error: `El mensaje puede tener hasta ${MAX_MENSAJE} caracteres` },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<any>(
      'UPDATE TD_INSCRIPCIONES SET dsMensajeFormulario = ? WHERE cdInscripcion = ?',
      [mensaje || null, cdInscripcion]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }

    await registrarTraza({
      dsProceso: 'Seguimiento Inscripciones',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: cdInscripcion,
      dsDetalle: 'Mensaje del formulario digital actualizado',
    });

    return NextResponse.json({ message: 'Mensaje del formulario guardado', dsMensajeFormulario: mensaje || null });
  } catch (error: any) {
    console.error('Error al guardar el mensaje del formulario:', error);
    return NextResponse.json(
      { error: 'Error al guardar el mensaje del formulario', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Cerrar o reabrir la inscripción de un año (solo Administrador o Supervisor).
// Al cerrarla ya no se puede pagar la inscripción de ese año como "año próximo", los links del formulario
// digital dejan de funcionar y no se pueden agregar alumnos ni cambiar estados; la información queda de consulta.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { cdInscripcion: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const roles: string[] = (session.user as any).roles || [];
    if (!roles.some((r) => ['Administrador', 'Supervisor'].includes(r))) {
      return NextResponse.json(
        { error: 'Solo un Administrador o Supervisor puede cerrar o reabrir una inscripción' },
        { status: 403 }
      );
    }

    const cdInscripcion = parseInt(params.cdInscripcion);
    const { accion } = await request.json();
    if (accion !== 'cerrar' && accion !== 'reabrir') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const [rows] = await pool.execute<any[]>(
      'SELECT cdInscripcion, nuAnio, cdEstado FROM TD_INSCRIPCIONES WHERE cdInscripcion = ?',
      [cdInscripcion]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }
    const inscripcion = rows[0];

    const estadoNuevo = accion === 'cerrar' ? 2 : 1;
    if (inscripcion.cdEstado === estadoNuevo) {
      return NextResponse.json(
        { error: `La inscripción ${inscripcion.nuAnio} ya está ${accion === 'cerrar' ? 'cerrada' : 'abierta'}` },
        { status: 400 }
      );
    }

    await pool.execute('UPDATE TD_INSCRIPCIONES SET cdEstado = ? WHERE cdInscripcion = ?', [
      estadoNuevo,
      cdInscripcion,
    ]);

    await registrarTraza({
      dsProceso: 'Seguimiento Inscripciones',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: cdInscripcion,
      dsDetalle: `Inscripción ${inscripcion.nuAnio} ${accion === 'cerrar' ? 'cerrada' : 'reabierta'}`,
    });

    return NextResponse.json({
      message: `Inscripción ${inscripcion.nuAnio} ${accion === 'cerrar' ? 'cerrada' : 'reabierta'}`,
      cdEstado: estadoNuevo,
    });
  } catch (error: any) {
    console.error('Error al cerrar/reabrir la inscripción:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la inscripción', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Detalle de la inscripción de un año: todos sus alumnos con estado, talleres actuales y talleres del año
export async function GET(
  request: NextRequest,
  { params }: { params: { cdInscripcion: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdInscripcion = parseInt(params.cdInscripcion);

    const [inscripciones] = await pool.execute<any[]>(
      `SELECT i.cdInscripcion, i.nuAnio, i.cdEstado, i.dsMensajeFormulario,
              DATE_FORMAT(i.feAlta, '%Y-%m-%d %H:%i:%s') as feAlta
       FROM TD_INSCRIPCIONES i
       WHERE i.cdInscripcion = ?`,
      [cdInscripcion]
    );
    if (inscripciones.length === 0) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }
    const inscripcion = inscripciones[0];

    const [alumnos] = await pool.execute<any[]>(
      `SELECT
         ia.cdInscripcionAlumno,
         ia.cdAlumno,
         ia.cdEstadoInscripcion,
         ia.snAgregadoManual,
         EXISTS (
           SELECT 1 FROM TD_INSCRIPCIONES_FORMULARIOS f
           WHERE f.cdInscripcionAlumno = ia.cdInscripcionAlumno AND ${SQL_LINK_VIGENTE('f')}
         ) as linkVigente,
         DATE_FORMAT(ia.feCambioEstado, '%Y-%m-%d %H:%i:%s') as feCambioEstado,
         a.dsNombre,
         a.dsApellido,
         a.dsDNI,
         a.cdEstado as cdEstadoAlumno,
         TIMESTAMPDIFF(YEAR, a.feNacimiento, CURDATE()) as edad,
         agf.cdGrupoFamiliar,
         gf.dsNombreGrupo as grupoFamiliar,
         (SELECT h.dsComentario
            FROM TD_INSCRIPCIONES_HISTORIAL h
            WHERE h.cdInscripcionAlumno = ia.cdInscripcionAlumno
              AND h.dsComentario IS NOT NULL AND h.dsComentario <> ''
            ORDER BY h.feAlta DESC, h.cdHistorial DESC
            LIMIT 1) as ultimoComentario
       FROM TD_INSCRIPCIONES_ALUMNOS ia
       INNER JOIN TD_ALUMNOS a ON ia.cdAlumno = a.cdAlumno
       LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON agf.cdAlumno = a.cdAlumno
       LEFT JOIN TD_GRUPOS_FAMILIARES gf ON agf.cdGrupoFamiliar = gf.cdGrupoFamiliar
       WHERE ia.cdInscripcion = ?
       ORDER BY a.dsApellido, a.dsNombre`,
      [cdInscripcion]
    );

    const { actuales, inscriptos } = await getTalleresDeLaInscripcion(
      pool,
      cdInscripcion,
      inscripcion.nuAnio
    );

    // Un alumno en más de un grupo familiar aparece una sola vez
    const vistos = new Set<number>();
    const filas = alumnos
      .filter((a) => {
        if (vistos.has(a.cdAlumno)) return false;
        vistos.add(a.cdAlumno);
        return true;
      })
      .map((a) => ({
        cdInscripcionAlumno: a.cdInscripcionAlumno,
        cdAlumno: a.cdAlumno,
        cdEstadoInscripcion: a.cdEstadoInscripcion,
        dsEstadoInscripcion: ETIQUETA_ESTADO_INSCRIPCION[a.cdEstadoInscripcion],
        snAgregadoManual: Number(a.snAgregadoManual) === 1,
        linkVigente: Number(a.linkVigente) === 1,
        feCambioEstado: a.feCambioEstado,
        nombreCompleto: `${a.dsApellido}, ${a.dsNombre}`,
        dsDNI: a.dsDNI,
        alumnoInactivo: a.cdEstadoAlumno !== 1,
        edad: a.edad,
        cdGrupoFamiliar: a.cdGrupoFamiliar,
        grupoFamiliar: a.grupoFamiliar,
        ultimoComentario: a.ultimoComentario,
        talleresActuales: actuales.get(a.cdAlumno) || [],
        talleresInscripto: inscriptos.get(a.cdAlumno) || [],
      }));

    const resumen: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filas.forEach((f) => (resumen[f.cdEstadoInscripcion] += 1));

    return NextResponse.json({ inscripcion, resumen, total: filas.length, alumnos: filas });
  } catch (error: any) {
    console.error('Error al obtener detalle de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al obtener el detalle de la inscripción', details: error.message },
      { status: 500 }
    );
  }
}
