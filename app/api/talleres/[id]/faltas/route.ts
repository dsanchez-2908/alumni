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
    const { fecha, faltas } = await request.json();

    if (!fecha || !Array.isArray(faltas)) {
      return NextResponse.json(
        { error: 'Fecha y faltas son requeridos' },
        { status: 400 }
      );
    }

    const cdUsuario = (session.user as any).cdUsuario;

    // Primero, eliminar todas las faltas existentes para esta fecha y taller
    await pool.execute(
      'DELETE FROM td_asistencias WHERE cdTaller = ? AND feFalta = ?',
      [cdTaller, fecha]
    );

    // Insertar las nuevas faltas
    if (faltas.length > 0) {
      const placeholders = faltas.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
      const values: any[] = [];
      
      faltas.forEach(falta => {
        values.push(
          cdTaller,
          falta.cdAlumno,
          fecha,
          0,  // snPresente = 0 (ausente)
          falta.dsObservacion || null,
          cdUsuario
        );
      });

      await pool.execute(
        `INSERT INTO td_asistencias (cdTaller, cdAlumno, feFalta, snPresente, dsObservacion, cdUsuarioRegistro) 
         VALUES ${placeholders}`,
        values
      );
    }

    await registrarTraza({
      dsProceso: 'Faltas',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: cdTaller,
      dsDetalle: `Asistencia registrada para ${fecha}: ${faltas.length} faltas`,
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
