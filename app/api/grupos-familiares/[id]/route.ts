import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery } from '@/lib/db-utils';
import { registrarTraza } from '@/lib/db-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdGrupoFamiliar = parseInt(params.id);
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
      cdEstado,
    } = body;

    if (!dsNombreGrupo) {
      return NextResponse.json(
        { error: 'El nombre del grupo es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que no exista otro grupo con el mismo nombre
    const existeGrupo = await executeQuery(
      'SELECT cdGrupoFamiliar FROM TD_GRUPOS_FAMILIARES WHERE dsNombreGrupo = ? AND cdEstado = 1 AND cdGrupoFamiliar != ?',
      [dsNombreGrupo, cdGrupoFamiliar]
    );

    if (existeGrupo.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe otro grupo familiar activo con ese nombre' },
        { status: 400 }
      );
    }

    await executeQuery(
      `UPDATE TD_GRUPOS_FAMILIARES SET
        dsNombreGrupo = ?,
        dsTelefonoContacto = ?,
        dsParentesco1 = ?,
        dsMailContacto = ?,
        dsTelefonoContacto2 = ?,
        dsParentesco2 = ?,
        dsMailContacto2 = ?,
        dsDomicilioFamiliar = ?,
        cdEstado = ?,
        feActualizacion = NOW()
       WHERE cdGrupoFamiliar = ?`,
      [
        dsNombreGrupo,
        dsTelefonoContacto || null,
        dsParentesco1 || null,
        dsMailContacto || null,
        dsTelefonoContacto2 || null,
        dsParentesco2 || null,
        dsMailContacto2 || null,
        dsDomicilioFamiliar || null,
        cdEstado,
        cdGrupoFamiliar,
      ]
    );

    await registrarTraza({
      dsProceso: 'TD_GRUPOS_FAMILIARES',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdGrupoFamiliar,
      dsDetalle: JSON.stringify({ dsNombreGrupo }),
    });

    return NextResponse.json({
      message: 'Grupo familiar actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar grupo familiar:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el grupo familiar' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdGrupoFamiliar = parseInt(params.id);

    // Verificar si tiene alumnos asociados
    const alumnos = await executeQuery(
      'SELECT COUNT(*) as total FROM TD_ALUMNOS WHERE cdGrupoFamiliar = ? AND cdEstado = 1',
      [cdGrupoFamiliar]
    );

    if ((alumnos[0] as any).total > 0) {
      return NextResponse.json(
        { error: 'No se puede desactivar un grupo familiar con alumnos activos asociados' },
        { status: 400 }
      );
    }

    await executeQuery(
      `UPDATE TD_GRUPOS_FAMILIARES SET cdEstado = 2, feActualizacion = NOW()
       WHERE cdGrupoFamiliar = ?`,
      [cdGrupoFamiliar]
    );

    await registrarTraza({
      dsProceso: 'TD_GRUPOS_FAMILIARES',
      dsAccion: 'Eliminar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdGrupoFamiliar,
      dsDetalle: JSON.stringify({ cdGrupoFamiliar }),
    });

    return NextResponse.json({
      message: 'Grupo familiar desactivado exitosamente',
    });
  } catch (error) {
    console.error('Error al desactivar grupo familiar:', error);
    return NextResponse.json(
      { error: 'Error al desactivar el grupo familiar' },
      { status: 500 }
    );
  }
}
