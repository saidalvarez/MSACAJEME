"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const ticketService_1 = require("../services/ticketService");
const logger_1 = __importDefault(require("../utils/logger"));
class TicketController {
    static async getTickets(req, res) {
        try {
            const { limit = 20, offset = 0, search, status } = req.query;
            const data = await ticketService_1.TicketService.getTickets(Number(limit), Number(offset), search, status);
            res.json(data);
        }
        catch (error) {
            logger_1.default.error('Error GET /api/tickets:', { error: error.message });
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    static async createTicket(req, res) {
        try {
            const { items, ...ticketData } = req.body;
            const newTicket = await ticketService_1.TicketService.createTicket(ticketData, items);
            // Emit event for real-time updates
            const io = req.app.get('io');
            if (io)
                io.emit('ticket_updated');
            res.status(201).json(newTicket);
        }
        catch (error) {
            logger_1.default.error('Error POST /api/tickets:', { error: error.message });
            res.status(500).json({ error: error.message || 'Error interno del servidor' });
        }
    }
    static async updateTicket(req, res) {
        try {
            const id = req.params.id;
            const { items, ...ticketData } = req.body;
            const updatedTicket = await ticketService_1.TicketService.updateTicket(id, ticketData, items);
            const io = req.app.get('io');
            if (io)
                io.emit('ticket_updated', { id });
            res.json(updatedTicket);
        }
        catch (error) {
            logger_1.default.error('Error PUT /api/tickets:', { error: error.message });
            if (error.message === 'Ticket no encontrado') {
                return res.status(404).json({ error: 'Ticket no encontrado' });
            }
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    static async deleteTicket(req, res) {
        try {
            const id = req.params.id;
            const user = req.user;
            await ticketService_1.TicketService.deleteTicket(id, user?.username || 'unknown');
            const io = req.app.get('io');
            if (io)
                io.emit('ticket_updated');
            res.json({ message: 'Ticket eliminado e inventario restaurado' });
        }
        catch (error) {
            if (error.message === 'Ticket no encontrado')
                return res.status(404).json({ error: 'Ticket no encontrado' });
            logger_1.default.error('Error DELETE /api/tickets:', { error: error.message });
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    static async archiveByDate(req, res) {
        try {
            const { date, start, end } = req.body;
            if (!date && (!start || !end)) {
                return res.status(400).json({ error: 'Fecha o rango requerido' });
            }
            const count = await ticketService_1.TicketService.archiveTicketsByDate(date, start, end);
            const io = req.app.get('io');
            if (io)
                io.emit('ticket_updated');
            res.json({ message: 'Tickets archivados correctamente', count });
        }
        catch (error) {
            logger_1.default.error('Error archivando tickets:', { error: error.message });
            res.status(500).json({ error: error.message || 'Error interno del servidor' });
        }
    }
    static async clearTickets(req, res) {
        try {
            await ticketService_1.TicketService.clearTickets();
            const io = req.app.get('io');
            if (io)
                io.emit('ticket_updated');
            res.json({ message: 'Todos los tickets han sido eliminados' });
        }
        catch (error) {
            logger_1.default.error('Error CLEAR /api/tickets:', { error: error.message });
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}
exports.TicketController = TicketController;
