"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const models_1 = require("../models");
const auth_1 = __importDefault(require("../middleware/auth"));
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
const ticketService_1 = require("../services/ticketService");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.use(auth_1.default);
/**
 * GET Bitácora (Tickets con status 'archived')
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, dateFrom, dateTo, clientId } = req.query;
        const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const offset = (parsedPage - 1) * parsedLimit;
        const where = {
            status: 'archived'
        };
        if (clientId) {
            where.client_id = clientId;
        }
        if (search && typeof search === 'string' && search.trim() !== '') {
            const searchStr = search.trim();
            const searchNum = parseInt(searchStr, 10);
            const searchTerm = `%${searchStr.toLowerCase()}%`;
            where[sequelize_1.Op.or] = [
                base_de_datos_1.default.where(base_de_datos_1.default.fn('LOWER', base_de_datos_1.default.col('client_name')), { [sequelize_1.Op.like]: searchTerm }),
                base_de_datos_1.default.where(base_de_datos_1.default.fn('LOWER', base_de_datos_1.default.col('vehicle')), { [sequelize_1.Op.like]: searchTerm }),
            ];
            if (!isNaN(searchNum)) {
                where[sequelize_1.Op.or].push({ ticket_number: searchNum });
            }
        }
        if (dateFrom && dateTo) {
            where.date = {
                [sequelize_1.Op.between]: [new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)]
            };
        }
        else if (dateFrom) {
            where.date = { [sequelize_1.Op.gte]: new Date(`${dateFrom}T00:00:00`) };
        }
        else if (dateTo) {
            where.date = { [sequelize_1.Op.lte]: new Date(`${dateTo}T23:59:59`) };
        }
        const tickets = await models_1.Ticket.findAndCountAll({
            where,
            include: [{ model: models_1.ItemTicket, as: 'items' }],
            limit: parsedLimit,
            offset,
            order: [['date', 'DESC'], ['ticket_number', 'DESC']],
            distinct: true
        });
        res.json({
            rows: tickets.rows,
            count: tickets.count
        });
    }
    catch (error) {
        logger_1.default.error('Error GET /api/historial:', { error: error.message });
        res.status(500).json({ error: 'Error interno al consultar la bitácora' });
    }
});
/**
 * DELETE un servicio del historial
 */
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Usamos el servicio de tickets para asegurar limpieza de items e inventario si fuera necesario
        // Aunque en teoría los archivados ya descontaron stock.
        await ticketService_1.TicketService.deleteTicket(id, req.user?.username);
        res.json({ message: 'Registro del historial eliminado' });
    }
    catch (error) {
        logger_1.default.error('Error DELETE /api/historial/:id:', { error: error.message });
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
/**
 * DELETE Limpiar todo el historial (SOLO ADMIN)
 */
router.delete('/', async (req, res) => {
    try {
        await models_1.ItemTicket.destroy({
            where: {
                ticket_id: {
                    [sequelize_1.Op.in]: base_de_datos_1.default.literal('(SELECT id FROM tickets WHERE status = \'archived\')')
                }
            }
        });
        const affected = await models_1.Ticket.destroy({ where: { status: 'archived' } });
        res.json({ message: `Bitácora limpiada. Se eliminaron ${affected} registros.` });
    }
    catch (error) {
        logger_1.default.error('Error DELETE /api/historial:', { error: error.message });
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
exports.default = router;
