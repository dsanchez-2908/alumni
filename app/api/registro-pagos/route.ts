import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import { enviarEmail } from '@/lib/email';
import { generarPDFRecibo, getNombreMes } from '@/lib/pdf-recibo';

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

    // Recolectar emails para enviar el recibo
    try {
      const emails: string[] = [];

      // Obtener emails del alumno principal y sus contactos
      const [alumnoData] = await connection.execute<any[]>(
        'SELECT dsMail, dsMailContacto1, dsMailContacto2 FROM TD_ALUMNOS WHERE cdAlumno = ?',
        [cdAlumnoPrincipal]
      );

      if (alumnoData.length > 0) {
        const alumno = alumnoData[0];
        if (alumno.dsMail) emails.push(alumno.dsMail);
        if (alumno.dsMailContacto1) emails.push(alumno.dsMailContacto1);
        if (alumno.dsMailContacto2) emails.push(alumno.dsMailContacto2);
      }

      // Si tiene grupo familiar, obtener emails del grupo
      if (cdGrupoFamiliar) {
        const [grupoData] = await connection.execute<any[]>(
          'SELECT dsMailContacto, dsMailContacto2 FROM TD_GRUPOS_FAMILIARES WHERE cdGrupoFamiliar = ?',
          [cdGrupoFamiliar]
        );

        if (grupoData.length > 0) {
          const grupo = grupoData[0];
          if (grupo.dsMailContacto) emails.push(grupo.dsMailContacto);
          if (grupo.dsMailContacto2) emails.push(grupo.dsMailContacto2);
        }
      }

      // Si hay emails, generar PDF y enviar
      if (emails.length > 0) {
        // Obtener información completa del pago para el PDF
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
      } else {
        console.log('No se encontraron emails para enviar el recibo');
      }
    } catch (emailError: any) {
      console.error('Error al enviar email, pero el pago fue registrado:', emailError);
      // No fallar si hay error en el email, el pago ya está registrado
    }

    return NextResponse.json(
      {
        message: 'Pago registrado exitosamente',
        cdPago,
        montoTotal,
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
