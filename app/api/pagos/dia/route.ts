import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener pagos del día actual agrupados por tipo de pago
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Query para obtener todos los pagos del día con detalles
    const query = `
      SELECT 
        pd.cdPagoDetalle,
        pd.cdPago,
        pd.cdAlumno,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as nombreAlumno,
        a.dsDNI,
        pd.cdTaller,
        tt.dsNombreTaller as nombreTaller,
        t.nuAnioTaller,
        pd.nuMonto,
        pd.dsTipoPago,
        CASE 
          WHEN pd.snEsExcepcion = 1 THEN 'Excepción'
          ELSE pd.dsTipoPago
        END as tipoPagoDisplay,
        pd.snEsExcepcion,
        p.fePago,
        p.nuMes,
        p.nuAnio,
        p.dsObservacion,
        p.cdGrupoFamiliar,
        gf.dsNombreGrupo,
        u.dsNombreCompleto as usuarioRegistro,
        p.feRegistro,
        -- Horarios del taller
        t.snLunes,
        t.dsLunesHoraDesde,
        t.dsLunesHoraHasta,
        t.snMartes,
        t.dsMartesHoraDesde,
        t.dsMartesHoraHasta,
        t.snMiercoles,
        t.dsMiercolesHoraDesde,
        t.dsMiercolesHoraHasta,
        t.snJueves,
        t.dsJuevesHoraDesde,
        t.dsJuevesHoraHasta,
        t.snViernes,
        t.dsViernesHoraDesde,
        t.dsViernesHoraHasta,
        t.snSabado,
        t.dsSabadoHoraDesde,
        t.dsSabadoHoraHasta,
        t.snDomingo,
        t.dsDomingoHoraDesde,
        t.dsDomingoHoraHasta
      FROM TD_PAGOS_DETALLE pd
      INNER JOIN TD_PAGOS p ON pd.cdPago = p.cdPago
      INNER JOIN TD_ALUMNOS a ON pd.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_GRUPOS_FAMILIARES gf ON p.cdGrupoFamiliar = gf.cdGrupoFamiliar
      INNER JOIN TD_USUARIOS u ON p.cdUsuarioRegistro = u.cdUsuario
      WHERE DATE(p.fePago) = CURDATE()
      ORDER BY pd.dsTipoPago, pd.snEsExcepcion DESC, a.dsApellido, a.dsNombre
    `;

    const [pagosDetalle] = await pool.execute<any[]>(query);

    // Agrupar por tipo de pago
    const pagosPorTipo = {
      efectivo: [] as any[],
      transferencia: [] as any[],
      excepcion: [] as any[]
    };

    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalExcepcion = 0;

    pagosDetalle.forEach((detalle: any) => {
      const pagoFormateado = {
        cdPagoDetalle: detalle.cdPagoDetalle,
        cdPago: detalle.cdPago,
        cdAlumno: detalle.cdAlumno,
        nombreAlumno: detalle.nombreAlumno,
        dsDNI: detalle.dsDNI,
        cdTaller: detalle.cdTaller,
        nombreTaller: detalle.nombreTaller,
        nuAnioTaller: detalle.nuAnioTaller,
        nuMonto: parseFloat(detalle.nuMonto),
        dsTipoPago: detalle.dsTipoPago,
        snEsExcepcion: detalle.snEsExcepcion,
        fePago: detalle.fePago,
        nuMes: detalle.nuMes,
        nuAnio: detalle.nuAnio,
        dsObservacion: detalle.dsObservacion,
        cdGrupoFamiliar: detalle.cdGrupoFamiliar,
        dsNombreGrupo: detalle.dsNombreGrupo,
        usuarioRegistro: detalle.usuarioRegistro,
        feRegistro: detalle.feRegistro,
        horarios: {
          snLunes: detalle.snLunes,
          dsLunesHoraDesde: detalle.dsLunesHoraDesde,
          dsLunesHoraHasta: detalle.dsLunesHoraHasta,
          snMartes: detalle.snMartes,
          dsMartesHoraDesde: detalle.dsMartesHoraDesde,
          dsMartesHoraHasta: detalle.dsMartesHoraHasta,
          snMiercoles: detalle.snMiercoles,
          dsMiercolesHoraDesde: detalle.dsMiercolesHoraDesde,
          dsMiercolesHoraHasta: detalle.dsMiercolesHoraHasta,
          snJueves: detalle.snJueves,
          dsJuevesHoraDesde: detalle.dsJuevesHoraDesde,
          dsJuevesHoraHasta: detalle.dsJuevesHoraHasta,
          snViernes: detalle.snViernes,
          dsViernesHoraDesde: detalle.dsViernesHoraDesde,
          dsViernesHoraHasta: detalle.dsViernesHoraHasta,
          snSabado: detalle.snSabado,
          dsSabadoHoraDesde: detalle.dsSabadoHoraDesde,
          dsSabadoHoraHasta: detalle.dsSabadoHoraHasta,
          snDomingo: detalle.snDomingo,
          dsDomingoHoraDesde: detalle.dsDomingoHoraDesde,
          dsDomingoHoraHasta: detalle.dsDomingoHoraHasta,
        }
      };

      if (detalle.snEsExcepcion === 1) {
        pagosPorTipo.excepcion.push(pagoFormateado);
        totalExcepcion += pagoFormateado.nuMonto;
      } else if (detalle.dsTipoPago === 'Efectivo') {
        pagosPorTipo.efectivo.push(pagoFormateado);
        totalEfectivo += pagoFormateado.nuMonto;
      } else if (detalle.dsTipoPago === 'Transferencia') {
        pagosPorTipo.transferencia.push(pagoFormateado);
        totalTransferencia += pagoFormateado.nuMonto;
      }
    });

    const totalGeneral = totalEfectivo + totalTransferencia + totalExcepcion;

    return NextResponse.json({
      fecha: new Date().toISOString().split('T')[0],
      pagos: pagosPorTipo,
      totales: {
        efectivo: totalEfectivo,
        transferencia: totalTransferencia,
        excepcion: totalExcepcion,
        general: totalGeneral
      },
      cantidades: {
        efectivo: pagosPorTipo.efectivo.length,
        transferencia: pagosPorTipo.transferencia.length,
        excepcion: pagosPorTipo.excepcion.length,
        total: pagosDetalle.length
      }
    });
  } catch (error: any) {
    console.error('Error al obtener pagos del día:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos del día', details: error.message },
      { status: 500 }
    );
  }
}
