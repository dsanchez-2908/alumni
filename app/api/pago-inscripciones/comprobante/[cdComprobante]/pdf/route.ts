import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { generarPDFRecibo } from '@/lib/pdf-recibo';

// GET - Regenerar el comprobante de un pago de inscripción (incluye a todos los alumnos del mismo pago)
export async function GET(
  request: NextRequest,
  { params }: { params: { cdComprobante: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdComprobante = parseInt(params.cdComprobante);
    if (!cdComprobante || isNaN(cdComprobante)) {
      return NextResponse.json({ error: 'Comprobante inválido' }, { status: 400 });
    }

    const [pagos] = await pool.execute<any[]>(
      `SELECT
         p.cdPagoInscripcion,
         p.nuAnioInscripcion,
         p.nuMonto,
         p.dsTipoPago,
         p.dsObservacion,
         DATE_FORMAT(p.fePago, '%Y-%m-%d') as fePago,
         CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
         a.dsDNI
       FROM TD_PAGOS_INSCRIPCIONES p
       INNER JOIN TD_ALUMNOS a ON p.cdAlumno = a.cdAlumno
       WHERE p.cdComprobante = ? AND p.cdEstado = 1
       ORDER BY p.cdPagoInscripcion`,
      [cdComprobante]
    );

    if (pagos.length === 0) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 });
    }

    const primero = pagos[0];
    const [anio, mes, dia] = primero.fePago.split('-');
    const total = pagos.reduce((sum, p) => sum + parseFloat(p.nuMonto), 0);

    const pdfBuffer = generarPDFRecibo({
      cdPago: cdComprobante,
      titulo: 'Comprobante de Pago de Inscripción',
      numero: `INS-${cdComprobante.toString().padStart(6, '0')}`,
      fePago: `${dia}/${mes}/${anio}`,
      nombreCliente: primero.nombreAlumno,
      dniCliente: primero.dsDNI,
      detalles: pagos.map((p) => ({
        nombreAlumno: p.nombreAlumno,
        nombreTaller: `Inscripción ${p.nuAnioInscripcion}`,
        mes: '',
        anio: p.nuAnioInscripcion,
        periodo: String(p.nuAnioInscripcion),
        monto: parseFloat(p.nuMonto),
        tipoPago: p.dsTipoPago === 'Excepcion' ? 'Excepción' : p.dsTipoPago,
      })),
      total,
      observacion: primero.dsObservacion || undefined,
    });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Comprobante_Inscripcion_${cdComprobante.toString().padStart(6, '0')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error al generar PDF de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF', details: error.message },
      { status: 500 }
    );
  }
}
