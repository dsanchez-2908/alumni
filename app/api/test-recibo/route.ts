import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { enviarEmail } from '@/lib/email';
import { generarPDFRecibo, getNombreMes } from '@/lib/pdf-recibo';

// GET - Enviar recibo manualmente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cdPago = parseInt(searchParams.get('cdPago') || '5');
    const email = searchParams.get('email') || 'danielfsanchez83@gmail.com';

    console.log(`Enviando recibo para cdPago=${cdPago} a ${email}`);

    // Obtener información del pago
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
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
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

    // HTML del email
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Índigo Teatro</h1>
          <p style="color: white; margin: 10px 0 0 0;">Recibo de Pago</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #374151;">¡Pago registrado exitosamente!</h2>
          
          <p style="color: #6b7280;">Hola,</p>
          
          <p style="color: #6b7280;">
            Confirmamos que hemos recibido tu pago por un monto total de <strong>$${parseFloat(primerDetalle.nuMontoTotal).toFixed(2)}</strong>.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin-top: 0;">Detalles del pago:</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Recibo N°:</strong> ${cdPago.toString().padStart(6, '0')}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Fecha:</strong> ${new Date(primerDetalle.fePago).toLocaleDateString('es-AR')}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Total pagado:</strong> $${parseFloat(primerDetalle.nuMontoTotal).toFixed(2)}</p>
          </div>
          
          <p style="color: #6b7280;">
            Adjuntamos el recibo en formato PDF para tu registro.
          </p>
          
          <p style="color: #6b7280; margin-top: 30px;">
            Gracias por confiar en nosotros.
          </p>
          
          <p style="color: #6b7280;">
            <strong>Índigo Teatro</strong><br>
            contacto@indigoteatro.com.ar
          </p>
        </div>
        
        <div style="padding: 20px; text-align: center; background-color: #f3f4f6; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Este es un mensaje automático, por favor no responder a este email.</p>
        </div>
      </div>
    `;

    // Enviar email
    await enviarEmail(
      [email],
      `Recibo de Pago - N° ${cdPago.toString().padStart(6, '0')}`,
      htmlEmail,
      [
        {
          filename: `Recibo_${cdPago.toString().padStart(6, '0')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Recibo enviado exitosamente a ${email}`,
      cdPago,
    });

  } catch (error: any) {
    console.error('Error al enviar recibo:', error);
    return NextResponse.json(
      { error: 'Error al enviar recibo', details: error.message },
      { status: 500 }
    );
  }
}
