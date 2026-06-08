import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza, actualizarEstadoAlumno, verificarDeudasAlumnoInactivo } from '@/lib/db-utils';

// GET - Obtener alumnos del taller
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

    const [alumnos] = await pool.execute<any[]>(
      `SELECT 
        at.id,
        at.cdAlumno,
        at.cdTaller,
        at.cdEstado,
        DATE_FORMAT(at.feInscripcion, '%Y-%m-%d') as feInscripcion,
        DATE_FORMAT(at.feBaja, '%Y-%m-%d') as feBaja,
        DATE_FORMAT(at.feFinalizacion, '%Y-%m-%d') as feFinalizacion,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        DATE_FORMAT(a.feNacimiento, '%Y-%m-%d') as feNacimiento,
        a.snDiscapacidad,
        a.dsObservacionesDiscapacidad,
        a.dsObservaciones,
        e.dsEstado as estado
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
      WHERE at.cdTaller = ?
      ORDER BY at.cdEstado, a.dsApellido, a.dsNombre`,
      [cdTaller]
    );

    return NextResponse.json(alumnos);
  } catch (error: any) {
    console.error('Error al obtener alumnos del taller:', error);
    return NextResponse.json(
      { error: 'Error al obtener alumnos del taller', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Inscribir alumno al taller
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdTaller = parseInt(params.id);
    const { cdAlumno, forzarInscripcion } = await request.json();

    if (!cdAlumno) {
      return NextResponse.json(
        { error: 'cdAlumno es requerido' },
        { status: 400 }
      );
    }

    // Verificar el estado del alumno
    const [alumnoData] = await pool.execute<any[]>(
      'SELECT cdEstado FROM TD_ALUMNOS WHERE cdAlumno = ?',
      [cdAlumno]
    );

    if (alumnoData.length === 0) {
      return NextResponse.json(
        { error: 'Alumno no encontrado' },
        { status: 404 }
      );
    }

    const alumnoEstado = alumnoData[0].cdEstado;

    // Si el alumno está inactivo (cdEstado = 2), verificar deudas
    if (alumnoEstado === 2 && !forzarInscripcion) {
      const deudas = await verificarDeudasAlumnoInactivo(cdAlumno);

      if (deudas.tieneDeudas) {
        const detalleDeudas = deudas.detalles
          .map((d: any) => `  • ${d.taller} - ${d.mes}/${d.anio}: $${d.monto.toFixed(2)}`)
          .join('\n');

        return NextResponse.json({
          advertencia: true,
          tieneDeudas: true,
          mensaje: `El alumno está inactivo y tiene ${deudas.cantidadMeses} mes(es) pendiente(s) de pago en ${deudas.cantidadTalleres} taller(es) por un total de $${deudas.montoTotal.toFixed(2)}. ¿Desea inscribirlo igualmente?`,
          detalles: deudas.detalles,
        }, { status: 200 });
      }
    }

    // Verificar si ya está inscrito
    const [existing] = await pool.execute<any[]>(
      'SELECT id, cdEstado FROM TR_ALUMNO_TALLER WHERE cdAlumno = ? AND cdTaller = ?',
      [cdAlumno, cdTaller]
    );

    if (existing.length > 0) {
      // Si existe pero está inactivo (cdEstado = 2), reactivarlo
      if (existing[0].cdEstado === 2) {
        await pool.execute(
          'UPDATE TR_ALUMNO_TALLER SET cdEstado = 1, feBaja = NULL WHERE id = ?',
          [existing[0].id]
        );

        // Obtener el nombre del alumno y del taller para la traza
        const [alumnoInfo] = await pool.execute<any[]>(
          `SELECT CONCAT(dsNombre, ' ', dsApellido) as nombreCompleto FROM TD_ALUMNOS WHERE cdAlumno = ?`,
          [cdAlumno]
        );
        const [tallerInfo] = await pool.execute<any[]>(
          `SELECT tt.dsNombreTaller, t.nuAnioTaller 
           FROM TD_TALLERES t 
           INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller 
           WHERE t.cdTaller = ?`,
          [cdTaller]
        );
        const nombreAlumno = alumnoInfo[0]?.nombreCompleto || 'Desconocido';
        const nombreTaller = tallerInfo[0] ? `${tallerInfo[0].dsNombreTaller} ${tallerInfo[0].nuAnioTaller}` : 'Desconocido';

        await registrarTraza({
          dsProceso: 'Talleres - Alumnos',
          dsAccion: 'Modificar',
          cdUsuario: (session.user as any).cdUsuario,
          cdElemento: existing[0].id,
          dsDetalle: `${nombreAlumno} reactivado | ${nombreTaller}`,
        });

        // Actualizar estado del alumno a Activo
        await actualizarEstadoAlumno(cdAlumno);

        return NextResponse.json({ message: 'Alumno reactivado en el taller' });
      }
      
      return NextResponse.json(
        { error: 'El alumno ya está inscrito en este taller' },
        { status: 400 }
      );
    }

    // Inscribir nuevo alumno
    const [result] = await pool.execute<any>(
      'INSERT INTO TR_ALUMNO_TALLER (cdAlumno, cdTaller, cdEstado) VALUES (?, ?, 1)',
      [cdAlumno, cdTaller]
    );

    // Obtener el nombre del alumno y del taller para la traza
    const [alumnoInfo] = await pool.execute<any[]>(
      `SELECT CONCAT(dsNombre, ' ', dsApellido) as nombreCompleto FROM TD_ALUMNOS WHERE cdAlumno = ?`,
      [cdAlumno]
    );
    const [tallerInfo] = await pool.execute<any[]>(
      `SELECT tt.dsNombreTaller, t.nuAnioTaller 
       FROM TD_TALLERES t 
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller 
       WHERE t.cdTaller = ?`,
      [cdTaller]
    );
    const nombreAlumno = alumnoInfo[0]?.nombreCompleto || 'Desconocido';
    const nombreTaller = tallerInfo[0] ? `${tallerInfo[0].dsNombreTaller} ${tallerInfo[0].nuAnioTaller}` : 'Desconocido';

    await registrarTraza({
      dsProceso: 'Talleres - Alumnos',
      dsAccion: 'Agregar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: result.insertId,
      dsDetalle: `${nombreAlumno} | ${nombreTaller}`,
    });

    // Actualizar estado del alumno a Activo
    await actualizarEstadoAlumno(cdAlumno);

    return NextResponse.json(
      { message: 'Alumno inscrito exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al inscribir alumno:', error);
    return NextResponse.json(
      { error: 'Error al inscribir alumno', details: error.message },
      { status: 500 }
    );
  }
}
