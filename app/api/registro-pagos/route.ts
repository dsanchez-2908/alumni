import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import { enviarEmail } from '@/lib/email';
import { generarPDFRecibo, getNombreMes } from '@/lib/pdf-recibo';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp-link';

// POST - Registrar pago
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const {
      cdGrupoFamiliar,
      items, // Array de items a pagar
      observacion,
      metodoNotificacion = 'Mail', // Por defecto Mail
    } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un item para pagar' },
        { status: 400 }
      );
    }

    const cdUsuario = (session.user as any).cdUsuario;

    await connection.beginTransaction();

    // Calcular monto total
    const montoTotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.monto), 0);

    // Determinar tipo de pago general (si todos son del mismo tipo)
    const tiposPago = [...new Set(items.map((i: any) => i.tipoPago))];
    const tipoPagoGeneral = tiposPago.length === 1 ? tiposPago[0] : 'Efectivo';

    // Tomar el primer alumno como referencia (normalmente todos son del mismo grupo)
    const cdAlumnoPrincipal = items[0].cdAlumno;

    // Insertar el pago principal
    const [resultPago] = await connection.execute<any>(
      `INSERT INTO TD_PAGOS (
        cdAlumno,
        cdGrupoFamiliar,
        nuMes,
        nuAnio,
        dsTipoPago,
        nuMontoTotal,
        dsObservacion,
        cdUsuarioRegistro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cdAlumnoPrincipal,
        cdGrupoFamiliar || null, // Permitir null para alumnos sin grupo familiar
        items[0].mes,
        items[0].anio,
        tipoPagoGeneral,
        montoTotal,
        observacion || null,
        cdUsuario,
      ]
    );

    const cdPago = resultPago.insertId;

    // Insertar el detalle de cada item
    for (const item of items) {
      await connection.execute(
        `INSERT INTO TD_PAGOS_DETALLE (
          cdPago,
          cdTaller,
          cdAlumno,
          nuMonto,
          dsTipoPago,
          snEsExcepcion
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          cdPago,
          item.cdTaller,
          item.cdAlumno,
          item.monto,
          item.tipoPago,
          item.esExcepcion ? 1 : 0,
        ]
      );
    }

    await connection.commit();

    await registrarTraza({
      dsProceso: 'Pagos',
      dsAccion: 'Agregar',
      cdUsuario,
      cdElemento: cdPago,
      dsDetalle: `Pago registrado por $${montoTotal} - ${items.length} items`,
    });

    // Preparar variables para respuesta
    let whatsappLink: string | null = null;
    let pdfUrl: string | null = null;
    let pdfFilename: string | null = null;

    // Recolectar datos de notificación basados en el método seleccionado
    try {
      const emailsSet = new Set<string>(); // Usar Set para evitar duplicados
      const whatsappNumbers = new Set<string>(); // Para números de WhatsApp

      // Obtener todos los cdAlumno únicos del pago
      const alumnosEnPago = [...new Set(items.map((item: any) => item.cdAlumno))];

      // Obtener datos de notificación de TODOS los alumnos involucrados en el pago
      for (const cdAlumno of alumnosEnPago) {
        const [alumnoData] = await connection.execute<any[]>(
          'SELECT dsMailNotificacion, dsWhatsappNotificacion FROM TD_ALUMNOS WHERE cdAlumno = ?',
          [cdAlumno]
        );

        if (alumnoData.length > 0) {
          const alumno = alumnoData[0];
          
          console.log(`Alumno ${cdAlumno} - Mail: ${alumno.dsMailNotificacion}, WhatsApp: ${alumno.dsWhatsappNotificacion}`);
          
          // Recolectar emails si el método incluye Mail
          if ((metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos') && 
              alumno.dsMailNotificacion && alumno.dsMailNotificacion.trim()) {
            emailsSet.add(alumno.dsMailNotificacion.trim());
          }
          
          // Recolectar números de WhatsApp si el método incluye WhatsApp
          if ((metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') && 
              alumno.dsWhatsappNotificacion && alumno.dsWhatsappNotificacion.trim()) {
            whatsappNumbers.add(alumno.dsWhatsappNotificacion.trim());
          }
        }
      }

      // Convertir Set a Array
      const emails = Array.from(emailsSet);
      const whatsappNumbersArray = Array.from(whatsappNumbers);

      console.log(`Método notificación: ${metodoNotificacion}`);
      console.log(`Emails encontrados: ${emails.join(', ')}`);
      console.log(`WhatsApps encontrados: ${whatsappNumbersArray.join(', ')}`);

      // Obtener información completa del pago para generar el recibo
      const [pagoDetalles] = await connection.execute<any[]>(
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

      if (pagoDetalles.length > 0) {
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
          total: montoTotal,
          observacion: primerDetalle.dsObservacion,
        });

        // Guardar PDF para WhatsApp si es necesario
        if (metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') {
          // Convertir PDF a base64 para poder descargarlo desde el navegador
          const pdfBase64 = pdfBuffer.toString('base64');
          pdfUrl = `data:application/pdf;base64,${pdfBase64}`;
          pdfFilename = `Recibo_${cdPago.toString().padStart(6, '0')}.pdf`;
        }

        // Enviar por Email si corresponde
        if ((metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos') && emails.length > 0) {
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
                  Confirmamos que hemos recibido tu pago por un monto total de <strong>$${montoTotal.toFixed(2)}</strong>.
                </p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="color: #374151; margin-top: 0;">Detalles del pago:</h3>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Recibo N°:</strong> ${cdPago.toString().padStart(6, '0')}</p>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Fecha:</strong> ${new Date(primerDetalle.fePago).toLocaleDateString('es-AR')}</p>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Total pagado:</strong> $${montoTotal.toFixed(2)}</p>
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
            emails,
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

          console.log(`Email enviado exitosamente a: ${emails.join(', ')}`);
        }

        // Generar enlace de WhatsApp si corresponde
        if ((metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') && whatsappNumbersArray.length > 0) {
          // Usar el primer número de WhatsApp (si hay más de uno, se puede ajustar)
          const numeroWhatsApp = whatsappNumbersArray[0];
          
          console.log(`Generando enlace de WhatsApp para: ${numeroWhatsApp}`);
          
          // Crear mensaje para WhatsApp
          const mensajeWhatsApp = `Hola! 👋

Te enviamos el comprobante de pago de *Índigo Teatro*.

📄 *Recibo N°:* ${cdPago.toString().padStart(6, '0')}
📅 *Fecha:* ${new Date(primerDetalle.fePago).toLocaleDateString('es-AR')}
💰 *Total pagado:* $${montoTotal.toFixed(2)}

El PDF del recibo se descargará automáticamente en tu navegador.

¡Gracias por confiar en nosotros! 🎭`;

          whatsappLink = generarEnlaceWhatsApp(numeroWhatsApp, mensajeWhatsApp);
          
          console.log(`Enlace de WhatsApp generado: ${whatsappLink}`);
        } else {
          console.log(`No se generó enlace de WhatsApp - Método: ${metodoNotificacion}, Números disponibles: ${whatsappNumbersArray.length}`);
        }
      } else {
        console.log('No se encontraron detalles del pago para generar el recibo');
      }
    } catch (notificationError: any) {
      console.error('Error al procesar notificación, pero el pago fue registrado:', notificationError);
      // No fallar si hay error en la notificación, el pago ya está registrado
    }

    return NextResponse.json(
      {
        message: 'Pago registrado exitosamente',
        cdPago,
        montoTotal,
        whatsappLink,
        pdfUrl,
        pdfFilename,
      },
      { status: 201 }
    );
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al registrar pago:', error);
    return NextResponse.json(
      { error: 'Error al registrar pago', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
