import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import {
  agregarAlumnoAInscripcion,
  ETIQUETA_ESTADO_INSCRIPCION,
} from '@/lib/seguimiento-inscripciones';

const ROLES_PERMITIDOS = ['Administrador', 'Supervisor', 'Operador'];

// POST - Agregar a la inscripción un alumno que no estaba (ej: dado de alta después del inicio)
export async function POST(
  request: NextRequest,
  { params }: { params: { cdInscripcion: string } }
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

    const cdInscripcion = parseInt(params.cdInscripcion);
    const { cdAlumno } = await request.json();
    if (!cdAlumno) {
      return NextResponse.json({ error: 'El alumno es requerido' }, { status: 400 });
    }

    const [inscripciones] = await pool.execute<any[]>(
      'SELECT cdInscripcion, nuAnio, cdEstado FROM TD_INSCRIPCIONES WHERE cdInscripcion = ?',
      [cdInscripcion]
    );
    if (inscripciones.length === 0) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }
    if (inscripciones[0].cdEstado !== 1) {
      return NextResponse.json({ error: 'La inscripción está cerrada' }, { status: 400 });
    }

    const [alumnos] = await pool.execute<any[]>(
      `SELECT CONCAT(dsApellido, ', ', dsNombre) as nombre FROM TD_ALUMNOS WHERE cdAlumno = ? AND cdEstado IN (1, 2)`,
      [cdAlumno]
    );
    if (alumnos.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const cdUsuario = (session.user as any).cdUsuario;
    const agregado = await agregarAlumnoAInscripcion(pool, {
      cdInscripcion,
      nuAnio: inscripciones[0].nuAnio,
      cdAlumno,
      cdUsuario,
      comentario: 'Agregado manualmente a la inscripción',
    });

    if (!agregado) {
      return NextResponse.json(
        { error: `${alumnos[0].nombre} ya está en la inscripción ${inscripciones[0].nuAnio}` },
        { status: 409 }
      );
    }

    await registrarTraza({
      dsProceso: 'Seguimiento Inscripciones',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: agregado.cdInscripcionAlumno,
      dsDetalle: `${alumnos[0].nombre} | Inscripción ${inscripciones[0].nuAnio} | ${ETIQUETA_ESTADO_INSCRIPCION[agregado.cdEstadoInscripcion]}`,
    });

    return NextResponse.json(
      {
        message: 'Alumno agregado a la inscripción',
        cdEstadoInscripcion: agregado.cdEstadoInscripcion,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al agregar alumno a la inscripción:', error);
    return NextResponse.json(
      { error: 'Error al agregar el alumno a la inscripción', details: error.message },
      { status: 500 }
    );
  }
}
