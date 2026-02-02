import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery } from '@/lib/db-utils';
import { registrarTraza } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

interface GrupoFamiliar {
  cdGrupoFamiliar: number;
  dsNombreGrupo: string;
  dsTelefonoContacto: string | null;
  dsParentesco1: string | null;
  dsMailContacto: string | null;
  dsTelefonoContacto2: string | null;
  dsParentesco2: string | null;
  dsMailContacto2: string | null;
  dsDomicilioFamiliar: string | null;
  dsEstado: string;
  cdEstado: number;
  cantidadMiembros: number;
  miembros: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const grupos = await executeQuery<GrupoFamiliar & RowDataPacket>(
      `SELECT 
        gf.cdGrupoFamiliar,
        gf.dsNombreGrupo,
        gf.dsTelefonoContacto,
        gf.dsParentesco1,
        gf.dsMailContacto,
        gf.dsTelefonoContacto2,
        gf.dsParentesco2,
        gf.dsMailContacto2,
        gf.dsDomicilioFamiliar,
        CASE 
          WHEN gf.cdEstado = 1 THEN 'Activo'
          WHEN gf.cdEstado = 2 THEN 'Inactivo'
          ELSE 'Desconocido'
        END as dsEstado,
        gf.cdEstado,
        COUNT(DISTINCT a.cdAlumno) as cantidadMiembros,
        GROUP_CONCAT(
          DISTINCT CONCAT(a.dsNombre, ' ', a.dsApellido)
          ORDER BY a.dsNombre, a.dsApellido
          SEPARATOR ', '
        ) as miembros
       FROM TD_GRUPOS_FAMILIARES gf
       LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON gf.cdGrupoFamiliar = agf.cdGrupoFamiliar
       LEFT JOIN TD_ALUMNOS a ON agf.cdAlumno = a.cdAlumno AND a.cdEstado = 1
       WHERE gf.cdEstado IN (1, 2)
       GROUP BY gf.cdGrupoFamiliar, gf.dsNombreGrupo, gf.dsTelefonoContacto, gf.dsParentesco1,
                gf.dsMailContacto, gf.dsTelefonoContacto2, gf.dsParentesco2,
                gf.dsMailContacto2, gf.dsDomicilioFamiliar, gf.cdEstado
       ORDER BY gf.dsNombreGrupo ASC`
    );

    return NextResponse.json({ grupos });
  } catch (error) {
    console.error('Error al obtener grupos familiares:', error);
    return NextResponse.json(
      { error: 'Error al obtener la lista de grupos familiares' },
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
      dsNombreGrupo,
      dsTelefonoContacto,
      dsParentesco1,
      dsMailContacto,
      dsTelefonoContacto2,
      dsParentesco2,
      dsMailContacto2,
      dsDomicilioFamiliar,
    } = body;

    if (!dsNombreGrupo) {
      return NextResponse.json(
        { error: 'El nombre del grupo es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que no exista un grupo con el mismo nombre
    const existeGrupo = await executeQuery(
      'SELECT cdGrupoFamiliar FROM TD_GRUPOS_FAMILIARES WHERE dsNombreGrupo = ? AND cdEstado = 1',
      [dsNombreGrupo]
    );

    if (existeGrupo.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un grupo familiar activo con ese nombre' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      `INSERT INTO TD_GRUPOS_FAMILIARES (
        dsNombreGrupo,
        dsTelefonoContacto,
        dsParentesco1,
        dsMailContacto,
        dsTelefonoContacto2,
        dsParentesco2,
        dsMailContacto2,
        dsDomicilioFamiliar,
        cdEstado,
        feCreacion,
        feActualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        dsNombreGrupo,
        dsTelefonoContacto || null,
        dsParentesco1 || null,
        dsMailContacto || null,
        dsTelefonoContacto2 || null,
        dsParentesco2 || null,
        dsMailContacto2 || null,
        dsDomicilioFamiliar || null,
      ]
    );

    const cdGrupoFamiliar = (result as any).insertId;

    await registrarTraza({
      dsProceso: 'TD_GRUPOS_FAMILIARES',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdGrupoFamiliar,
      dsDetalle: JSON.stringify({ dsNombreGrupo }),
    });

    return NextResponse.json(
      {
        message: 'Grupo familiar creado exitosamente',
        cdGrupoFamiliar,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear grupo familiar:', error);
    return NextResponse.json(
      { error: 'Error al crear el grupo familiar' },
      { status: 500 }
    );
  }
}
