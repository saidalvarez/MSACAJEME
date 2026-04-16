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
   * Calcula el total quirúrgico del ticket considerando impuestos y descuentos.
   * Réplica exacta de la lógica del frontend para consistencia total.
   */
  private static calculateTotal(items: any[], formatType: string, discountPercent: number = 0): number {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const discountAmount = subtotal * (Number(discountPercent || 0) / 100);
    const baseTotal = subtotal - discountAmount;

    const hasIVA = formatType === 'payment_info' || formatType === 'payment_no_retention';
    const hasRetencion = formatType === 'payment_info';

    const iva = hasIVA ? baseTotal * 0.16 : 0;
    const retencion = hasRetencion ? baseTotal * 0.0125 : 0;

    const grandTotal = baseTotal + iva - retencion;
    return Math.max(0, Number(grandTotal.toFixed(2)));
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
      
      const discount = Number(ticketData.discount) || 0; 
      ticketData.total = this.calculateTotal(items || [], ticketData.format_type, discount);

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
              const available = inv.currentStock - inv.reservedStock;
              
              if (qty > available) {
                logger.warn(`[STOCK] Producto "${inv.brand}" insuficiente para reserva: disponible=${available}, solicitado=${qty}`);
              }

              if (ticket.status === 'pending') {
                await inv.update({ reservedStock: inv.reservedStock + qty }, { transaction: t });
              } else if (ticket.status === 'completed') {
                await inv.update({ currentStock: Math.max(0, inv.currentStock - qty) }, { transaction: t });
              }
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
        const discount = Number(ticketData.discount !== undefined ? ticketData.discount : (ticketData.discountPercent || ticket.discount)) || 0;
        const formatType = ticketData.format_type || ticket.format_type;
        ticketData.total = this.calculateTotal(items, formatType, discount);

        const oldItems = ticket.items || [];
        const oldStatus = ticket.status;
        const newStatus = ticketData.status || oldStatus;

        // Restore old stock based on old status
        for (const oldItem of oldItems) {
          if (oldItem.inventory_id) {
            const inv = await Inventory.findByPk(oldItem.inventory_id, { transaction: t });
            if (inv) {
              const qty = Number(oldItem.quantity);
              if (oldStatus === 'pending') {
                await inv.update({ reservedStock: Math.max(0, inv.reservedStock - qty) }, { transaction: t });
              } else if (oldStatus === 'completed' || oldStatus === 'archived') {
                await inv.update({ currentStock: inv.currentStock + qty }, { transaction: t });
              }
            }
          }
        }

        await ItemTicket.destroy({ where: { ticket_id: id }, transaction: t });

        // Apply new stock based on new status
        for (const newItem of items) {
          await ItemTicket.create({ ...newItem, ticket_id: id }, { transaction: t });
          if (newItem.inventory_id) {
            const inv = await Inventory.findByPk(newItem.inventory_id, { transaction: t });
            if (inv) {
              const qty = Number(newItem.quantity);
              if (newStatus === 'pending') {
                await inv.update({ reservedStock: inv.reservedStock + qty }, { transaction: t });
              } else if (newStatus === 'completed') {
                await inv.update({ currentStock: Math.max(0, inv.currentStock - qty) }, { transaction: t });
              }
            }
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
          if (inv) {
            const qty = Number(item.quantity);
            if (ticket.status === 'pending') {
              await inv.update({ reservedStock: Math.max(0, inv.reservedStock - qty) }, { transaction: t });
            } else if (ticket.status === 'completed' || ticket.status === 'archived') {
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
