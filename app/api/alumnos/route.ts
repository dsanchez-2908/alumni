import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
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

    // Obtener parámetros de búsqueda y paginación
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Obtener filtros avanzados
    const nombre = searchParams.get('nombre');
    const apellido = searchParams.get('apellido');
    const sexo = searchParams.get('sexo');
    const edadOperador = searchParams.get('edadOperador');
    const edadValor = searchParams.get('edadValor');
    const edadValor2 = searchParams.get('edadValor2');
    const tieneDiscapacidad = searchParams.get('tieneDiscapacidad');
    const observacionesDiscapacidad = searchParams.get('observacionesDiscapacidad');
    const observaciones = searchParams.get('observaciones');
    const grupoFamiliar = searchParams.get('grupoFamiliar');
    const tipoTaller = searchParams.get('tipoTaller');
    const estado = searchParams.get('estado');

    // Construir query con filtros opcionales
    let query = `SELECT 
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
       LEFT JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno AND at.feBaja IS NULL
       LEFT JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
       LEFT JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       WHERE 1=1`;

    const params: any[] = [];

    // Filtro de estado
    if (estado) {
      query += ` AND a.cdEstado = ?`;
      params.push(parseInt(estado));
    } else {
      // Si no se especifica estado, mostrar solo activos e inactivos (1 y 2)
      query += ` AND a.cdEstado IN (1, 2)`;
    }

    // Agregar filtro de búsqueda rápida si existe
    if (search) {
      query += ` AND (a.dsNombre LIKE ? OR a.dsApellido LIKE ? OR a.dsDNI LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Agregar filtros avanzados
    if (nombre) {
      query += ` AND a.dsNombre LIKE ?`;
      params.push(`%${nombre}%`);
    }

    if (apellido) {
      query += ` AND a.dsApellido LIKE ?`;
      params.push(`%${apellido}%`);
    }

    if (sexo) {
      query += ` AND a.dsSexo = ?`;
      params.push(sexo);
    }

    if (tieneDiscapacidad) {
      query += ` AND a.snDiscapacidad = ?`;
      params.push(tieneDiscapacidad);
    }

    if (observacionesDiscapacidad) {
      query += ` AND a.dsObservacionesDiscapacidad LIKE ?`;
      params.push(`%${observacionesDiscapacidad}%`);
    }

    if (observaciones) {
      query += ` AND a.dsObservaciones LIKE ?`;
      params.push(`%${observaciones}%`);
    }

    if (grupoFamiliar) {
      query += ` AND agf.cdGrupoFamiliar = ?`;
      params.push(parseInt(grupoFamiliar));
    }

    // Filtro de tipo de taller - buscar alumnos con talleres de ese tipo
    if (tipoTaller) {
      query += ` AND t.cdTipoTaller = ?`;
      params.push(parseInt(tipoTaller));
    }

    query += `
       GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido, a.dsDNI, a.dsSexo, a.feNacimiento,
                a.dsDomicilio, a.dsTelefonoCelular, a.dsTelefonoFijo, a.dsMail, agf.cdGrupoFamiliar,
                gf.dsNombreGrupo, a.cdEstado, a.feAlta`;

    // Aplicar filtro de edad después del GROUP BY usando HAVING
    if (edadOperador && edadValor) {
      if (edadOperador === 'entre' && edadValor2) {
        // Filtro de rango de edad
        query += ` HAVING edad BETWEEN ? AND ?`;
        params.push(parseInt(edadValor), parseInt(edadValor2));
      } else {
        // Filtros de comparación simple
        const operadores: { [key: string]: string } = {
          'igual': '=',
          'mayor': '>',
          'menor': '<',
          'mayorIgual': '>=',
          'menorIgual': '<='
        };
        const operadorSQL = operadores[edadOperador];
        if (operadorSQL) {
          query += ` HAVING edad ${operadorSQL} ?`;
          params.push(parseInt(edadValor));
        }
      }
    }

    // Contar total de registros antes de paginar
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as countTable`;
    const [countResult] = await pool.execute<any[]>(countQuery, params);
    const total = countResult[0].total;

    // Agregar ordenamiento y paginación
    // Concatenar LIMIT y OFFSET directamente ya que son valores controlados (números)
    query += ` ORDER BY a.dsNombre, a.dsApellido ASC`;
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [alumnos] = await pool.execute<any[]>(query, params);


    // Obtener grupos familiares para el dropdown
    const [gruposFamiliares] = await pool.execute<any[]>(
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
    const [talleres] = await pool.execute<any[]>(
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

    // Obtener tipos de talleres para filtros
    const [tiposTalleres] = await pool.execute<any[]>(
      `SELECT DISTINCT 
        cdTipoTaller,
        dsNombreTaller
       FROM TD_TIPO_TALLERES
       WHERE cdEstado = 1
       ORDER BY dsNombreTaller ASC`
    );

    return NextResponse.json({
      alumnos,
      gruposFamiliares,
      talleres,
      tiposTalleres,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
      dsNombreLlamar,
      feNacimiento,
      dsDomicilio,
      dsTelefonoCelular,
      dsTelefonoFijo,
      dsMail,
      dsInstagram,
      dsFacebook,
      dsMailNotificacion,
      dsWhatsappNotificacion,
      snDiscapacidad,
      dsObservacionesDiscapacidad,
      dsObservaciones,
      dsNombreCompletoContacto1,
      dsParentescoContacto1,
      dsDNIContacto1,
      dsTelefonoContacto1,
      dsMailContacto1,
      dsNombreCompletoContacto2,
      dsParentescoContacto2,
      dsDNIContacto2,
      dsTelefonoContacto2,
      dsMailContacto2,
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
    const [existeDNI] = await pool.execute<any[]>(
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
    const [result] = await pool.execute<any>(
      `INSERT INTO TD_ALUMNOS (
        dsNombre,
        dsApellido,
        dsDNI,
        dsSexo,
        dsNombreLlamar,
        feNacimiento,
        dsDomicilio,
        dsTelefonoCelular,
        dsTelefonoFijo,
        dsMail,
        dsInstagram,
        dsFacebook,
        dsMailNotificacion,
        dsWhatsappNotificacion,
        snDiscapacidad,
        dsObservacionesDiscapacidad,
        dsObservaciones,
        dsNombreCompletoContacto1,
        dsParentescoContacto1,
        dsDNIContacto1,
        dsTelefonoContacto1,
        dsMailContacto1,
        dsNombreCompletoContacto2,
        dsParentescoContacto2,
        dsDNIContacto2,
        dsTelefonoContacto2,
        dsMailContacto2,
        cdEstado,
        feAlta,
        feModificacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        dsNombre,
        dsApellido,
        dsDNI,
        dsSexo,
        dsNombreLlamar || null,
        feNacimiento,
        dsDomicilio || null,
        dsTelefonoCelular || null,
        dsTelefonoFijo || null,
        dsMail || null,
        dsInstagram || null,
        dsFacebook || null,
        dsMailNotificacion || null,
        dsWhatsappNotificacion || null,
        snDiscapacidad || 'NO',
        dsObservacionesDiscapacidad || null,
        dsObservaciones || null,
        dsNombreCompletoContacto1 || null,
        dsParentescoContacto1 || null,
        dsDNIContacto1 || null,
        dsTelefonoContacto1 || null,
        dsMailContacto1 || null,
        dsNombreCompletoContacto2 || null,
        dsParentescoContacto2 || null,
        dsDNIContacto2 || null,
        dsTelefonoContacto2 || null,
        dsMailContacto2 || null,
      ]
    );

    const cdAlumno = (result as any).insertId;

    // Asociar con grupo familiar si se proporcionó
    if (cdGrupoFamiliar) {
      await pool.execute(
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
        pool.execute(
          `INSERT INTO TR_ALUMNO_TALLER (
            cdAlumno,
            cdTaller,
            cdEstado,
            feInscripcion
          ) VALUES (?, ?, 1, NOW())`,
          [cdAlumno, cdTaller]
        )
      );

      await Promise.all(inscripcionesPromises);
    }

    // Obtener nombres de talleres para la traza
    let talleresNombres = '';
    if (talleres.length > 0) {
      const [talleresInfo] = await pool.execute<any[]>(
        `SELECT GROUP_CONCAT(CONCAT(tt.dsNombreTaller, ' ', t.nuAnioTaller) SEPARATOR ', ') as nombres
         FROM TD_TALLERES t
         INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
         WHERE t.cdTaller IN (?)`,
        [talleres]
      );
      talleresNombres = talleresInfo[0]?.nombres || '';
    }

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Alumnos',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdAlumno,
      dsDetalle: `${dsNombre} ${dsApellido} | DNI: ${dsDNI} | Talleres: ${talleresNombres || 'Ninguno'}`,
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
