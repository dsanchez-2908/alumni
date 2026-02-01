import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// GET - Obtener detalle de faltas de un alumno
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
    const currentYear = new Date().getFullYear();

    // Obtener datos completos del alumno
    const [alumnoData] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        a.dsSexo,
        a.dsNombreLlamar,
        a.feNacimiento,
        TIMESTAMPDIFF(YEAR, a.feNacimiento, CURDATE()) as edad,
        a.dsDomicilio,
        a.dsTelefonoCelular,
        a.dsTelefonoFijo,
        a.dsMail,
        a.dsInstagram,
        a.dsFacebook,
        a.dsMailNotificacion,
        a.dsWhatsappNotificacion,
        a.dsNombreCompletoContacto1,
        a.dsParentescoContacto1,
        a.dsTelefonoContacto1,
        a.dsMailContacto1,
        a.dsNombreCompletoContacto2,
        a.dsParentescoContacto2,
        a.dsTelefonoContacto2,
        a.dsMailContacto2
      FROM TD_ALUMNOS a
      WHERE a.cdAlumno = ? AND a.cdEstado = 1`,
      [cdAlumno]
    );

    if (alumnoData.length === 0) {
      return NextResponse.json(
        { error: 'Alumno no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todas las faltas del año actual (sin contactar)
    const [faltas] = await pool.execute<any[]>(
      `SELECT 
        ast.cdFalta,
        t.cdTaller,
        tt.dsNombreTaller,
        ast.feFalta,
        ast.dsObservacion,
        ast.snContactado
      FROM td_asistencias ast
      INNER JOIN TD_TALLERES t ON ast.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE ast.cdAlumno = ?
        AND ast.snPresente = 0
        AND YEAR(ast.feFalta) = ?
        AND t.cdEstado = 1
        AND t.nuAnioTaller = ?
        AND (ast.snContactado IS NULL OR ast.snContactado = 0)
      ORDER BY ast.feFalta DESC`,
      [cdAlumno, currentYear, currentYear]
    );

    return NextResponse.json({
      alumno: alumnoData[0],
      faltas
    });
  } catch (error: any) {
    console.error('Error al obtener detalle de faltas:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalle', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Guardar cambios (observaciones, novedad, contactado)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);
    const { observaciones, novedad, snContactado } = await request.json();

    // Actualizar observaciones de las faltas
    if (observaciones && Array.isArray(observaciones)) {
      for (const obs of observaciones) {
        await pool.execute(
          `UPDATE td_asistencias 
           SET dsObservacion = ?
           WHERE cdFalta = ?`,
          [obs.dsObservacion || null, obs.cdFalta]
        );
      }
    }

    // Si se marcó como contactado, actualizar todas las faltas del alumno
    if (snContactado === true) {
      await pool.execute(
        `UPDATE td_asistencias 
         SET snContactado = 1
         WHERE cdAlumno = ? 
           AND snPresente = 0 
           AND YEAR(feFalta) = ?
           AND (snContactado IS NULL OR snContactado = 0)`,
        [cdAlumno, new Date().getFullYear()]
      );
    }

    // Agregar novedad si se proporcionó
    if (novedad && novedad.trim().length > 0) {
      await pool.execute(
        `INSERT INTO TD_NOVEDADES_ALUMNO 
          (cdAlumno, dsNovedad, cdUsuario, feAlta, cdEstado) 
        VALUES (?, ?, ?, NOW(), 1)`,
        [cdAlumno, novedad.trim(), session.user.cdUsuario]
      );

      await registrarTraza({
        dsProceso: 'Seguimiento Faltas',
        dsAccion: 'Agregar',
        cdUsuario: session.user.cdUsuario,
        cdElemento: cdAlumno,
        dsDetalle: `Novedad registrada: ${snContactado ? 'Contactado' : 'No contactado'} - ${novedad.substring(0, 50)}...`,
      });
    }

    return NextResponse.json({
      message: 'Cambios guardados exitosamente',
      contactado: snContactado === true
    });
  } catch (error: any) {
    console.error('Error al guardar cambios:', error);
    return NextResponse.json(
      { error: 'Error al guardar cambios', details: error.message },
      { status: 500 }
    );
  }
}
