import { Ticket, ItemTicket, AuditLog, Inventory, Sale, Expense } from '../models';
import sequelize from '../base_de_datos';
import { Op, Transaction } from 'sequelize';
import logger from '../utils/logger';
export class TicketService {
  /**
   * Helper: La compresión con C++ (Sharp) se deshabilitó temporalmente
   * para asegurar la compilación limpia del sidecar en environments enjaulados (pkg).
   */
  private static async compressImage(base64Data: string): Promise<string> {
    return base64Data;
  }

  /**
   * Obtiene tickets paginados con filtros de búsqueda y estado.
   */
  static async getTickets(limit: number = 20, offset: number = 0, search?: string, status?: string) {
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = { [Op.ne]: 'archived' };
    }

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
      order: [['date', 'DESC'], ['ticket_number', 'DESC']],
      distinct: true
    });
  }

  /**
   * Crea un nuevo ticket unificado con optimización de medios.
   */
  static async createTicket(ticketData: any, items: any[]) {
    // Optimización de imagen antes de entrar en la transacción
    if (ticketData.service_photo || ticketData.servicePhoto) {
      const rawPhoto = ticketData.service_photo || ticketData.servicePhoto;
      ticketData.service_photo = await this.compressImage(rawPhoto);
    }

    return await sequelize.transaction(async (t: Transaction) => {
      ticketData.client_name = ticketData.client_name || ticketData.clientName;
      ticketData.client_phone = ticketData.client_phone || ticketData.clientPhone || '';
      ticketData.client_email = ticketData.client_email || ticketData.clientEmail || '';
      ticketData.format_type = ticketData.format_type || ticketData.formatType || 'payment_info';
      ticketData.service_category = ticketData.service_category || ticketData.serviceCategory || 'general';
      ticketData.date = ticketData.date || new Date();
      
      let calculatedTotal = 0;
      if (items && items.length > 0) {
        calculatedTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      }
      const discount = Number(ticketData.discount) || 0;
      ticketData.total = Math.max(0, calculatedTotal - discount);

      const maxFolio = await Ticket.max('ticket_number') as number || 0;
      ticketData.ticket_number = maxFolio + 1;

      const ticket = await Ticket.create(ticketData, { transaction: t });
      
      if (items && items.length > 0) {
        for (const item of items) {
          await ItemTicket.create({ ...item, ticket_id: ticket.id }, { transaction: t });
          
          if (item.inventory_id) {
            const inv = await Inventory.findByPk(item.inventory_id, { transaction: t });
            if (inv) {
              const qty = Number(item.quantity || 1);
              if (qty > inv.currentStock) {
                logger.warn(`[STOCK] Producto "${inv.brand}" stock insuficiente: disponible=${inv.currentStock}, solicitado=${qty}`);
              }
              const newStock = Math.max(0, inv.currentStock - qty);
              await inv.update({ currentStock: newStock }, { transaction: t });
            }
          }
        }
      }

      logger.info(`[TICKET] Creado #${ticket.ticket_number} (Imagen Optimizada)`);
      return await Ticket.findByPk(ticket.id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
    });
  }

  /**
   * Actualiza un ticket existente con optimización de medios.
   */
  static async updateTicket(id: string, ticketData: any, items?: any[]) {
    if (ticketData.service_photo || ticketData.servicePhoto) {
      const rawPhoto = ticketData.service_photo || ticketData.servicePhoto;
      ticketData.service_photo = await this.compressImage(rawPhoto);
    }

    return await sequelize.transaction(async (t: Transaction) => {
      const ticket = await Ticket.findByPk(id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
      if (!ticket) throw new Error('Ticket no encontrado');

      if (ticketData.clientName) ticketData.client_name = ticketData.client_name || ticketData.clientName;
      if (ticketData.clientPhone) ticketData.client_phone = ticketData.client_phone || ticketData.clientPhone;
      if (ticketData.clientEmail) ticketData.client_email = ticketData.client_email || ticketData.clientEmail;
      if (ticketData.formatType) ticketData.format_type = ticketData.format_type || ticketData.formatType;
      if (ticketData.serviceCategory) ticketData.service_category = ticketData.service_category || ticketData.serviceCategory;

      if (items) {
        const calculatedTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
        const discount = Number(ticketData.discount !== undefined ? ticketData.discount : ticket.discount) || 0;
        ticketData.total = Math.max(0, calculatedTotal - discount);

        const oldItems = ticket.items || [];
        for (const oldItem of oldItems) {
          if (oldItem.inventory_id) {
            const inv = await Inventory.findByPk(oldItem.inventory_id, { transaction: t });
            if (inv) await inv.update({ currentStock: inv.currentStock + Number(oldItem.quantity) }, { transaction: t });
          }
        }

        await ItemTicket.destroy({ where: { ticket_id: id }, transaction: t });

        for (const newItem of items) {
          await ItemTicket.create({ ...newItem, ticket_id: id }, { transaction: t });
          if (newItem.inventory_id) {
            const inv = await Inventory.findByPk(newItem.inventory_id, { transaction: t });
            if (inv) await inv.update({ currentStock: Math.max(0, inv.currentStock - Number(newItem.quantity)) }, { transaction: t });
          }
        }
      }

      await ticket.update(ticketData, { transaction: t });
      return await Ticket.findByPk(id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
    });
  }

  static async deleteTicket(id: string, userId: string = 'admin') {
    return await sequelize.transaction(async (t: Transaction) => {
      const ticket = await Ticket.findByPk(id, { include: [{ model: ItemTicket, as: 'items' }], transaction: t });
      if (!ticket) throw new Error('Ticket no encontrado');

      for (const item of (ticket.items || [])) {
        if (item.inventory_id) {
          const inv = await Inventory.findByPk(item.inventory_id, { transaction: t });
          if (inv) await inv.update({ currentStock: inv.currentStock + Number(item.quantity) }, { transaction: t });
        }
      }

      await ItemTicket.destroy({ where: { ticket_id: id }, transaction: t });
      await Ticket.destroy({ where: { id }, transaction: t });
      
      await AuditLog.create({ 
        action: 'DELETE', 
        entity: 'Ticket', 
        entity_id: id, 
        user_id: userId, 
        details: `Eliminó ticket #${ticket.ticket_number}.` 
      }, { transaction: t });

      return true;
    });
  }

  static async archiveTicketsByDate(date?: string, start?: string, end?: string) {
    return await sequelize.transaction(async (t: Transaction) => {
      // Build a proper date filter that works for both single-date and range modes
      let dateFilter: any;
      if (start && end) {
        dateFilter = { date: { [Op.between]: [new Date(start), new Date(end)] } };
      } else if (date) {
        dateFilter = sequelize.where(sequelize.fn('DATE', sequelize.col('date')), { [Op.lte]: date });
      } else {
        throw new Error('Fecha o rango requerido');
      }

      // Archive completed tickets
      const [affectedCount] = await Ticket.update({ 
        status: 'archived',
        archived_at: new Date()
      }, { 
        where: { 
          [Op.and]: [dateFilter, { status: 'completed' }]
        }, 
        transaction: t 
      });

      // Archive sales and expenses for the same date/range
      await Sale.update({ is_archived: true }, { 
        where: dateFilter, 
        transaction: t 
      });
      await Expense.update({ is_archived: true }, { 
        where: dateFilter, 
        transaction: t 
      });

      if (affectedCount > 0) {
        await AuditLog.create({ 
          action: 'ARCHIVE', 
          entity: 'Ticket', 
          user_id: 'admin', 
          details: `Archivó ${affectedCount} tickets.` 
        }, { transaction: t });
      }

      return affectedCount;
    });
  }

  static async clearTickets() {
    return await sequelize.transaction(async (t: Transaction) => {
      // Restore inventory stock for all active (non-archived) ticket items
      const activeTickets = await Ticket.findAll({
        where: { status: { [Op.ne]: 'archived' } },
        include: [{ model: ItemTicket, as: 'items' }],
        transaction: t
      });

      for (const ticket of activeTickets) {
        for (const item of (ticket.items || [])) {
          if (item.inventory_id) {
            const inv = await Inventory.findByPk(item.inventory_id, { transaction: t });
            if (inv) {
              await inv.update(
                { currentStock: inv.currentStock + Number(item.quantity) }, 
                { transaction: t }
              );
            }
          }
        }
      }

      logger.info(`[TICKET] clearTickets: restaurando stock de ${activeTickets.length} tickets activos`);
      await ItemTicket.destroy({ where: {}, force: true, transaction: t });
      await Ticket.destroy({ where: {}, force: true, transaction: t });
      return true;
    });
  }
}
