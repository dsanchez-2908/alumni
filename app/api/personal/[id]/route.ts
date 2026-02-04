import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { softDelete, registrarTraza } from '@/lib/db-utils';
import pool from '@/lib/db';

// PUT - Actualizar personal
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdPersonal = parseInt(params.id);
    const data = await request.json();

    // Validaciones
    if (!data.dsNombreCompleto) {
      return NextResponse.json(
        { error: 'El nombre completo es requerido' },
        { status: 400 }
      );
    }

    if (data.dsTipoPersonal === 'Profesor' && (!data.talleres || data.talleres.length === 0)) {
      return NextResponse.json(
        { error: 'Debe asignar al menos un taller para un profesor' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // Actualizar personal
    await connection.execute(
      `UPDATE TD_PERSONAL 
       SET dsNombreCompleto = ?, dsTipoPersonal = ?, dsDescripcionPuesto = ?, 
           dsDomicilio = ?, dsTelefono = ?, dsMail = ?, feNacimiento = ?, dsDni = ?, dsCuil = ?, 
           dsEntidad = ?, dsCbuCvu = ?, dsObservaciones = ?, cdEstado = ?
       WHERE cdPersonal = ?`,
      [
        data.dsNombreCompleto,
        data.dsTipoPersonal,
        data.dsDescripcionPuesto || null,
        data.dsDomicilio || null,
        data.dsTelefono || null,
        data.dsMail || null,
        data.feNacimiento || null,
        data.dsDni || null,
        data.dsCuil || null,
        data.dsEntidad || null,
        data.dsCbuCvu || null,
        data.dsObservaciones || null,
        data.cdEstado,
        cdPersonal,
      ]
    );

    // Eliminar asociaciones existentes
    await connection.execute(
      'DELETE FROM TR_PERSONAL_TIPO_TALLER WHERE cdPersonal = ?',
      [cdPersonal]
    );

    // Si es profesor, asociar talleres
    if (data.dsTipoPersonal === 'Profesor' && data.talleres) {
      for (const cdTipoTaller of data.talleres) {
        await connection.execute(
          'INSERT INTO TR_PERSONAL_TIPO_TALLER (cdPersonal, cdTipoTaller) VALUES (?, ?)',
          [cdPersonal, cdTipoTaller]
        );
      }
    }

    await connection.commit();

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Personal',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdPersonal,
      dsDetalle: `Personal modificado: ${data.dsNombreCompleto}`,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Personal actualizado exitosamente' 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error en PUT /api/personal:', error);
    return NextResponse.json(
      { error: 'Error al actualizar personal' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// DELETE - Desactivar personal
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdPersonal = parseInt(params.id);

    await softDelete('TD_PERSONAL', 'cdPersonal', cdPersonal, 2);

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Personal',
      dsAccion: 'Modificar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdPersonal,
      dsDetalle: 'Personal desactivado',
    });

    return NextResponse.json({ 
      success: true,
      message: 'Personal desactivado exitosamente' 
    });
  } catch (error) {
    console.error('Error en DELETE /api/personal:', error);
    return NextResponse.json(
      { error: 'Error al desactivar personal' },
      { status: 500 }
    );
  }
}
