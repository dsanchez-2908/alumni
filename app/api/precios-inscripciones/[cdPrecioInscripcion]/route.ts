import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';

// PUT - Corregir los precios de una vigencia existente (solo Administrador)
export async function PUT(
  request: NextRequest,
  { params }: { params: { cdPrecioInscripcion: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRoles: string[] = (session.user as any).roles || [];
    if (!userRoles.includes('Administrador')) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo los administradores pueden modificar precios.' },
        { status: 403 }
      );
    }

    const cdPrecioInscripcion = parseInt(params.cdPrecioInscripcion);
    const body = await request.json();
    const campos = [
      'nuPrecioAlumnoActivo',
      'nuPrecioFamiliarActivo',
      'nuPrecioAlumnoNuevo',
      'nuPrecioFamiliarNuevo',
    ];
    const valores: number[] = [];
    for (const campo of campos) {
      const valor = parseFloat(body[campo]);
      if (isNaN(valor) || valor < 0) {
        return NextResponse.json(
          { error: 'Los 4 precios son requeridos y deben ser números válidos' },
          { status: 400 }
        );
      }
      valores.push(valor);
    }

    const [existente] = await pool.execute<any[]>(
      `SELECT nuPrecioAlumnoActivo, nuPrecioFamiliarActivo, nuPrecioAlumnoNuevo, nuPrecioFamiliarNuevo,
              DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as feInicioVigencia
       FROM TD_PRECIOS_INSCRIPCIONES
       WHERE cdPrecioInscripcion = ? AND cdEstado = 1`,
      [cdPrecioInscripcion]
    );
    if (existente.length === 0) {
      return NextResponse.json({ error: 'Precio no encontrado' }, { status: 404 });
    }

    await pool.execute(
      `UPDATE TD_PRECIOS_INSCRIPCIONES
       SET nuPrecioAlumnoActivo = ?, nuPrecioFamiliarActivo = ?,
           nuPrecioAlumnoNuevo = ?, nuPrecioFamiliarNuevo = ?
       WHERE cdPrecioInscripcion = ?`,
      [...valores, cdPrecioInscripcion]
    );

    const anterior = existente[0];
    await registrarTraza({
      dsProceso: 'Precios Inscripciones',
      dsAccion: 'Modificar',
      cdUsuario: (session.user as any).cdUsuario,
      cdElemento: cdPrecioInscripcion,
      dsDetalle: `Vigencia ${anterior.feInicioVigencia}: Activo $${anterior.nuPrecioAlumnoActivo}→$${valores[0]}, Fam. Activo $${anterior.nuPrecioFamiliarActivo}→$${valores[1]}, Nuevo $${anterior.nuPrecioAlumnoNuevo}→$${valores[2]}, Fam. Nuevo $${anterior.nuPrecioFamiliarNuevo}→$${valores[3]}`,
    });

    return NextResponse.json({ message: 'Precio actualizado correctamente' });
  } catch (error: any) {
    console.error('Error al actualizar precio de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al actualizar precio de inscripción', details: error.message },
      { status: 500 }
    );
  }
}
