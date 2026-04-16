import express from 'express';
import { sendEmail } from '../services/emailService';
import verifyToken from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

// POST /api/email/send — Enviar correo con PDF adjunto
router.post('/send', async (req, res) => {
  try {
    const { to, subject, ticketNumber, clientName, vehicle, date, total, subtotal, iva, retencion, discount, items, pdfBase64 } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Se requiere destinatario y asunto' });
    }

    const dateObj = date ? new Date(date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    // Build Premium HTML body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased; }
          .container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.04); }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 40px; text-align: center; border-bottom: 3px solid #3b82f6; }
          .content { padding: 35px 40px; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          .title { color: #ffffff; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
          .subtitle { color: #60a5fa; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px; opacity: 0.8; }
          .welcome { color: #0f172a; font-size: 18px; font-weight: 800; margin-bottom: 6px; }
          .text { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
          
          .info-grid { display: table; width: 100%; margin-bottom: 25px; border-collapse: separate; border-spacing: 0 8px; }
          .info-item { display: table-row; }
          .info-label { display: table-cell; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #f8fafc; }
          .info-value { display: table-cell; color: #1e293b; font-size: 13px; font-weight: 700; text-align: right; padding: 8px 0; border-bottom: 1px solid #f8fafc; }

          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .items-header { text-align: left; border-bottom: 2px solid #f1f5f9; }
          .items-header th { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; padding: 10px 0; }
          .items-row td { padding: 12px 0; border-bottom: 1px solid #f8fafc; font-size: 13px; color: #334155; }
          .item-qty { color: #3b82f6; font-weight: 800; width: 35px; }
          .item-name { font-weight: 600; }
          .item-price { text-align: right; font-weight: 700; color: #0f172a; }

          .summary-card { background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 15px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .summary-label { color: #64748b; font-size: 12px; font-weight: 500; }
          .summary-value { color: #1e293b; font-size: 12px; font-weight: 700; text-align: right; }
          
          .grand-total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .total-label { color: #0f172a; font-size: 13px; font-weight: 800; text-transform: uppercase; }
          .total-value { color: #059669; font-size: 24px; font-weight: 900; }

          .legal { margin-top: 20px; color: #cbd5e1; font-style: italic; font-size: 10px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">Multiservicios Automotriz de Cajeme🪽</h1>
            <p class="subtitle">EXCELENCIA AUTOMOTRIZ</p>
          </div>
          
          <div class="content">
            <p class="welcome">Estimado(a) ${clientName || 'Cliente'} 🪽</p>
            <p class="text">
              Adjuntamos su presupuesto detallado. Valoramos su confianza. 🪽
            </p>
            
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">📋 Nº Folio</span>
                <span class="info-value">#${ticketNumber || 'TKT-000'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">🚗 Vehículo</span>
                <span class="info-value">${vehicle || '--'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">🕒 Fecha y Hora</span>
                <span class="info-value">${formattedDate} • ${formattedTime}</span>
              </div>
            </div>

            ${items && items.length > 0 ? `
              <table class="items-table">
                <tr class="items-header">
                  <th>⚙️</th>
                  <th>Concepto</th>
                  <th style="text-align: right;">Precio</th>
                </tr>
                ${items.map((item: any) => `
                  <tr class="items-row">
                    <td class="item-qty">${item.quantity || 1}x</td>
                    <td class="item-name">${item.name}</td>
                    <td class="item-price">$${Number(item.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </table>
            ` : ''}

            <div class="summary-card">
              <div class="summary-row">
                <span class="summary-label">Subtotal Neto</span>
                <span class="summary-value">$${Number(subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              ${discount ? `
                <div class="summary-row">
                  <span class="summary-label">Descuento aplicado</span>
                  <span class="summary-value text-danger" style="color: #ef4444;">-${discount}%</span>
                </div>
              ` : ''}
              ${iva ? `
                <div class="summary-row">
                  <span class="summary-label">Impuesto IVA (16%)</span>
                  <span class="summary-value">+$${Number(iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              ${retencion ? `
                <div class="summary-row" style="color: #ef4444;">
                  <span class="summary-label">Retenciones</span>
                  <span class="summary-value">-$${Number(retencion).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              
              <div class="grand-total">
                <span class="total-label">Total Final</span>
                <span class="total-value">$${Number(total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p style="margin-bottom: 10px; font-weight: 800; color: #64748b; letter-spacing: 1px;">MULTISERVICIOS CAJEME</p>
            <p style="margin-bottom: 5px;">Calle 6 de Abril #516, Col. Centro</p>
            <p style="margin-bottom: 20px;">WhatsApp: 644 145 2026 | Cd. Obregón, Sonora</p>
            
            <div class="legal">
              Este documento es una notificación oficial generada por nuestro sistema. La información contenida es confidencial y para uso exclusivo del destinatario.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Convert base64 PDF to buffer if provided
    let pdfBuffer: Buffer | undefined;
    let pdfFilename: string | undefined;
    
    if (pdfBase64) {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      pdfFilename = `Cotizacion_${ticketNumber || 'MSA'}.pdf`;
    }

    await sendEmail({
      to,
      subject,
      html: htmlBody,
      pdfBuffer,
      pdfFilename
    });

    res.json({ success: true, message: `Correo enviado exitosamente a ${to}` });
  } catch (error: any) {
    logger.error('Error POST /api/email/send:', error);
    res.status(500).json({ error: error.message || 'Error al enviar correo' });
  }
});

export default router;
