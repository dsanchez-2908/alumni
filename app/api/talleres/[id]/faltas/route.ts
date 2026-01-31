import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// GET - Obtener faltas del taller por fecha
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
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha es requerida' },
        { status: 400 }
      );
    }

    // Obtener todos los alumnos activos del taller
    const [alumnos] = await pool.execute<any[]>(
      `SELECT 
        at.id as inscripcionId,
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        f.cdFalta,
        f.snPresente,
        f.dsObservacion
      FROM tr_alumno_taller at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      LEFT JOIN td_asistencias f ON at.cdAlumno = f.cdAlumno 
        AND at.cdTaller = f.cdTaller 
        AND f.feFalta = ?
      WHERE at.cdTaller = ? 
        AND at.feBaja IS NULL
      ORDER BY a.dsApellido, a.dsNombre`,
      [fecha, cdTaller]
    );

    return NextResponse.json(alumnos);
  } catch (error: any) {
    console.error('Error al obtener asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener asistencia', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Registrar faltas masivamente
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
    const { fecha, faltas, esFeriado } = await request.json();

    if (!fecha || !Array.isArray(faltas)) {
      return NextResponse.json(
        { error: 'Fecha y faltas son requeridos' },
        { status: 400 }
      );
    }

    const cdUsuario = (session.user as any).cdUsuario;

    // Obtener todos los alumnos activos del taller
    const [alumnos] = await pool.execute<any[]>(
      `SELECT a.cdAlumno
       FROM tr_alumno_taller at
       INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
       WHERE at.cdTaller = ? 
         AND at.feBaja IS NULL`,
      [cdTaller]
    );

    // Primero, eliminar todas las asistencias existentes para esta fecha y taller
    await pool.execute(
      'DELETE FROM td_asistencias WHERE cdTaller = ? AND feFalta = ?',
      [cdTaller, fecha]
    );

    // Crear un Set con los cdAlumno que faltaron para búsqueda rápida
    const alumnosAusentes = new Set(faltas.map(f => f.cdAlumno));

    // Preparar datos para insertar TODOS los alumnos
    const placeholders = alumnos.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
    const values: any[] = [];
    
    alumnos.forEach((alumno: any) => {
      const faltaInfo = faltas.find(f => f.cdAlumno === alumno.cdAlumno);
      let snPresente = alumnosAusentes.has(alumno.cdAlumno) ? 0 : 1;
      
      // Si es feriado y el alumno está ausente, usar 3 en lugar de 0
      if (esFeriado && snPresente === 0) {
        snPresente = 3;
      }
      
      values.push(
        cdTaller,
        alumno.cdAlumno,
        fecha,
        snPresente,  // 0 = ausente, 1 = presente, 3 = feriado
        faltaInfo?.dsObservacion || null,
        cdUsuario
      );
    });

    // Insertar asistencia de TODOS los alumnos
    if (values.length > 0) {
      await pool.execute(
        `INSERT INTO td_asistencias (cdTaller, cdAlumno, feFalta, snPresente, dsObservacion, cdUsuarioRegistro) 
         VALUES ${placeholders}`,
        values
      );
    }

    const totalPresentes = alumnos.length - faltas.length;

    await registrarTraza({
      dsProceso: 'Asistencias',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: cdTaller,
      dsDetalle: esFeriado 
        ? `Feriado registrado para ${fecha}: ${alumnos.length} alumnos marcados como ausentes por feriado`
        : `Asistencia registrada para ${fecha}: ${totalPresentes} presentes, ${faltas.length} ausentes`,
    });

    return NextResponse.json(
      { message: 'Asistencia registrada exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json(
      { error: 'Error al registrar asistencia', details: error.message },
      { status: 500 }
    );
  }
}
