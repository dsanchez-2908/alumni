import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import { getAnioActual } from '@/lib/inscripciones';
import { crearInscripcion } from '@/lib/seguimiento-inscripciones';

// GET - Listar las inscripciones iniciadas con el resumen por estado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [inscripciones] = await pool.execute<any[]>(
      `SELECT
         i.cdInscripcion,
         i.nuAnio,
         i.cdEstado,
         DATE_FORMAT(i.feAlta, '%Y-%m-%d %H:%i:%s') as feAlta,
         u.dsNombreCompleto as nombreUsuarioAlta,
         COUNT(ia.cdInscripcionAlumno) as cantidadAlumnos,
         COALESCE(SUM(ia.cdEstadoInscripcion >= 2), 0) as pagoInscripcion,
         COALESCE(SUM(ia.cdEstadoInscripcion = 1), 0) as pendientePago,
         COALESCE(SUM(ia.cdEstadoInscripcion = 5), 0) as inscriptos,
         COALESCE(SUM(ia.cdEstadoInscripcion BETWEEN 2 AND 4), 0) as pendienteInscribir
       FROM TD_INSCRIPCIONES i
       LEFT JOIN TD_USUARIOS u ON i.cdUsuarioAlta = u.cdUsuario
       LEFT JOIN TD_INSCRIPCIONES_ALUMNOS ia ON ia.cdInscripcion = i.cdInscripcion
       GROUP BY i.cdInscripcion, i.nuAnio, i.cdEstado, i.feAlta, u.dsNombreCompleto
       ORDER BY i.nuAnio DESC`
    );

    const anioActual = getAnioActual();
    return NextResponse.json({
      anioActual,
      // Años que se pueden iniciar y todavía no tienen inscripción
      aniosDisponibles: [anioActual, anioActual + 1].filter(
        (anio) => !inscripciones.some((i) => i.nuAnio === anio)
      ),
      inscripciones: inscripciones.map((i) => ({
        ...i,
        cantidadAlumnos: Number(i.cantidadAlumnos),
        pagoInscripcion: Number(i.pagoInscripcion),
        pendientePago: Number(i.pendientePago),
        inscriptos: Number(i.inscriptos),
        pendienteInscribir: Number(i.pendienteInscribir),
      })),
    });
  } catch (error: any) {
    console.error('Error al obtener inscripciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener inscripciones', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Iniciar la inscripción de un año
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const roles: string[] = (session.user as any).roles || [];
    if (!roles.some((r) => ['Administrador', 'Supervisor'].includes(r))) {
      return NextResponse.json(
        { error: 'Solo un Administrador o Supervisor puede iniciar una inscripción' },
        { status: 403 }
      );
    }

    const { nuAnio } = await request.json();
    const anio = parseInt(nuAnio);
    const anioActual = getAnioActual();

    if (![anioActual, anioActual + 1].includes(anio)) {
      return NextResponse.json(
        { error: `Solo se puede iniciar la inscripción de ${anioActual} o ${anioActual + 1}` },
        { status: 400 }
      );
    }

    const cdUsuario = (session.user as any).cdUsuario;

    await connection.beginTransaction();
    let resultado;
    try {
      resultado = await crearInscripcion(connection, { nuAnio: anio, cdUsuario });
    } catch (dbError: any) {
      await connection.rollback();
      if (dbError.code === 'ER_DUP_ENTRY') {
        return NextResponse.json(
          { error: `Ya existe una inscripción iniciada para el año ${anio}` },
          { status: 409 }
        );
      }
      throw dbError;
    }
    await connection.commit();

    await registrarTraza({
      dsProceso: 'Seguimiento Inscripciones',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: resultado.cdInscripcion,
      dsDetalle: `Inscripción ${anio} iniciada con ${resultado.cantidadAlumnos} alumnos activos`,
    });

    return NextResponse.json(
      { message: `Inscripción ${anio} iniciada`, ...resultado },
      { status: 201 }
    );
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {
      // Sin transacción abierta
    }
    console.error('Error al iniciar inscripción:', error);
    return NextResponse.json(
      { error: 'Error al iniciar la inscripción', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
