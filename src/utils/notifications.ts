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
 * Formatea un mensaje estándar para un ticket de servicio.
 */
export const formatTicketMessage = (clientName: string, ticketNumber: string | number, status: string, total: number, items?: any[]) => {
  const statusLabel = getStatusLabel(status);
  
  let itemsDetail = '';
  if (items && items.length > 0) {
    itemsDetail = `\n📋 *Detalle de servicios:*\n`;
    items.forEach((item: any, i: number) => {
      const name = item.name || item.brand || 'Servicio';
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      itemsDetail += `   ${i + 1}. ${name} x${qty} — $${(price * qty).toLocaleString('es-MX')}\n`;
    });
  }

  return `Hola *${clientName}*, le saludamos de *Multiservicios Automotriz de Cajeme*. 🚗💨
  
Su servicio con folio *#${ticketNumber}* se encuentra: *${statusLabel}*.
${itemsDetail}
💰 *Total:* $${total.toLocaleString('es-MX')}

${status === 'pending' ? '⏳ _Su vehículo está siendo atendido. Le notificaremos cuando esté listo._' : ''}${status === 'completed' ? '✅ _Su vehículo está listo para recoger._' : ''}

Si tiene alguna duda o desea *confirmar esta cotización*, responda a este mensaje. ¡Gracias por su confianza!`;
};

