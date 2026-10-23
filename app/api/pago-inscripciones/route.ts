import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';
import { registrarTraza } from '@/lib/db-utils';
import { enviarEmail } from '@/lib/email';
import { generarPDFRecibo } from '@/lib/pdf-recibo';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp-link';
import {
  calcularInscripcionGrupo,
  ETIQUETA_TIPO_PRECIO,
  getAniosPermitidos,
} from '@/lib/inscripciones';

const TIPOS_PAGO = ['Efectivo', 'Transferencia', 'Excepcion'];

// POST - Registrar pago de inscripción (uno o varios alumnos del mismo grupo familiar)
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRoles: string[] = (session.user as any).roles || [];
    if (!userRoles.some((r) => ['Administrador', 'Supervisor', 'Operador'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const {
      cdAlumno,
      cdGrupoFamiliar,
      anio,
      items,
      observacion,
      metodoNotificacion = 'Mail',
      emailNotificacion,
      whatsappNotificacion,
    } = await request.json();

    const cdUsuario = (session.user as any).cdUsuario;
    const anioInscripcion = parseInt(anio);

    if (!cdAlumno || !anioInscripcion || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un alumno para pagar la inscripción' },
        { status: 400 }
      );
    }

    const aniosPermitidos = await getAniosPermitidos();
    if (!aniosPermitidos.includes(anioInscripcion)) {
      return NextResponse.json(
        { error: `La inscripción ${anioInscripcion} no está habilitada para pagar` },
        { status: 400 }
      );
    }

    // Los precios se recalculan en el servidor; del cliente solo se acepta el monto de las excepciones
    const calculo = await calcularInscripcionGrupo(connection, {
      cdAlumno: parseInt(cdAlumno),
      cdGrupoFamiliar: cdGrupoFamiliar ? parseInt(cdGrupoFamiliar) : null,
      anio: anioInscripcion,
    });

    const aPagar: {
      cdAlumno: number;
      nombre: string;
      tipoPago: string;
      tipoPrecio: string;
      monto: number;
      esExcepcion: boolean;
    }[] = [];
    const vistos = new Set<number>();

    for (const item of items) {
      const miembro = calculo.miembros.find((m) => m.cdAlumno === item.cdAlumno);
      if (!miembro) {
        return NextResponse.json(
          { error: 'Uno de los alumnos no pertenece al grupo familiar' },
          { status: 400 }
        );
      }
      if (vistos.has(miembro.cdAlumno)) {
        return NextResponse.json({ error: 'Alumno repetido en el pago' }, { status: 400 });
      }
      vistos.add(miembro.cdAlumno);

      const nombre = `${miembro.dsApellido}, ${miembro.dsNombre}`;
      if (miembro.yaPagado) {
        return NextResponse.json(
          { error: `${nombre} ya tiene pagada la inscripción ${anioInscripcion}` },
          { status: 409 }
        );
      }
      if (!TIPOS_PAGO.includes(item.tipoPago)) {
        return NextResponse.json({ error: 'Modo de pago inválido' }, { status: 400 });
      }

      const esExcepcion = item.tipoPago === 'Excepcion';
      let monto = miembro.monto;
      if (esExcepcion) {
        monto = parseFloat(item.montoExcepcion);
        if (!isFinite(monto) || monto < 0) {
          return NextResponse.json(
            { error: `Ingrese un monto válido para la excepción de ${nombre}` },
            { status: 400 }
          );
        }
      } else if (!calculo.precio) {
        return NextResponse.json(
          { error: 'No hay precios de inscripción vigentes. Cárguelos en Configuración > Precios de Inscripción.' },
          { status: 400 }
        );
      }

      aPagar.push({
        cdAlumno: miembro.cdAlumno,
        nombre,
        tipoPago: item.tipoPago,
        tipoPrecio: miembro.tipoPrecio,
        monto,
        esExcepcion,
      });
    }

    const montoTotal = aPagar.reduce((sum, i) => sum + i.monto, 0);
    const tiposPago = [...new Set(aPagar.map((i) => i.tipoPago))];

    await connection.beginTransaction();

    const cdPagosCreados: number[] = [];
    try {
      for (const item of aPagar) {
        const [result] = await connection.execute<any>(
          `INSERT INTO TD_PAGOS_INSCRIPCIONES (
            cdAlumno, cdGrupoFamiliar, nuAnioInscripcion, dsTipoPago, dsTipoPrecio,
            cdPrecioInscripcion, nuMonto, snEsExcepcion, dsObservacion, cdUsuarioRegistro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.cdAlumno,
            cdGrupoFamiliar ? parseInt(cdGrupoFamiliar) : null,
            anioInscripcion,
            item.tipoPago,
            item.tipoPrecio,
            calculo.precio?.cdPrecioInscripcion ?? null,
            item.monto,
            item.esExcepcion ? 1 : 0,
            observacion || null,
            cdUsuario,
          ]
        );
        cdPagosCreados.push(result.insertId);
      }
    } catch (dbError: any) {
      await connection.rollback();
      if (dbError.code === 'ER_DUP_ENTRY') {
        return NextResponse.json(
          { error: `Uno de los alumnos ya tiene pagada la inscripción ${anioInscripcion}` },
          { status: 409 }
        );
      }
      throw dbError;
    }

    // El comprobante lleva el número del primer pago del lote
    const cdComprobante = cdPagosCreados[0];
    await connection.execute(
      `UPDATE TD_PAGOS_INSCRIPCIONES SET cdComprobante = ? WHERE cdPagoInscripcion IN (${cdPagosCreados.map(() => '?').join(',')})`,
      [cdComprobante, ...cdPagosCreados]
    );

    await connection.commit();

    for (let i = 0; i < aPagar.length; i++) {
      await registrarTraza({
        dsProceso: 'Pago Inscripciones',
        dsAccion: 'Agregar',
        cdUsuario,
        cdElemento: cdPagosCreados[i],
        dsDetalle: `${aPagar[i].nombre} | Inscripción ${anioInscripcion} | ${ETIQUETA_TIPO_PRECIO[aPagar[i].tipoPrecio as keyof typeof ETIQUETA_TIPO_PRECIO]} | ${aPagar[i].tipoPago} | $${aPagar[i].monto}`,
      });
    }

    let whatsappLink: string | null = null;
    let pdfUrl: string | null = null;
    let pdfFilename: string | null = null;

    // El pago ya está registrado: un error en la notificación no debe hacerlo fallar
    try {
      const numeroComprobante = `INS-${cdComprobante.toString().padStart(6, '0')}`;
      const fePago = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

      const [titular] = await connection.execute<any[]>(
        `SELECT CONCAT(dsNombre, ' ', dsApellido) as nombre, dsDNI FROM TD_ALUMNOS WHERE cdAlumno = ?`,
        [aPagar[0].cdAlumno]
      );

      const pdfBuffer = generarPDFRecibo({
        cdPago: cdComprobante,
        titulo: 'Comprobante de Pago de Inscripción',
        numero: numeroComprobante,
        fePago,
        nombreCliente: titular[0]?.nombre || aPagar[0].nombre,
        dniCliente: titular[0]?.dsDNI,
        detalles: aPagar.map((i) => ({
          nombreAlumno: i.nombre,
          nombreTaller: `Inscripción ${anioInscripcion}`,
          mes: '',
          anio: anioInscripcion,
          periodo: String(anioInscripcion),
          monto: i.monto,
          tipoPago: i.tipoPago === 'Excepcion' ? 'Excepción' : i.tipoPago,
        })),
        total: montoTotal,
        observacion: observacion || undefined,
      });

      const conMail = metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos';
      const conWhatsapp = metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos';
      const email = emailNotificacion?.trim();
      const whatsapp = whatsappNotificacion?.trim();

      if (conWhatsapp) {
        pdfUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
        pdfFilename = `Comprobante_Inscripcion_${cdComprobante.toString().padStart(6, '0')}.pdf`;
      }

      if (conMail && email) {
        const htmlEmail = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Índigo Teatro</h1>
              <p style="color: white; margin: 10px 0 0 0;">Comprobante de Pago de Inscripción</p>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #374151;">¡Inscripción ${anioInscripcion} registrada!</h2>
              <p style="color: #6b7280;">Hola,</p>
              <p style="color: #6b7280;">
                Confirmamos que hemos recibido el pago de la inscripción ${anioInscripcion} por un monto total de <strong>$${montoTotal.toFixed(2)}</strong>.
              </p>
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <h3 style="color: #374151; margin-top: 0;">Detalles del pago:</h3>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Comprobante N°:</strong> ${numeroComprobante}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Fecha:</strong> ${fePago}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Alumnos:</strong> ${aPagar.map((i) => i.nombre).join('; ')}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Total pagado:</strong> $${montoTotal.toFixed(2)}</p>
              </div>
              <p style="color: #6b7280;">Adjuntamos el comprobante de pago en formato PDF para tu registro.</p>
              <p style="color: #6b7280; margin-top: 30px;">Gracias por confiar en nosotros.</p>
              <p style="color: #6b7280;"><strong>Índigo Teatro</strong><br>contacto@indigoteatro.com.ar</p>
            </div>
            <div style="padding: 20px; text-align: center; background-color: #f3f4f6; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">Este es un mensaje automático, por favor no responder a este email.</p>
            </div>
          </div>
        `;

        await enviarEmail(
          [email],
          `Comprobante de Inscripción ${anioInscripcion} - N° ${numeroComprobante}`,
          htmlEmail,
          [
            {
              filename: `Comprobante_Inscripcion_${cdComprobante.toString().padStart(6, '0')}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        );
      }

      if (conWhatsapp && whatsapp) {
        const mensajeWhatsApp = `Hola! 👋

Te enviamos el comprobante de pago de la inscripción ${anioInscripcion} de *Índigo Teatro*.

📄 *Comprobante N°:* ${numeroComprobante}
📅 *Fecha:* ${fePago}
💰 *Total pagado:* $${montoTotal.toFixed(2)}

El PDF del comprobante de pago se descargará automáticamente en tu navegador.

¡Gracias por confiar en nosotros! 🎭`;

        whatsappLink = generarEnlaceWhatsApp(whatsapp, mensajeWhatsApp);
      }
    } catch (notificationError: any) {
      console.error('Error al procesar notificación, pero el pago fue registrado:', notificationError);
    }

    return NextResponse.json(
      {
        message: 'Pago de inscripción registrado exitosamente',
        cdComprobante,
        montoTotal,
        tiposPago,
        whatsappLink,
        pdfUrl,
        pdfFilename,
      },
      { status: 201 }
    );
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {
      // Sin transacción abierta
    }
    console.error('Error al registrar pago de inscripción:', error);
    return NextResponse.json(
      { error: 'Error al registrar pago de inscripción', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
