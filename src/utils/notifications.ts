/**
 * Abre un enlace de WhatsApp con un mensaje preestablecido.
 */
export const sendWhatsAppNotification = (phone: string, message: string) => {
  // Limpiar el teléfono para que solo tenga números
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Agregar prefijo de país si no lo tiene (México +52 por defecto)
  const finalPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
  
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${finalPhone}?text=${encodedMessage}`;
  
  window.open(url, '_blank');
};

/**
 * Mapea status interno a etiqueta en español
 */
export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': 'PENDIENTE',
    'completed': 'COMPLETADO',
    'cancelled': 'CANCELADO',
    'quote': 'COTIZACIÓN'
  };
  return labels[status] || status.toUpperCase();
};

/**
 * Formatea un mensaje estándar para un ticket de servicio con desglose Platinum.
 */
export const formatTicketMessage = (
  clientName: string, 
  ticketNumber: string | number, 
  status: string, 
  total: number, 
  items?: any[],
  subtotal: number = 0,
  iva: number = 0,
  retencion: number = 0,
  discount: number = 0
) => {
  const statusLabel = getStatusLabel(status);
  
  let itemsDetail = '';
  if (items && items.length > 0) {
    itemsDetail = `\n⚙️ *Detalle de servicios:*\n`;
    items.forEach((item: any) => {
      const name = item.name || item.brand || 'Servicio';
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      itemsDetail += `• ${name} (${qty}x) — _$${(price * qty).toLocaleString('es-MX')}_\n`;
    });
  }

  const financialSummary = `
📊 *Resumen Financiero:*
   - Subtotal Neto: $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
   ${discount > 0 ? `   - Descuento (${discount}%): -$${(subtotal * (discount / 100)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` : ''}${iva > 0 ? `   - IVA (16%): +$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` : ''}${retencion > 0 ? `   - Retenciones: -$${retencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` : ''}   *TOTAL FINAL: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}*`;

  return `🪽 *Multiservicios Automotriz de Cajeme*
_Ingeniería en Servicios_

Hola *${clientName}*, le enviamos el detalle de su servicio con folio *#${ticketNumber}*.

📍 *Estado:* ${statusLabel}
${itemsDetail}${financialSummary}

${status === 'pending' ? '⏳ _Su vehículo está siendo atendido por nuestros expertos. Le avisaremos en cuanto esté listo._' : ''}${status === 'completed' ? '✅ _Su vehículo está listo. Puede pasar a recogerlo a nuestras instalaciones._' : ''}

Si desea confirmar esta cotización o tiene dudas, por favor responda a este mensaje. 🪽`;
};
