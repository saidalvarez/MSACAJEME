"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const emailService_1 = require("../services/emailService");
const auth_1 = __importDefault(require("../middleware/auth"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.use(auth_1.default);
// POST /api/email/send — Enviar correo con PDF adjunto
router.post('/send', async (req, res) => {
    try {
        const { to, subject, ticketNumber, clientName, total, pdfBase64 } = req.body;
        if (!to || !subject) {
            return res.status(400).json({ error: 'Se requiere destinatario y asunto' });
        }
        // Build HTML body
        const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Multiservicios Cajeme</h1>
          <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Sistema de Gestión Automotriz</p>
        </div>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Estimado/a <strong>${clientName || 'Cliente'}</strong>,</p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            Adjuntamos el documento correspondiente al servicio <strong>#${ticketNumber || ''}</strong> realizado en nuestro taller.
          </p>
          ${total ? `
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Importe Total</p>
            <p style="color: #059669; font-size: 28px; font-weight: 800; margin: 0;">$${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          ` : ''}
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">
            Gracias por su preferencia. Estamos a sus órdenes para cualquier consulta.
          </p>
        </div>

        <div style="text-align: center; padding: 16px;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            Este correo fue enviado automáticamente por el Sistema MSA.<br/>
            Multiservicios Cajeme — Ciudad Obregón, Sonora.
          </p>
        </div>
      </div>
    `;
        // Convert base64 PDF to buffer if provided
        let pdfBuffer;
        let pdfFilename;
        if (pdfBase64) {
            pdfBuffer = Buffer.from(pdfBase64, 'base64');
            pdfFilename = `Cotizacion_${ticketNumber || 'MSA'}.pdf`;
        }
        await (0, emailService_1.sendEmail)({
            to,
            subject,
            html: htmlBody,
            pdfBuffer,
            pdfFilename
        });
        res.json({ success: true, message: `Correo enviado exitosamente a ${to}` });
    }
    catch (error) {
        logger_1.default.error('Error POST /api/email/send:', error);
        res.status(500).json({ error: error.message || 'Error al enviar correo' });
    }
});
exports.default = router;
