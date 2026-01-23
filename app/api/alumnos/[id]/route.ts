import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery, executeTransaction } from '@/lib/db-utils';
import { registrarTraza } from '@/lib/db-utils';

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

    // Obtener datos del alumno
    const alumno = await executeQuery(
      `SELECT 
        a.cdAlumno,
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
        a.cdEstado
       FROM TD_ALUMNOS a
       LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON a.cdAlumno = agf.cdAlumno
       WHERE a.cdAlumno = ?`,
      [cdAlumno]
    );

    if (alumno.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    // Obtener talleres inscritos
    const talleres = await executeQuery(
      `SELECT cdTaller
       FROM tr_inscripcion_alumno
       WHERE cdAlumno = ? AND cdEstado = 1`,
      [cdAlumno]
    );

    return NextResponse.json({
      alumno: alumno[0],
      talleresIds: talleres.map((t: any) => t.cdTaller),
    });
  } catch (error) {
    console.error('Error al obtener alumno:', error);
    return NextResponse.json(
      { error: 'Error al obtener el alumno' },
      { status: 500 }
    );
  }
}

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
      cdEstado,
    } = body;

    // Validaciones
    if (!dsNombre || !dsApellido || !dsDNI || !dsSexo || !feNacimiento) {
      return NextResponse.json(
        { error: 'Nombre, apellido, DNI, sexo y fecha de nacimiento son obligatorios' },
        { status: 400 }
      );
    }

    // Validar que el DNI no esté duplicado (excepto este alumno)
    const existeDNI = await executeQuery(
      'SELECT cdAlumno FROM TD_ALUMNOS WHERE dsDNI = ? AND cdEstado = 1 AND cdAlumno != ?',
      [dsDNI, cdAlumno]
    );

    if (existeDNI.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe otro alumno activo con ese DNI' },
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

    // Usar transacción para actualizar alumno y talleres
    await executeTransaction(async (connection) => {
      // Actualizar datos del alumno
      await connection.query(
        `UPDATE TD_ALUMNOS SET
          dsNombre = ?,
          dsApellido = ?,
          dsDNI = ?,
          dsSexo = ?,
          feNacimiento = ?,
          dsDomicilio = ?,
          dsTelefonoCelular = ?,
          dsTelefonoFijo = ?,
          dsMail = ?,
          dsNombreCompletoContacto1 = ?,
          dsParentescoContacto1 = ?,
          dsDNIContacto1 = ?,
          dsTelefonoContacto1 = ?,
          dsMailContacto1 = ?,
          dsNombreCompletoContacto2 = ?,
          dsParentescoContacto2 = ?,
          dsDNIContacto2 = ?,
          dsTelefonoContacto2 = ?,
          dsMailContacto2 = ?,
          cdEstado = ?,
          feModificacion = NOW()
         WHERE cdAlumno = ?`,
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
          cdEstado,
          cdAlumno,
        ]
      );

      // Actualizar grupo familiar: eliminar relación existente
      await connection.query(
        `DELETE FROM TR_ALUMNO_GRUPO_FAMILIAR WHERE cdAlumno = ?`,
        [cdAlumno]
      );

      // Crear nueva relación con grupo familiar si se proporcionó
      if (cdGrupoFamiliar) {
        await connection.query(
          `INSERT INTO TR_ALUMNO_GRUPO_FAMILIAR (
            cdAlumno,
            cdGrupoFamiliar,
            feAsociacion
          ) VALUES (?, ?, NOW())`,
          [cdAlumno, cdGrupoFamiliar]
        );
      }

      // Actualizar inscripciones: desactivar todas las existentes
      await connection.query(
        `UPDATE tr_inscripcion_alumno SET cdEstado = 2, feActualizacion = NOW()
         WHERE cdAlumno = ?`,
        [cdAlumno]
      );

      // Crear nuevas inscripciones
      if (talleres.length > 0) {
        const inscripcionesPromises = talleres.map((cdTaller: number) =>
          connection.query(
            `INSERT INTO tr_inscripcion_alumno (
              cdAlumno,
              cdTaller,
              feInscripcion,
              cdEstado,
              feCreacion,
              feActualizacion
            ) VALUES (?, ?, NOW(), 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE cdEstado = 1, feActualizacion = NOW()`,
            [cdAlumno, cdTaller]
          )
        );

        await Promise.all(inscripcionesPromises);
      }
    });

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'TD_ALUMNOS',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdAlumno,
      dsDetalle: JSON.stringify({
        dsNombre,
        dsApellido,
        dsDNI,
        talleres: talleres.length,
      }),
    });

    return NextResponse.json({
      message: 'Alumno actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar alumno:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el alumno' },
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

    const cdAlumno = parseInt(params.id);

    // Soft delete del alumno
    await executeQuery(
      `UPDATE TD_ALUMNOS SET cdEstado = 2, feModificacion = NOW()
       WHERE cdAlumno = ?`,
      [cdAlumno]
    );

    // Desactivar inscripciones
    await executeQuery(
      `UPDATE tr_inscripcion_alumno SET cdEstado = 2, feActualizacion = NOW()
       WHERE cdAlumno = ?`,
      [cdAlumno]
    );

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'TD_ALUMNOS',
      dsAccion: 'Eliminar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdAlumno,
      dsDetalle: JSON.stringify({ cdAlumno }),
    });

    return NextResponse.json({
      message: 'Alumno desactivado exitosamente',
    });
  } catch (error) {
    console.error('Error al desactivar alumno:', error);
    return NextResponse.json(
      { error: 'Error al desactivar el alumno' },
      { status: 500 }
    );
  }
}
