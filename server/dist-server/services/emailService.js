"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("../utils/logger"));
// SMTP Configuration for MSA Cajeme
const SMTP_CONFIG = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'msacajeme@gmail.com',
        pass: process.env.SMTP_PASS || 'jyelwdasiokvxxmn'
    }
};
const transporter = nodemailer_1.default.createTransport(SMTP_CONFIG);
// Verify connection on startup
transporter.verify()
    .then(() => logger_1.default.info('[EMAIL] Conexión SMTP verificada correctamente.'))
    .catch((err) => logger_1.default.error('[EMAIL] Error de conexión SMTP:', err));
async function sendEmail(payload) {
    try {
        const mailOptions = {
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
        logger_1.default.info(`[EMAIL] Correo enviado exitosamente a ${payload.to} — MessageID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        logger_1.default.error(`[EMAIL] Error al enviar correo a ${payload.to}:`, error);
        throw new Error(`Error al enviar correo: ${error.message}`);
    }
}
exports.default = { sendEmail };
