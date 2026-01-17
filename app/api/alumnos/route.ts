import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery } from '@/lib/db-utils';
import { registrarTraza } from '@/lib/db-utils';

interface Alumno {
  cdAlumno: number;
  dsNombreCompleto: string;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsSexo: string;
  feNacimiento: string;
  edad: number;
  dsDomicilio: string | null;
  dsTelefonoCelular: string | null;
  dsTelefonoFijo: string | null;
  dsMail: string | null;
  cdGrupoFamiliar: number | null;
  dsGrupoFamiliar: string | null;
  dsEstado: string;
  cdEstado: number;
  talleres: string | null;
  feAlta: string;
}

interface GrupoFamiliar {
  cdGrupoFamiliar: number;
  dsNombreGrupo: string;
  cantidadMiembros: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener alumnos con grupos familiares y talleres inscritos
    const alumnos = await executeQuery<Alumno>(
      `SELECT 
        a.cdAlumno,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as dsNombreCompleto,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        a.dsSexo,
        a.feNacimiento,
        TIMESTAMPDIFF(YEAR, a.feNacimiento, CURDATE()) as edad,
        a.dsDomicilio,
        a.dsTelefonoCelular,
        a.dsTelefonoFijo,
        a.dsMail,
        agf.cdGrupoFamiliar,
        gf.dsNombreGrupo as dsGrupoFamiliar,
        CASE 
          WHEN a.cdEstado = 1 THEN 'Activo'
          WHEN a.cdEstado = 2 THEN 'Inactivo'
          ELSE 'Desconocido'
        END as dsEstado,
        a.cdEstado,
        GROUP_CONCAT(
          DISTINCT tt.dsNombreTaller
          ORDER BY tt.dsNombreTaller
          SEPARATOR ', '
        ) as talleres,
        a.feAlta
       FROM TD_ALUMNOS a
       LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON a.cdAlumno = agf.cdAlumno
       LEFT JOIN TD_GRUPOS_FAMILIARES gf ON agf.cdGrupoFamiliar = gf.cdGrupoFamiliar
       LEFT JOIN tr_inscripcion_alumno ia ON a.cdAlumno = ia.cdAlumno AND ia.cdEstado = 1
       LEFT JOIN TD_TALLERES t ON ia.cdTaller = t.cdTaller
       LEFT JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       WHERE a.cdEstado IN (1, 2)
       GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido, a.dsDNI, a.dsSexo, a.feNacimiento,
                a.dsDomicilio, a.dsTelefonoCelular, a.dsTelefonoFijo, a.dsMail, agf.cdGrupoFamiliar,
                gf.dsNombreGrupo, a.cdEstado, a.feAlta
       ORDER BY a.dsNombre, a.dsApellido ASC`
    );

    // Obtener grupos familiares para el dropdown
    const gruposFamiliares = await executeQuery<GrupoFamiliar>(
      `SELECT 
        gf.cdGrupoFamiliar,
        gf.dsNombreGrupo,
        COUNT(DISTINCT agf.cdAlumno) as cantidadMiembros
       FROM TD_GRUPOS_FAMILIARES gf
       LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON gf.cdGrupoFamiliar = agf.cdGrupoFamiliar
       LEFT JOIN TD_ALUMNOS a ON agf.cdAlumno = a.cdAlumno AND a.cdEstado = 1
       WHERE gf.cdEstado = 1
       GROUP BY gf.cdGrupoFamiliar, gf.dsNombreGrupo
       ORDER BY gf.dsNombreGrupo ASC`
    );

    // Obtener talleres activos para inscripción
    const talleres = await executeQuery<{
      cdTaller: number;
      dsTaller: string;
      dsProfesor: string | null;
    }>(
      `SELECT 
        t.cdTaller,
        tt.dsNombreTaller as dsTaller,
        p.dsNombreCompleto as dsProfesor
       FROM TD_TALLERES t
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       LEFT JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
       WHERE t.cdEstado = 1
       ORDER BY tt.dsNombreTaller`
    );

    return NextResponse.json({
      alumnos,
      gruposFamiliares,
      talleres,
    });
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    return NextResponse.json(
      { error: 'Error al obtener la lista de alumnos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      dsNombre,
      dsApellido,
      dsDNI,
      dsSexo,
      feNacimiento,
      dsDomicilio,
      dsTelefonoCelular,
      dsTelefonoFijo,
      dsMail,
      cdGrupoFamiliar,
      talleres = [],
    } = body;

    // Validaciones
    if (!dsNombre || !dsApellido || !dsDNI || !dsSexo || !feNacimiento) {
      return NextResponse.json(
        { error: 'Nombre, apellido, DNI, sexo y fecha de nacimiento son obligatorios' },
        { status: 400 }
      );
    }

    // Validar que el DNI no esté duplicado
    const existeDNI = await executeQuery(
      'SELECT cdAlumno FROM TD_ALUMNOS WHERE dsDNI = ? AND cdEstado = 1',
      [dsDNI]
    );

    if (existeDNI.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un alumno activo con ese DNI' },
        { status: 400 }
      );
    }

    // Validar fecha de nacimiento
    const fechaNac = new Date(feNacimiento);
    if (fechaNac > new Date()) {
      return NextResponse.json(
        { error: 'La fecha de nacimiento no puede ser futura' },
        { status: 400 }
      );
    }

    // Insertar alumno
    const result = await executeQuery(
      `INSERT INTO TD_ALUMNOS (
        dsNombre,
        dsApellido,
        dsDNI,
        dsSexo,
        feNacimiento,
        dsDomicilio,
        dsTelefonoCelular,
        dsTelefonoFijo,
        dsMail,
        cdEstado,
        feAlta,
        feModificacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        dsNombre,
        dsApellido,
        dsDNI,
        dsSexo,
        feNacimiento,
        dsDomicilio || null,
        dsTelefonoCelular || null,
        dsTelefonoFijo || null,
        dsMail || null,
      ]
    );

    const cdAlumno = (result as any).insertId;

    // Asociar con grupo familiar si se proporcionó
    if (cdGrupoFamiliar) {
      await executeQuery(
        `INSERT INTO TR_ALUMNO_GRUPO_FAMILIAR (
          cdAlumno,
          cdGrupoFamiliar,
          feAsociacion
        ) VALUES (?, ?, NOW())`,
        [cdAlumno, cdGrupoFamiliar]
      );
    }

    // Inscribir en talleres si se seleccionaron
    if (talleres.length > 0) {
      const inscripcionesPromises = talleres.map((cdTaller: number) =>
        executeQuery(
          `INSERT INTO tr_inscripcion_alumno (
            cdAlumno,
            cdTaller,
            feInscripcion,
            cdEstado,
            feCreacion,
            feActualizacion
          ) VALUES (?, ?, NOW(), 1, NOW(), NOW())`,
          [cdAlumno, cdTaller]
        )
      );

      await Promise.all(inscripcionesPromises);
    }

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'TD_ALUMNOS',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdAlumno,
      dsDetalle: JSON.stringify({
        dsNombre,
        dsApellido,
        dsDNI,
        talleres: talleres.length,
      }),
    });

    return NextResponse.json(
      {
        message: 'Alumno creado exitosamente',
        cdAlumno,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear alumno:', error);
    return NextResponse.json(
      { error: 'Error al crear el alumno' },
      { status: 500 }
    );
  }
}
