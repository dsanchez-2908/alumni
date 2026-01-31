import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// GET - Obtener todas las novedades de un alumno
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);

    const [novedades] = await pool.execute<any[]>(
      `SELECT 
        n.cdNovedad,
        n.dsNovedad,
        n.feAlta,
        n.cdUsuario,
        u.dsUsuario as nombreUsuario,
        COALESCE(p.dsNombreCompleto, u.dsNombreCompleto) as nombreCompleto
      FROM TD_NOVEDADES_ALUMNO n
      INNER JOIN TD_USUARIOS u ON n.cdUsuario = u.cdUsuario
      LEFT JOIN TD_PERSONAL p ON u.cdPersonal = p.cdPersonal
      WHERE n.cdAlumno = ? AND n.cdEstado = 1
      ORDER BY n.feAlta DESC`,
      [cdAlumno]
    );

    return NextResponse.json({ novedades });
  } catch (error: any) {
    console.error('Error al obtener novedades:', error);
    return NextResponse.json(
      { error: 'Error al obtener las novedades', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva novedad
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);
    const { dsNovedad } = await request.json();

    if (!dsNovedad || dsNovedad.trim().length === 0) {
      return NextResponse.json(
        { error: 'La novedad no puede estar vacía' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<any>(
      `INSERT INTO TD_NOVEDADES_ALUMNO 
        (cdAlumno, dsNovedad, cdUsuario, feAlta, cdEstado) 
      VALUES (?, ?, ?, NOW(), 1)`,
      [cdAlumno, dsNovedad.trim(), session.user.cdUsuario]
    );

    await registrarTraza({
      dsProceso: 'TD_NOVEDADES_ALUMNO',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: result.insertId,
      dsDetalle: JSON.stringify({ cdAlumno, dsNovedad: dsNovedad.trim() }),
    });

    return NextResponse.json({
      message: 'Novedad registrada exitosamente',
      cdNovedad: result.insertId
    });
  } catch (error: any) {
    console.error('Error al crear novedad:', error);
    return NextResponse.json(
      { error: 'Error al crear la novedad', details: error.message },
      { status: 500 }
    );
  }
}
