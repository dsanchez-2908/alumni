import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Observación del último pago del alumno (o de su grupo familiar), para tenerla presente al registrar el siguiente.
// Solo se considera el ÚLTIMO pago: si ese pago no tiene observación, no hay nada que mostrar.
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
    if (!cdAlumno) {
      return NextResponse.json({ error: 'Alumno inválido' }, { status: 400 });
    }

    // El pago puede haberse registrado a nombre del alumno, de otro miembro de su grupo familiar
    // (con el alumno en el detalle) o del grupo en sí
    const [pagos] = await pool.execute<any[]>(
      `SELECT
         p.cdPago,
         DATE_FORMAT(p.fePago, '%Y-%m-%d') as fePago,
         p.dsObservacion
       FROM TD_PAGOS p
       WHERE p.cdAlumno = ?
          OR EXISTS (SELECT 1 FROM TD_PAGOS_DETALLE d WHERE d.cdPago = p.cdPago AND d.cdAlumno = ?)
          OR p.cdGrupoFamiliar IN (
               SELECT cdGrupoFamiliar FROM TR_ALUMNO_GRUPO_FAMILIAR WHERE cdAlumno = ?
             )
       ORDER BY p.fePago DESC, p.cdPago DESC
       LIMIT 1`,
      [cdAlumno, cdAlumno, cdAlumno]
    );

    const observacion = (pagos[0]?.dsObservacion || '').trim();
    return NextResponse.json(
      {
        observacion: observacion || null,
        fePago: observacion ? pagos[0].fePago : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Error al obtener la observación del último pago:', error);
    return NextResponse.json(
      { error: 'Error al obtener la observación del último pago', details: error.message },
      { status: 500 }
    );
  }
}
