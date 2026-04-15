import Cliente from './Cliente';
import Expense from './Expense';
import Inventory from './Inventory';
import ItemCatalogo from './ItemCatalogo';
import ItemTicket from './ItemTicket';
import Sale from './Sale';
import SaleItem from './SaleItem';
import Ticket from './Ticket';
import Usuario from './Usuario';
import AuditLog from './AuditLog';

// Associations - Tickets (Active & Archived)
Ticket.hasMany(ItemTicket, { foreignKey: 'ticket_id', as: 'items' });
ItemTicket.belongsTo(Ticket, { foreignKey: 'ticket_id' });

// Associations - Sales
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id' });

export {
  Cliente,
  Expense,
  Inventory,
  ItemCatalogo,
  ItemTicket,
  Sale,
  SaleItem,
  Ticket,
  Usuario,
  AuditLog
};
