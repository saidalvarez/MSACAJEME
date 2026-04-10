import Cliente from './Cliente';
import Expense from './Expense';
import HistorialTicket from './HistorialTicket';
import Inventory from './Inventory';
import ItemCatalogo from './ItemCatalogo';
import ItemHistorial from './ItemHistorial';
import ItemTicket from './ItemTicket';
import Sale from './Sale';
import SaleItem from './SaleItem';
import Ticket from './Ticket';
import Usuario from './Usuario';
import AuditLog from './AuditLog';

// Associations - Active Tickets
Ticket.hasMany(ItemTicket, { foreignKey: 'ticket_id', as: 'items' });
ItemTicket.belongsTo(Ticket, { foreignKey: 'ticket_id' });

// Associations - Historial Tickets
HistorialTicket.hasMany(ItemHistorial, { foreignKey: 'historial_ticket_id', as: 'items' });
ItemHistorial.belongsTo(HistorialTicket, { foreignKey: 'historial_ticket_id' });

// Associations - Sales
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id' });

export {
  Cliente,
  Expense,
  HistorialTicket,
  Inventory,
  ItemCatalogo,
  ItemHistorial,
  ItemTicket,
  Sale,
  SaleItem,
  Ticket,
  Usuario,
  AuditLog
};
