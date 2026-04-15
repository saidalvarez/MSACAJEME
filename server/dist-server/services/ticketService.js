"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketService = void 0;
const models_1 = require("../models");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("../utils/logger"));
const sharp_1 = __importDefault(require("sharp"));
class TicketService {
    /**
     * Helper: Comprime una imagen en Base64 para optimizar almacenamiento.
     * Redimensiona a un máximo de 1024px y reduce calidad JPEG.
     */
    static async compressImage(base64Data) {
        if (!base64Data || !base64Data.startsWith('data:image'))
            return base64Data;
        try {
            const parts = base64Data.split(';base64,');
            if (parts.length !== 2)
                return base64Data;
            const mimeType = parts[0].split(':')[1];
            const buffer = Buffer.from(parts[1], 'base64');
            // Si el buffer ya es pequeño (< 100KB), no comprimimos más
            if (buffer.length < 100 * 1024)
                return base64Data;
            const compressedBuffer = await (0, sharp_1.default)(buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 70, mozjpeg: true })
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        }
        catch (error) {
            logger_1.default.error('[COMPRESSION] Error al procesar imagen:', error.message);
            return base64Data; // Fallback a la original si falla
        }
    }
    /**
     * Obtiene tickets paginados con filtros de búsqueda y estado.
     */
    static async getTickets(limit = 20, offset = 0, search, status) {
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        else {
            whereClause.status = { [sequelize_1.Op.ne]: 'archived' };
        }
        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause[sequelize_1.Op.or] = [
                base_de_datos_1.default.where(base_de_datos_1.default.fn('LOWER', base_de_datos_1.default.col('client_name')), { [sequelize_1.Op.like]: searchTerm }),
                base_de_datos_1.default.where(base_de_datos_1.default.fn('LOWER', base_de_datos_1.default.col('vehicle')), { [sequelize_1.Op.like]: searchTerm }),
            ];
            const numSearch = parseInt(search, 10);
            if (!isNaN(numSearch)) {
                whereClause[sequelize_1.Op.or].push({ ticket_number: numSearch });
            }
        }
        return await models_1.Ticket.findAndCountAll({
            where: whereClause,
            include: [{ model: models_1.ItemTicket, as: 'items' }],
            limit,
            offset,
            order: [['date', 'DESC'], ['ticket_number', 'DESC']],
            distinct: true
        });
    }
    /**
     * Crea un nuevo ticket unificado con optimización de medios.
     */
    static async createTicket(ticketData, items) {
        // Optimización de imagen antes de entrar en la transacción
        if (ticketData.service_photo || ticketData.servicePhoto) {
            const rawPhoto = ticketData.service_photo || ticketData.servicePhoto;
            ticketData.service_photo = await this.compressImage(rawPhoto);
        }
        return await base_de_datos_1.default.transaction(async (t) => {
            ticketData.client_name = ticketData.client_name || ticketData.clientName;
            ticketData.client_phone = ticketData.client_phone || ticketData.clientPhone || '';
            ticketData.client_email = ticketData.client_email || ticketData.clientEmail || '';
            ticketData.format_type = ticketData.format_type || ticketData.formatType || 'payment_info';
            ticketData.service_category = ticketData.service_category || ticketData.serviceCategory || 'general';
            let calculatedTotal = 0;
            if (items && items.length > 0) {
                calculatedTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
            }
            const discount = Number(ticketData.discount) || 0;
            ticketData.total = Math.max(0, calculatedTotal - discount);
            const maxFolio = await models_1.Ticket.max('ticket_number') || 0;
            ticketData.ticket_number = maxFolio + 1;
            const ticket = await models_1.Ticket.create(ticketData, { transaction: t });
            if (items && items.length > 0) {
                for (const item of items) {
                    await models_1.ItemTicket.create({ ...item, ticket_id: ticket.id }, { transaction: t });
                    if (item.inventory_id) {
                        const inv = await models_1.Inventory.findByPk(item.inventory_id, { transaction: t });
                        if (inv) {
                            const qty = Number(item.quantity || 1);
                            if (qty > inv.currentStock) {
                                logger_1.default.warn(`[STOCK] Producto "${inv.brand}" stock insuficiente: disponible=${inv.currentStock}, solicitado=${qty}`);
                            }
                            const newStock = Math.max(0, inv.currentStock - qty);
                            await inv.update({ currentStock: newStock }, { transaction: t });
                        }
                    }
                }
            }
            logger_1.default.info(`[TICKET] Creado #${ticket.ticket_number} (Imagen Optimizada)`);
            return await models_1.Ticket.findByPk(ticket.id, { include: [{ model: models_1.ItemTicket, as: 'items' }], transaction: t });
        });
    }
    /**
     * Actualiza un ticket existente con optimización de medios.
     */
    static async updateTicket(id, ticketData, items) {
        if (ticketData.service_photo || ticketData.servicePhoto) {
            const rawPhoto = ticketData.service_photo || ticketData.servicePhoto;
            ticketData.service_photo = await this.compressImage(rawPhoto);
        }
        return await base_de_datos_1.default.transaction(async (t) => {
            const ticket = await models_1.Ticket.findByPk(id, { include: [{ model: models_1.ItemTicket, as: 'items' }], transaction: t });
            if (!ticket)
                throw new Error('Ticket no encontrado');
            if (ticketData.clientName)
                ticketData.client_name = ticketData.client_name || ticketData.clientName;
            if (ticketData.clientPhone)
                ticketData.client_phone = ticketData.client_phone || ticketData.clientPhone;
            if (ticketData.clientEmail)
                ticketData.client_email = ticketData.client_email || ticketData.clientEmail;
            if (ticketData.formatType)
                ticketData.format_type = ticketData.format_type || ticketData.formatType;
            if (ticketData.serviceCategory)
                ticketData.service_category = ticketData.service_category || ticketData.serviceCategory;
            if (items) {
                const calculatedTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
                const discount = Number(ticketData.discount !== undefined ? ticketData.discount : ticket.discount) || 0;
                ticketData.total = Math.max(0, calculatedTotal - discount);
                const oldItems = ticket.items || [];
                for (const oldItem of oldItems) {
                    if (oldItem.inventory_id) {
                        const inv = await models_1.Inventory.findByPk(oldItem.inventory_id, { transaction: t });
                        if (inv)
                            await inv.update({ currentStock: inv.currentStock + Number(oldItem.quantity) }, { transaction: t });
                    }
                }
                await models_1.ItemTicket.destroy({ where: { ticket_id: id }, transaction: t });
                for (const newItem of items) {
                    await models_1.ItemTicket.create({ ...newItem, ticket_id: id }, { transaction: t });
                    if (newItem.inventory_id) {
                        const inv = await models_1.Inventory.findByPk(newItem.inventory_id, { transaction: t });
                        if (inv)
                            await inv.update({ currentStock: Math.max(0, inv.currentStock - Number(newItem.quantity)) }, { transaction: t });
                    }
                }
            }
            await ticket.update(ticketData, { transaction: t });
            return await models_1.Ticket.findByPk(id, { include: [{ model: models_1.ItemTicket, as: 'items' }], transaction: t });
        });
    }
    static async deleteTicket(id, userId = 'admin') {
        return await base_de_datos_1.default.transaction(async (t) => {
            const ticket = await models_1.Ticket.findByPk(id, { include: [{ model: models_1.ItemTicket, as: 'items' }], transaction: t });
            if (!ticket)
                throw new Error('Ticket no encontrado');
            for (const item of (ticket.items || [])) {
                if (item.inventory_id) {
                    const inv = await models_1.Inventory.findByPk(item.inventory_id, { transaction: t });
                    if (inv)
                        await inv.update({ currentStock: inv.currentStock + Number(item.quantity) }, { transaction: t });
                }
            }
            await models_1.ItemTicket.destroy({ where: { ticket_id: id }, transaction: t });
            await models_1.Ticket.destroy({ where: { id }, transaction: t });
            await models_1.AuditLog.create({
                action: 'DELETE',
                entity: 'Ticket',
                entity_id: id,
                user_id: userId,
                details: `Eliminó ticket #${ticket.ticket_number}.`
            }, { transaction: t });
            return true;
        });
    }
    static async archiveTicketsByDate(date, start, end) {
        return await base_de_datos_1.default.transaction(async (t) => {
            // Build a proper date filter that works for both single-date and range modes
            let dateFilter;
            if (start && end) {
                dateFilter = { date: { [sequelize_1.Op.between]: [new Date(start), new Date(end)] } };
            }
            else if (date) {
                dateFilter = base_de_datos_1.default.where(base_de_datos_1.default.fn('DATE', base_de_datos_1.default.col('date')), { [sequelize_1.Op.lte]: date });
            }
            else {
                throw new Error('Fecha o rango requerido');
            }
            // Archive completed tickets
            const [affectedCount] = await models_1.Ticket.update({
                status: 'archived',
                archived_at: new Date()
            }, {
                where: {
                    [sequelize_1.Op.and]: [dateFilter, { status: 'completed' }]
                },
                transaction: t
            });
            // Archive sales and expenses for the same date/range
            await models_1.Sale.update({ is_archived: true }, {
                where: dateFilter,
                transaction: t
            });
            await models_1.Expense.update({ is_archived: true }, {
                where: dateFilter,
                transaction: t
            });
            if (affectedCount > 0) {
                await models_1.AuditLog.create({
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
        return await base_de_datos_1.default.transaction(async (t) => {
            // Restore inventory stock for all active (non-archived) ticket items
            const activeTickets = await models_1.Ticket.findAll({
                where: { status: { [sequelize_1.Op.ne]: 'archived' } },
                include: [{ model: models_1.ItemTicket, as: 'items' }],
                transaction: t
            });
            for (const ticket of activeTickets) {
                for (const item of (ticket.items || [])) {
                    if (item.inventory_id) {
                        const inv = await models_1.Inventory.findByPk(item.inventory_id, { transaction: t });
                        if (inv) {
                            await inv.update({ currentStock: inv.currentStock + Number(item.quantity) }, { transaction: t });
                        }
                    }
                }
            }
            logger_1.default.info(`[TICKET] clearTickets: restaurando stock de ${activeTickets.length} tickets activos`);
            await models_1.ItemTicket.destroy({ where: {}, force: true, transaction: t });
            await models_1.Ticket.destroy({ where: {}, force: true, transaction: t });
            return true;
        });
    }
}
exports.TicketService = TicketService;
