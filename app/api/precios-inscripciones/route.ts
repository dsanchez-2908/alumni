import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import { getPrecioInscripcionVigente } from '@/lib/inscripciones';

const CAMPOS_PRECIO = [
  'nuPrecioAlumnoActivo',
  'nuPrecioFamiliarActivo',
  'nuPrecioAlumnoNuevo',
  'nuPrecioFamiliarNuevo',
] as const;

// GET - Listar vigencias de precios de inscripción (o solo la vigente con ?vigente=true)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('vigente') === 'true') {
      return NextResponse.json(await getPrecioInscripcionVigente(pool));
    }

    const [precios] = await pool.execute<any[]>(
      `SELECT
         p.cdPrecioInscripcion,
         DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
         DATE_FORMAT(p.feAlta, '%Y-%m-%d %H:%i:%s') as feAlta,
         p.nuPrecioAlumnoActivo,
         p.nuPrecioFamiliarActivo,
         p.nuPrecioAlumnoNuevo,
         p.nuPrecioFamiliarNuevo,
         u.dsNombreCompleto as nombreUsuarioAlta,
         (p.feInicioVigencia <= CURDATE()
           AND p.feInicioVigencia = (
             SELECT MAX(p2.feInicioVigencia) FROM TD_PRECIOS_INSCRIPCIONES p2
             WHERE p2.cdEstado = 1 AND p2.feInicioVigencia <= CURDATE()
           )
         ) as vigente
       FROM TD_PRECIOS_INSCRIPCIONES p
       LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
       WHERE p.cdEstado = 1
       ORDER BY p.feInicioVigencia DESC`
    );

    return NextResponse.json(
      precios.map((p) => ({ ...p, vigente: Number(p.vigente) === 1 }))
    );
  } catch (error: any) {
    console.error('Error al obtener precios de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al obtener precios de inscripción', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva vigencia de precios de inscripción
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRoles: string[] = (session.user as any).roles || [];
    if (!userRoles.includes('Administrador')) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo los administradores pueden registrar precios.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { feInicioVigencia } = body;

    if (!feInicioVigencia || !/^\d{4}-\d{2}-\d{2}$/.test(feInicioVigencia)) {
      return NextResponse.json(
        { error: 'La fecha de inicio de vigencia es requerida' },
        { status: 400 }
      );
    }

    const valores: number[] = [];
    for (const campo of CAMPOS_PRECIO) {
      const valor = parseFloat(body[campo]);
      if (isNaN(valor) || valor < 0) {
        return NextResponse.json(
          { error: 'Los 4 precios son requeridos y deben ser números válidos' },
          { status: 400 }
        );
      }
      valores.push(valor);
    }

    const [existentes] = await pool.execute<any[]>(
      `SELECT cdPrecioInscripcion FROM TD_PRECIOS_INSCRIPCIONES
       WHERE cdEstado = 1 AND feInicioVigencia = ?`,
      [feInicioVigencia]
    );
    if (existentes.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un precio de inscripción para esa fecha de vigencia' },
        { status: 409 }
      );
    }

    const cdUsuario = (session.user as any).cdUsuario;
    const [result] = await pool.execute<any>(
      `INSERT INTO TD_PRECIOS_INSCRIPCIONES (
         cdUsuarioAlta, feInicioVigencia,
         nuPrecioAlumnoActivo, nuPrecioFamiliarActivo,
         nuPrecioAlumnoNuevo, nuPrecioFamiliarNuevo, cdEstado
       ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [cdUsuario, feInicioVigencia, ...valores]
    );

    await registrarTraza({
      dsProceso: 'Precios Inscripciones',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: result.insertId,
      dsDetalle: `Vigencia desde ${feInicioVigencia} | Activo $${valores[0]} | Fam. Activo $${valores[1]} | Nuevo $${valores[2]} | Fam. Nuevo $${valores[3]}`,
    });

    return NextResponse.json(
      { message: 'Precios de inscripción registrados exitosamente', cdPrecioInscripcion: result.insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al crear precios de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al crear precios de inscripción', details: error.message },
      { status: 500 }
    );
  }
}
