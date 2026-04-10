export const formatCurrency = (amount: number) => {
  const safeAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(safeAmount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatPdfFileName = (clientName: string = '', prefix: string = 'Cotizacion', suffix: string | number = '') => {
  const nameParts = clientName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.length > 1 ? nameParts[1] : '';
  const cleanName = `${firstName}${lastName ? '+' + lastName : ''}`.replace(/[^A-Za-z0-9\+]/g, '');
  const sufxStr = suffix ? `_#${suffix}` : '';
  return `${prefix}_${cleanName}${sufxStr}.pdf`;
};