import { Ticket, ItemTicket, HistorialTicket, ItemHistorial, AuditLog, Inventory, Sale, Expense } from '../models';
import sequelize from '../base_de_datos';
import { Op, Transaction } from 'sequelize';

export class TicketService {
  static async getTickets(limit: number = 500, offset: number = 0, search?: string) {
    const whereClause: any = {};
    
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('client_name')), { [Op.like]: searchTerm }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('vehicle')), { [Op.like]: searchTerm }),
      ];
      const numSearch = parseInt(search, 10);
      if (!isNaN(numSearch)) {
        whereClause[Op.or].push({ ticket_number: numSearch });
      }
    }
    
    return await Ticket.findAndCountAll({ 
      where: whereClause,
      include: [{ model: ItemTicket, as: 'items' }],
      limit,
      offset,
      order: [['date', 'DESC']] 
    });
  }

  static async createTicket(ticketData: any, items: any[]) {
    return await sequelize.transaction(async (t: Transaction) => {
      // Robust CamelCase -> snake_case field mapping
      ticketData.client_name = ticketData.client_name || ticketData.clientName;
      ticketData.client_phone = ticketData.client_phone || ticketData.clientPhone || '';
      ticketData.client_email = ticketData.client_email || ticketData.clientEmail || '';
      ticketData.format_type = ticketData.format_type || ticketData.formatType || 'payment_info';
      ticketData.service_photo = ticketData.service_photo || ticketData.servicePhoto || '';
      ticketData.service_category = ticketData.service_category || ticketData.serviceCategory || 'general';
      
      let calculatedTotal = 0;
      if (items && items.length > 0) {
        calculatedTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      }
      const discount = Number(ticketData.discount) || 0;
      ticketData.total = Math.max(0, calculatedTotal - discount);

      // GLOBAL FOLIO GENERATION
      const [maxActive, maxHistorial] = await Promise.all([
        Ticket.max('ticket_number') as Promise<number | null>,
        HistorialTicket.max('ticket_number') as Promise<number | null>
      ]);
      const nextTicketNumber = Math.max(maxActive || 0, maxHistorial || 0) + 1;
      ticketData.ticket_number = nextTicketNumber;

      const ticket = await Ticket.create(ticketData, { transaction: t });
      
      if (items && items.length > 0) {
        for (const item of items) {
          await ItemTicket.create({ ...item, ticket_id: ticket.id }, { transaction: t });
          
          if (item.inventory_id) {
            const inv = await Inventory.findByPk(item.inventory_id, { transaction: t });
            if (inv) {
              const qty = Number(item.quantity || 1);
              const newStock = Math.max(0, inv.currentStock - qty);
              await inv.update({ currentStock: newStock }, { transaction: t });
            }
          }
        }
      }

      return await Ticket.findByPk(ticket.id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
    });
  }

  static async updateTicket(id: string, ticketData: any, items?: any[]) {
    return await sequelize.transaction(async (t: Transaction) => {
      // Robust CamelCase -> snake_case field mapping
      if (ticketData.clientName) ticketData.client_name = ticketData.client_name || ticketData.clientName;
      if (ticketData.clientPhone) ticketData.client_phone = ticketData.client_phone || ticketData.clientPhone;
      if (ticketData.clientEmail) ticketData.client_email = ticketData.client_email || ticketData.clientEmail;
      if (ticketData.formatType) ticketData.format_type = ticketData.format_type || ticketData.formatType;
      if (ticketData.servicePhoto) ticketData.service_photo = ticketData.service_photo || ticketData.servicePhoto;
      if (ticketData.serviceCategory) ticketData.service_category = ticketData.service_category || ticketData.serviceCategory;

      let calculatedTotal = 0;
      if (items && items.length > 0) {
        calculatedTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      } else {
        calculatedTotal = Number(ticketData.total || 0);
      }
      
      if (items) {
        const discount = Number(ticketData.discount) || 0;
        ticketData.total = Math.max(0, calculatedTotal - discount);
      }

      const ticket = await Ticket.findByPk(id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
      if (!ticket) throw new Error('Ticket not found');
      
      if (items) {
        const oldItems = ticket.items || [];
        const newItems = items;

        // Restore removed/changed items
        for (const oldItem of oldItems) {
          if (oldItem.inventory_id) {
            const matchingNew = newItems.find(ni => ni.inventory_id === oldItem.inventory_id || (ni.brand === oldItem.brand && ni.type === oldItem.type && ni.viscosity === oldItem.viscosity));
            
            if (!matchingNew) {
              const inv = await Inventory.findByPk(oldItem.inventory_id, { transaction: t });
              if (inv) await inv.update({ currentStock: inv.currentStock + Number(oldItem.quantity) }, { transaction: t });
            } else {
              const diff = Number(oldItem.quantity) - Number(matchingNew.quantity);
              if (diff !== 0) {
                const inv = await Inventory.findByPk(oldItem.inventory_id, { transaction: t });
                if (inv) await inv.update({ currentStock: inv.currentStock + diff }, { transaction: t });
              }
            }
          }
        }

        // Deduct new items
        for (const newItem of newItems) {
          if (newItem.inventory_id) {
            const wasInOld = oldItems.some(oi => oi.inventory_id === newItem.inventory_id || (oi.brand === newItem.brand && oi.type === newItem.type && oi.viscosity === newItem.viscosity));
            if (!wasInOld) {
              const inv = await Inventory.findByPk(newItem.inventory_id, { transaction: t });
              if (inv) await inv.update({ currentStock: inv.currentStock - Number(newItem.quantity) }, { transaction: t });
            }
          }
        }

        await ItemTicket.destroy({ where: { ticket_id: ticket.id }, transaction: t });
        await Promise.all(items.map((item: any) => ItemTicket.create({ ...item, ticket_id: ticket.id }, { transaction: t })));
      }

      await ticket.update(ticketData, { transaction: t });
      return await Ticket.findByPk(ticket.id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
    });
  }

  static async deleteTicket(id: string, userId: string = 'admin') {
    return await sequelize.transaction(async (t: Transaction) => {
      const ticket = await Ticket.findByPk(id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
      if (!ticket) throw new Error('Ticket not found');

      if (ticket.items && ticket.items.length > 0) {
        for (const item of ticket.items) {
          if (item.inventory_id) {
            const inv = await Inventory.findByPk(item.inventory_id, { transaction: t });
            if (inv) {
              const qty = Number(item.quantity || 1);
              await inv.update({ currentStock: inv.currentStock + qty }, { transaction: t });
            }
          }
        }
      }

      await ItemTicket.destroy({ where: { ticket_id: id }, transaction: t });
      await Ticket.destroy({ where: { id }, transaction: t });
      
      await AuditLog.create({ 
        action: 'DELETE', 
        entity: 'Ticket', 
        entity_id: id, 
        user_id: userId, 
        details: `Deleted ticket ${ticket.ticket_number} and restored inventory` 
      }, { transaction: t });

      return true;
    });
  }

  static async archiveTicketsByDate(date?: string, start?: string, end?: string) {
    return await sequelize.transaction(async (t: Transaction) => {
      let startRange: Date, endRange: Date;

      if (start && end) {
        startRange = new Date(start);
        endRange = new Date(end);
      } else if (date) {
        startRange = new Date(`${date}T00:00:00`);
        endRange = new Date(`${date}T23:59:59`);
      } else {
        throw new Error('Date or range is required');
      }

      const ticketsToArchive = await Ticket.findAll({
        where: { date: { [Op.between]: [startRange, endRange] }, status: 'completed' },
        include: [{ model: ItemTicket, as: 'items' }],
        transaction: t
      });

      if (ticketsToArchive.length === 0) return 0;

      for (const ticket of ticketsToArchive) {
        const ticketData = ticket.toJSON() as any;
        
        await HistorialTicket.create({
          id: ticketData.id,
          ticket_number: ticketData.ticket_number,
          client_name: ticketData.client_name,
          client_phone: ticketData.client_phone,
          client_email: ticketData.client_email,
          vehicle: ticketData.vehicle,
          total: ticketData.total,
          status: ticketData.status,
          format_type: ticketData.format_type,
          notes: ticketData.notes,
          discount: ticketData.discount,
          date: ticketData.date,
          service_photo: ticketData.service_photo,
          service_category: ticketData.service_category || 'general',
          archived_at: new Date()
        }, { transaction: t });

        if (ticketData.items && ticketData.items.length > 0) {
          for (const item of ticketData.items) {
            await ItemHistorial.create({
              historial_ticket_id: ticketData.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              inventory_id: item.inventory_id,
              image: item.image
            }, { transaction: t });
          }
        }

        await ItemTicket.destroy({ where: { ticket_id: ticketData.id }, transaction: t });
        await Ticket.destroy({ where: { id: ticketData.id }, transaction: t });
      }


      await Sale.update({ is_archived: true }, { where: { date: { [Op.between]: [startRange, endRange] } }, transaction: t });
      await Expense.update({ is_archived: true }, { where: { date: { [Op.between]: [startRange, endRange] } }, transaction: t });

      await AuditLog.create({ 
        action: 'ARCHIVE', 
        entity: 'Ticket', 
        user_id: 'admin', 
        details: `Archived ${ticketsToArchive.length} tickets to historial` 
      }, { transaction: t });

      return ticketsToArchive.length;
    });
  }

  static async clearTickets() {
    await ItemTicket.destroy({ where: {}, truncate: true });
    await Ticket.destroy({ where: {}, truncate: true });
    return true;
  }
}
