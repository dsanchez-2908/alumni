import nodemailer from 'nodemailer';

// Configuración del transportador SMTP
const transporter = nodemailer.createTransport({
  host: 'l0070839.ferozo.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'contacto@indigoteatro.com.ar',
    pass: 'Indig@2025',
  },
});

/**
 * Envía un email con adjuntos
 */
export async function enviarEmail(
  destinatarios: string[],
  asunto: string,
  html: string,
  adjuntos?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>
) {
  try {
    // Filtrar emails válidos y únicos
    const emailsUnicos = Array.from(
      new Set(
        destinatarios.filter(
          (email) => email && email.includes('@') && email.trim() !== ''
        )
      )
    );

    if (emailsUnicos.length === 0) {
      throw new Error('No hay destinatarios válidos');
    }

    const info = await transporter.sendMail({
      from: '"Índigo Teatro" <contacto@indigoteatro.com.ar>',
      to: emailsUnicos.join(', '),
      subject: asunto,
      html: html,
      attachments: adjuntos || [],
    });

    console.log('Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar email:', error);
    throw new Error(`Error al enviar email: ${error.message}`);
  }
}

/**
 * Verifica la configuración del email
 */
export async function verificarConfiguracionEmail() {
  try {
    await transporter.verify();
    console.log('Configuración de email verificada correctamente');
    return true;
  } catch (error: any) {
    console.error('Error en configuración de email:', error);
    return false;
  }
}
