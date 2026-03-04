import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { generarPDFRecibo, getNombreMes } from '@/lib/pdf-recibo';

// GET - Generar PDF de un pago existente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdPago = parseInt(params.id);

    if (!cdPago || isNaN(cdPago)) {
      return NextResponse.json(
        { error: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    // Obtener información completa del pago
    const [pagoDetalles] = await pool.execute<any[]>(
      `SELECT 
        pd.cdPago,
        pd.cdAlumno,
        pd.cdTaller,
        pd.nuMonto,
        pd.dsTipoPago,
        p.nuMes,
        p.nuAnio,
        p.fePago,
        p.dsObservacion,
        p.nuMontoTotal,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
        a.dsDNI,
        tt.dsNombreTaller
      FROM TD_PAGOS_DETALLE pd
      INNER JOIN TD_PAGOS p ON pd.cdPago = p.cdPago
      INNER JOIN TD_ALUMNOS a ON pd.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE pd.cdPago = ?`,
      [cdPago]
    );

    if (pagoDetalles.length === 0) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const primerDetalle = pagoDetalles[0];

    // Preparar detalles para el PDF
    const detalles = pagoDetalles.map((detalle: any) => ({
      nombreAlumno: detalle.nombreAlumno,
      nombreTaller: detalle.dsNombreTaller,
      mes: getNombreMes(detalle.nuMes),
      anio: detalle.nuAnio,
      monto: parseFloat(detalle.nuMonto),
      tipoPago: detalle.dsTipoPago,
    }));

    // Generar PDF
    const pdfBuffer = generarPDFRecibo({
      cdPago,
      fePago: new Date(primerDetalle.fePago).toLocaleDateString('es-AR'),
      nombreCliente: primerDetalle.nombreAlumno,
      dniCliente: primerDetalle.dsDNI,
      detalles,
      total: parseFloat(primerDetalle.nuMontoTotal),
      observacion: primerDetalle.dsObservacion,
    });

    // Retornar el PDF como respuesta
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Comprobante_de_Pago_${cdPago.toString().padStart(6, '0')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF', details: error.message },
      { status: 500 }
    );
  }
}
