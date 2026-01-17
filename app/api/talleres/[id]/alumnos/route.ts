import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

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
        at.feInscripcion,
        at.feBaja,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        a.feNacimiento,
        CASE WHEN at.feBaja IS NULL THEN 'Activo' ELSE 'Inactivo' END as estado
      FROM tr_alumno_taller at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      WHERE at.cdTaller = ?
      ORDER BY at.feBaja IS NULL DESC, a.dsApellido, a.dsNombre`,
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
    const { cdAlumno } = await request.json();

    if (!cdAlumno) {
      return NextResponse.json(
        { error: 'cdAlumno es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya está inscrito
    const [existing] = await pool.execute<any[]>(
      'SELECT id, feBaja FROM tr_alumno_taller WHERE cdAlumno = ? AND cdTaller = ?',
      [cdAlumno, cdTaller]
    );

    if (existing.length > 0) {
      // Si existe pero está dado de baja, reactivarlo
      if (existing[0].feBaja) {
        await pool.execute(
          'UPDATE tr_alumno_taller SET feBaja = NULL WHERE id = ?',
          [existing[0].id]
        );

        await registrarTraza({
          dsProceso: 'Talleres - Alumnos',
          dsAccion: 'Modificar',
          cdUsuario: (session.user as any).cdUsuario,
          cdElemento: existing[0].id,
          dsDetalle: `Alumno ${cdAlumno} reactivado en taller ${cdTaller}`,
        });

        return NextResponse.json({ message: 'Alumno reactivado en el taller' });
      }
      
      return NextResponse.json(
        { error: 'El alumno ya está inscrito en este taller' },
        { status: 400 }
      );
    }

    // Inscribir nuevo alumno
    const [result] = await pool.execute<any>(
      'INSERT INTO tr_alumno_taller (cdAlumno, cdTaller) VALUES (?, ?)',
      [cdAlumno, cdTaller]
    );

    await registrarTraza({
      dsProceso: 'Talleres - Alumnos',
      dsAccion: 'Agregar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: result.insertId,
      dsDetalle: `Alumno ${cdAlumno} inscrito en taller ${cdTaller}`,
    });

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
