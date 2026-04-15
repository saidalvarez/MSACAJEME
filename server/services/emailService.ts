import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// SMTP Configuration for MSA Cajeme
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'msacajeme@gmail.com',
    pass: process.env.SMTP_PASS || 'sdha fkfz kkwj wktb'
  }
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Verify connection on startup
transporter.verify()
  .then(() => logger.info('[EMAIL] Conexión SMTP verificada correctamente.'))
  .catch((err) => logger.error('[EMAIL] Error de conexión SMTP:', err));

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const mailOptions: any = {
      from: `"Multiservicios Cajeme" <${SMTP_CONFIG.auth.user}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html || undefined,
      text: payload.text || undefined,
      attachments: []
    };

    if (payload.pdfBuffer && payload.pdfFilename) {
      mailOptions.attachments.push({
        filename: payload.pdfFilename,
        content: payload.pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const info = await transporter.sendMail(mailOptions);
    logger.info(`[EMAIL] Correo enviado exitosamente a ${payload.to} — MessageID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`[EMAIL] Error al enviar correo a ${payload.to}:`, error);
    throw new Error(`Error al enviar correo: ${error.message}`);
  }
}

export default { sendEmail };
