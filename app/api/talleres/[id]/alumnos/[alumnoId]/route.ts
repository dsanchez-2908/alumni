import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza, actualizarEstadoAlumno, verificarDeudasPendientes } from '@/lib/db-utils';

// PUT - Cambiar estado del alumno en el taller (dar de baja/reactivar)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; alumnoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = parseInt(params.alumnoId);
    const { activo, forzarBaja } = await request.json();

    // Obtener información del alumno y taller antes de actualizar
    const [infoPrevia] = await pool.execute<any[]>(
      `SELECT at.cdAlumno, at.cdTaller, 
              CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
              tt.dsNombreTaller, t.nuAnioTaller
       FROM TR_ALUMNO_TALLER at
       INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
       INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       WHERE at.id = ?`,
      [id]
    );
    const info = infoPrevia[0];
    const nombreAlumno = info?.nombreAlumno || 'Desconocido';
    const nombreTaller = info ? `${info.dsNombreTaller} ${info.nuAnioTaller}` : 'Desconocido';

    if (activo) {
      // Reactivar alumno (cdEstado = 1)
      await pool.execute(
        'UPDATE TR_ALUMNO_TALLER SET cdEstado = 1, feBaja = NULL WHERE id = ?',
        [id]
      );
      
      // Actualizar estado del alumno (probablemente a Activo)
      await actualizarEstadoAlumno(info.cdAlumno);
    } else {
      // Dar de baja alumno
      // Primero verificar si tiene deudas pendientes
      const deudas = await verificarDeudasPendientes(info.cdAlumno, info.cdTaller);
      
      // Si tiene deudas y no se forzó la baja, devolver advertencia
      if (deudas.tieneDeudas && !forzarBaja) {
        return NextResponse.json({
          advertencia: true,
          tieneDeudas: true,
          mensaje: `El alumno tiene ${deudas.cantidadMeses} mes(es) pendiente(s) de pago por un total de $${deudas.montoTotal.toFixed(2)}. ¿Desea dar de baja igualmente?`,
          detalles: deudas.detalles,
        }, { status: 200 });
      }
      
      // Dar de baja con estado "Incompleto" (cdEstado = 5)
      await pool.execute(
        'UPDATE TR_ALUMNO_TALLER SET cdEstado = 5, feBaja = NOW() WHERE id = ?',
        [id]
      );
      
      // Verificar si el alumno tiene otros talleres activos y actualizar su estado
      await actualizarEstadoAlumno(info.cdAlumno);
    }

    await registrarTraza({
      dsProceso: 'Talleres - Alumnos',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: id,
      dsDetalle: `${nombreAlumno} ${activo ? 'reactivado' : 'dado de baja'} | ${nombreTaller}`,
    });

    return NextResponse.json({ message: 'Estado actualizado exitosamente' });
  } catch (error: any) {
    console.error('Error al cambiar estado:', error);
    return NextResponse.json(
      { error: 'Error al cambiar estado', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Quitar alumno del taller (marcar como Incompleto)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; alumnoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = parseInt(params.alumnoId);
    
    let forzarEliminacion = false;
    try {
      const body = await request.json();
      forzarEliminacion = body.forzarEliminacion || false;
    } catch (e) {
      // Si no hay body, forzarEliminacion es false por defecto
    }

    // Obtener información del alumno y taller antes de eliminar
    const [infoPrevia] = await pool.execute<any[]>(
      `SELECT at.cdAlumno, at.cdTaller, 
              CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
              tt.dsNombreTaller, t.nuAnioTaller
       FROM TR_ALUMNO_TALLER at
       INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
       INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       WHERE at.id = ?`,
      [id]
    );
    const info = infoPrevia[0];
    const nombreAlumno = info?.nombreAlumno || 'Desconocido';
    const nombreTaller = info ? `${info.dsNombreTaller} ${info.nuAnioTaller}` : 'Desconocido';

    // Verificar si tiene deudas pendientes
    const deudas = await verificarDeudasPendientes(info.cdAlumno, info.cdTaller);
    
    // Si tiene deudas y no se forzó la eliminación, devolver advertencia
    if (deudas.tieneDeudas && !forzarEliminacion) {
      return NextResponse.json({
        advertencia: true,
        tieneDeudas: true,
        mensaje: `El alumno tiene ${deudas.cantidadMeses} mes(es) pendiente(s) de pago por un total de $${deudas.montoTotal.toFixed(2)}. Si quita al alumno, se perderá el registro de la deuda. ¿Desea quitar igualmente?`,
        detalles: deudas.detalles,
      }, { status: 200 });
    }

    // QUITAR: Eliminar completamente el registro (se pierde historial de deudas)
    await pool.execute(
      'DELETE FROM TR_ALUMNO_TALLER WHERE id = ?',
      [id]
    );

    // Verificar si el alumno tiene otros talleres activos y actualizar su estado
    await actualizarEstadoAlumno(info.cdAlumno);

    await registrarTraza({
      dsProceso: 'Talleres - Alumnos',
      dsAccion: 'Eliminar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: id,
      dsDetalle: `${nombreAlumno} | ${nombreTaller} | Eliminado completamente`,
    });

    return NextResponse.json({ message: 'Alumno quitado del taller exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar inscripción:', error);
    return NextResponse.json(
      { error: 'Error al eliminar inscripción', details: error.message },
      { status: 500 }
    );
  }
}
