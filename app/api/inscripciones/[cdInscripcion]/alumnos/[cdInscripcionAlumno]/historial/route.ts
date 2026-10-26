import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import {
  cambiarEstado,
  ESTADOS_MANUALES,
  ETIQUETA_ESTADO_INSCRIPCION,
} from '@/lib/seguimiento-inscripciones';
import { getEstadoUltimoLink } from '@/lib/formulario-inscripcion';

const ROLES_PERMITIDOS = ['Administrador', 'Supervisor', 'Operador'];

async function getMiembro(cdInscripcion: number, cdInscripcionAlumno: number) {
  const [rows] = await pool.execute<any[]>(
    `SELECT ia.cdInscripcionAlumno, ia.cdEstadoInscripcion, i.nuAnio, i.cdEstado as cdEstadoInscripcionAnio,
            CONCAT(a.dsApellido, ', ', a.dsNombre) as nombre
     FROM TD_INSCRIPCIONES_ALUMNOS ia
     INNER JOIN TD_INSCRIPCIONES i ON ia.cdInscripcion = i.cdInscripcion
     INNER JOIN TD_ALUMNOS a ON ia.cdAlumno = a.cdAlumno
     WHERE ia.cdInscripcionAlumno = ? AND ia.cdInscripcion = ?`,
    [cdInscripcionAlumno, cdInscripcion]
  );
  return rows[0] || null;
}

// GET - Historial de estados y comentarios del alumno en la inscripción
export async function GET(
  request: NextRequest,
  { params }: { params: { cdInscripcion: string; cdInscripcionAlumno: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const miembro = await getMiembro(
      parseInt(params.cdInscripcion),
      parseInt(params.cdInscripcionAlumno)
    );
    if (!miembro) {
      return NextResponse.json({ error: 'Alumno no encontrado en la inscripción' }, { status: 404 });
    }

    const [historial] = await pool.execute<any[]>(
      `SELECT h.cdHistorial, h.dsTipo, h.cdEstadoAnterior, h.cdEstadoNuevo, h.dsComentario,
              DATE_FORMAT(h.feAlta, '%Y-%m-%d %H:%i:%s') as feAlta,
              u.dsNombreCompleto as nombreUsuario
       FROM TD_INSCRIPCIONES_HISTORIAL h
       LEFT JOIN TD_USUARIOS u ON h.cdUsuario = u.cdUsuario
       WHERE h.cdInscripcionAlumno = ?
       ORDER BY h.feAlta DESC, h.cdHistorial DESC`,
      [miembro.cdInscripcionAlumno]
    );

    return NextResponse.json({
      alumno: miembro.nombre,
      nuAnio: miembro.nuAnio,
      cdEstadoInscripcion: miembro.cdEstadoInscripcion,
      formulario: await getEstadoUltimoLink(pool, miembro.cdInscripcionAlumno),
      historial: historial.map((h) => ({
        ...h,
        dsEstadoAnterior: h.cdEstadoAnterior ? ETIQUETA_ESTADO_INSCRIPCION[h.cdEstadoAnterior] : null,
        dsEstadoNuevo: h.cdEstadoNuevo ? ETIQUETA_ESTADO_INSCRIPCION[h.cdEstadoNuevo] : null,
        automatico: h.nombreUsuario === null,
      })),
    });
  } catch (error: any) {
    console.error('Error al obtener historial de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al obtener el historial', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Dejar un comentario y, opcionalmente, cambiar el estado manualmente
export async function POST(
  request: NextRequest,
  { params }: { params: { cdInscripcion: string; cdInscripcionAlumno: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const roles: string[] = (session.user as any).roles || [];
    if (!roles.some((r) => ROLES_PERMITIDOS.includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const miembro = await getMiembro(
      parseInt(params.cdInscripcion),
      parseInt(params.cdInscripcionAlumno)
    );
    if (!miembro) {
      return NextResponse.json({ error: 'Alumno no encontrado en la inscripción' }, { status: 404 });
    }

    const { cdEstadoNuevo, comentario } = await request.json();
    const texto = typeof comentario === 'string' ? comentario.trim() : '';
    const cdUsuario = (session.user as any).cdUsuario;

    const nuevoEstado = cdEstadoNuevo ? parseInt(cdEstadoNuevo) : null;
    const cambiaEstado = nuevoEstado !== null && nuevoEstado !== miembro.cdEstadoInscripcion;

    if (!cambiaEstado && !texto) {
      return NextResponse.json(
        { error: 'Ingrese un comentario o cambie el estado' },
        { status: 400 }
      );
    }

    if (cambiaEstado) {
      if (miembro.cdEstadoInscripcionAnio !== 1) {
        return NextResponse.json({ error: 'La inscripción está cerrada' }, { status: 400 });
      }
      if (
        !ESTADOS_MANUALES.includes(nuevoEstado!) ||
        !ESTADOS_MANUALES.includes(miembro.cdEstadoInscripcion)
      ) {
        return NextResponse.json(
          {
            error:
              'Solo se puede mover manualmente entre "Pendiente de Enviar Formulario", "Pendiente de Completar Formulario" y "Pendiente de Inscripción". ' +
              'El pago y la inscripción a un taller actualizan el estado automáticamente.',
          },
          { status: 400 }
        );
      }

      await cambiarEstado(pool, {
        cdInscripcionAlumno: miembro.cdInscripcionAlumno,
        estadoAnterior: miembro.cdEstadoInscripcion,
        estadoNuevo: nuevoEstado!,
        cdUsuario,
        comentario: texto || null,
      });
    } else {
      await pool.execute(
        `INSERT INTO TD_INSCRIPCIONES_HISTORIAL (cdInscripcionAlumno, dsTipo, dsComentario, cdUsuario)
         VALUES (?, 'Comentario', ?, ?)`,
        [miembro.cdInscripcionAlumno, texto, cdUsuario]
      );
    }

    await registrarTraza({
      dsProceso: 'Seguimiento Inscripciones',
      dsAccion: 'Modificar',
      cdUsuario,
      cdElemento: miembro.cdInscripcionAlumno,
      dsDetalle: cambiaEstado
        ? `${miembro.nombre} | Inscripción ${miembro.nuAnio} | ${ETIQUETA_ESTADO_INSCRIPCION[miembro.cdEstadoInscripcion]} → ${ETIQUETA_ESTADO_INSCRIPCION[nuevoEstado!]}`
        : `${miembro.nombre} | Inscripción ${miembro.nuAnio} | Comentario`,
    });

    return NextResponse.json({ message: cambiaEstado ? 'Estado actualizado' : 'Comentario registrado' });
  } catch (error: any) {
    console.error('Error al actualizar seguimiento de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el seguimiento', details: error.message },
      { status: 500 }
    );
  }
}
