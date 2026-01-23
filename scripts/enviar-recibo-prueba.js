const mysql = require('mysql2/promise');
const { enviarEmail } = require('../lib/email');
const { generarPDFRecibo, getNombreMes } = require('../lib/pdf-recibo');

async function enviarReciboManual() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    const cdPago = 5;
    
    console.log(`🔧 Generando y enviando recibo para cdPago=${cdPago}...\n`);
    
    // Obtener información del pago
    const [pagoDetalles] = await connection.execute(
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
      console.log('❌ No se encontró el pago');
      return;
    }

    const primerDetalle = pagoDetalles[0];
    console.log('✅ Pago encontrado:', primerDetalle.nombreAlumno);
    console.log('   Total: $' + primerDetalle.nuMontoTotal);

    // Preparar detalles para el PDF
    const detalles = pagoDetalles.map((detalle) => ({
      nombreAlumno: detalle.nombreAlumno,
      nombreTaller: detalle.dsNombreTaller,
      mes: getNombreMes(detalle.nuMes),
      anio: detalle.nuAnio,
      monto: parseFloat(detalle.nuMonto),
      tipoPago: detalle.dsTipoPago,
    }));

    // Generar PDF
    console.log('\n📄 Generando PDF...');
    const pdfBuffer = generarPDFRecibo({
      cdPago,
      fePago: new Date(primerDetalle.fePago).toLocaleDateString('es-AR'),
      nombreCliente: primerDetalle.nombreAlumno,
      dniCliente: primerDetalle.dsDNI,
      detalles,
      total: parseFloat(primerDetalle.nuMontoTotal),
      observacion: primerDetalle.dsObservacion,
    });
    console.log('✅ PDF generado correctamente');

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

    // Enviar email a danielfsanchez83@gmail.com
    const destinatarios = ['danielfsanchez83@gmail.com'];
    
    console.log('\n📧 Enviando email a:', destinatarios.join(', '));
    
    await enviarEmail(
      destinatarios,
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

    console.log('✅ Email enviado exitosamente!');
    console.log('\n🎉 Proceso completado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

enviarReciboManual();
