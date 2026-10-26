import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import { crearLink, obtenerLinkVigente, VIGENCIA_DIAS } from '@/lib/formulario-inscripcion';
import { cambiarEstado, ESTADO_INSCRIPCION } from '@/lib/seguimiento-inscripciones';

const ROLES_PERMITIDOS = ['Administrador', 'Supervisor', 'Operador'];

// GET - Último link vigente del alumno (para abrirlo desde el seguimiento)
export async function GET(
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

    const [miembros] = await pool.execute<any[]>(
      'SELECT cdInscripcionAlumno FROM TD_INSCRIPCIONES_ALUMNOS WHERE cdInscripcionAlumno = ? AND cdInscripcion = ?',
      [parseInt(params.cdInscripcionAlumno), parseInt(params.cdInscripcion)]
    );
    if (miembros.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado en la inscripción' }, { status: 404 });
    }

    const link = await obtenerLinkVigente(pool, miembros[0].cdInscripcionAlumno);
    if (!link) {
      return NextResponse.json(
        { error: 'No hay un link vigente. Genere uno nuevo desde el botón de WhatsApp del detalle del alumno.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(link, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Error al obtener el link del formulario:', error);
    return NextResponse.json(
      { error: 'Error al obtener el link del formulario', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Generar el link del formulario digital para enviarlo por WhatsApp.
// Anula los links anteriores del alumno. Si estaba en "Pendiente de Enviar Formulario" pasa a "Pendiente de Completar".
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

    const [miembros] = await pool.execute<any[]>(
      `SELECT ia.cdInscripcionAlumno, ia.cdEstadoInscripcion, i.nuAnio, i.cdEstado as cdEstadoAnio,
              CONCAT(a.dsApellido, ', ', a.dsNombre) as nombre
       FROM TD_INSCRIPCIONES_ALUMNOS ia
       INNER JOIN TD_INSCRIPCIONES i ON ia.cdInscripcion = i.cdInscripcion
       INNER JOIN TD_ALUMNOS a ON ia.cdAlumno = a.cdAlumno
       WHERE ia.cdInscripcionAlumno = ? AND ia.cdInscripcion = ?`,
      [parseInt(params.cdInscripcionAlumno), parseInt(params.cdInscripcion)]
    );
    if (miembros.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado en la inscripción' }, { status: 404 });
    }
    const miembro = miembros[0];

    if (miembro.cdEstadoAnio !== 1) {
      return NextResponse.json({ error: 'La inscripción está cerrada' }, { status: 400 });
    }
    if (
      ![
        ESTADO_INSCRIPCION.PENDIENTE_ENVIAR_FORMULARIO,
        ESTADO_INSCRIPCION.PENDIENTE_COMPLETAR_FORMULARIO,
      ].includes(miembro.cdEstadoInscripcion)
    ) {
      return NextResponse.json(
        {
          error:
            'El link del formulario solo se puede generar cuando el alumno pagó la inscripción y todavía no completó el formulario.',
        },
        { status: 400 }
      );
    }

    const cdUsuario = (session.user as any).cdUsuario;
    const reenvio = miembro.cdEstadoInscripcion === ESTADO_INSCRIPCION.PENDIENTE_COMPLETAR_FORMULARIO;
    const link = await crearLink(miembro.cdInscripcionAlumno, cdUsuario);

    if (reenvio) {
      await pool.execute(
        `INSERT INTO TD_INSCRIPCIONES_HISTORIAL (cdInscripcionAlumno, dsTipo, dsComentario, cdUsuario)
         VALUES (?, 'Comentario', ?, ?)`,
        [
          miembro.cdInscripcionAlumno,
          'Se generó un nuevo link del formulario digital (el anterior dejó de funcionar)',
          cdUsuario,
        ]
      );
    } else {
      await cambiarEstado(pool, {
        cdInscripcionAlumno: miembro.cdInscripcionAlumno,
        estadoAnterior: miembro.cdEstadoInscripcion,
        estadoNuevo: ESTADO_INSCRIPCION.PENDIENTE_COMPLETAR_FORMULARIO,
        cdUsuario,
        comentario: 'Link del formulario digital generado para enviar por WhatsApp',
      });
    }

    await registrarTraza({
      dsProceso: 'Seguimiento Inscripciones',
      dsAccion: 'Modificar',
      cdUsuario,
      cdElemento: miembro.cdInscripcionAlumno,
      dsDetalle: `${miembro.nombre} | Inscripción ${miembro.nuAnio} | Link del formulario ${reenvio ? 'regenerado' : 'generado'}`,
    });

    return NextResponse.json(
      {
        token: link.token,
        feVencimiento: link.feVencimiento,
        vigenciaDias: VIGENCIA_DIAS,
        nuAnio: miembro.nuAnio,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Error al generar el link del formulario:', error);
    return NextResponse.json(
      { error: 'Error al generar el link del formulario', details: error.message },
      { status: 500 }
    );
  }
}
