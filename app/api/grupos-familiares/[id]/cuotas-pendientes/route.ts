import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { calcularCuotasPendientes } from '@/lib/cuotas-pendientes';

// GET - Calcular TODAS las cuotas pendientes (pasadas y del mes actual) de un grupo familiar
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdGrupoFamiliar = parseInt(params.id);

    // Obtener todos los talleres del grupo familiar (activos, o incompletos con deuda hasta la baja)
    const [talleres] = await pool.execute<any[]>(
      `SELECT 
        at.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        at.cdTaller,
        t.nuAnioTaller,
        tt.cdTipoTaller,
        tt.dsNombreTaller,
        p.dsNombreCompleto as nombreProfesor,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado,
        t.dsDescripcionHorarios,
        t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.dsSabadoHoraDesde, t.dsSabadoHoraHasta,
        DATE_FORMAT(at.feInscripcion, '%Y-%m-%d') as feInscripcion,
        DATE_FORMAT(at.feBaja, '%Y-%m-%d') as feBaja
      FROM TR_ALUMNO_GRUPO_FAMILIAR agf
      INNER JOIN TD_ALUMNOS a ON agf.cdAlumno = a.cdAlumno
      INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      WHERE agf.cdGrupoFamiliar = ?
        AND (at.feBaja IS NULL OR at.cdEstado = 5)
        AND t.cdEstado IN (1, 2)
      ORDER BY a.dsApellido, a.dsNombre, tt.dsNombreTaller`,
      [cdGrupoFamiliar]
    );

    if (talleres.length === 0) {
      return NextResponse.json({
        grupoFamiliar: cdGrupoFamiliar,
        talleres: [],
        mensaje: 'No hay talleres activos para este grupo familiar',
      });
    }

    // Traer TODOS los pagos ya realizados del grupo (sin filtrar por mes/año)
    const [pagosRealizados] = await pool.execute<any[]>(
      `SELECT pd.cdAlumno, pd.cdTaller, tt.cdTipoTaller, p.nuMes, p.nuAnio, pd.nuMonto
       FROM TD_PAGOS p
       INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
       INNER JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       WHERE p.cdGrupoFamiliar = ?`,
      [cdGrupoFamiliar]
    );

    const { items, resumenPorPeriodo } = await calcularCuotasPendientes(talleres, pagosRealizados);

    if (items.length === 0) {
      return NextResponse.json({
        grupoFamiliar: cdGrupoFamiliar,
        items: [],
        cantidadTalleres: 0,
        mensaje: 'No hay cuotas pendientes. Todos los pagos están al día.',
      });
    }

    return NextResponse.json({
      grupoFamiliar: cdGrupoFamiliar,
      items,
      cantidadTalleres: talleres.length, // Total de talleres del grupo (para la regla de "único taller")
      resumenPorPeriodo, // Conteo de pagos completos/descuento por "anio-mes", para el descuento familiar
    });
  } catch (error: any) {
    console.error('Error al calcular cuotas:', error);
    return NextResponse.json(
      { error: 'Error al calcular cuotas', details: error.message },
      { status: 500 }
    );
  }
}
