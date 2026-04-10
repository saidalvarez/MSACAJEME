import { Request, Response } from 'express';
import { TicketService } from '../services/ticketService';

export class TicketController {
  
  static async getTickets(req: Request, res: Response) {
    try {
      const { limit = 500, offset = 0, search } = req.query;
      const data = await TicketService.getTickets(Number(limit), Number(offset), search as string);
      res.json(data);
    } catch (error) {
      console.error('Error GET /api/tickets:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async createTicket(req: Request, res: Response): Promise<any> {
    try {
      const { items, ...ticketData } = req.body;
      
      // Basic validation (will be replaced by Zod middleware)
      if (!ticketData.client_name || typeof ticketData.client_name !== 'string' || ticketData.client_name.trim().length === 0) {
        return res.status(400).json({ error: 'Nombre de cliente es requerido' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Se requiere al menos un servicio o producto' });
      }

      const newTicket = await TicketService.createTicket(ticketData, items);
      res.status(201).json(newTicket);
    } catch (error: any) {
      console.error('Error POST /api/tickets:', error);
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  static async updateTicket(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { items, ...ticketData } = req.body;
      
      const updatedTicket = await TicketService.updateTicket(id, ticketData, items);
      res.json(updatedTicket);
    } catch (error: any) {
      console.error('Error PUT /api/tickets:', error);
      if (error.message === 'Ticket not found') {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async deleteTicket(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      await TicketService.deleteTicket(id, 'admin'); // Assuming 'admin' for now

      const io = req.app.get('io');
      if (io) io.emit('ticket_updated');

      res.json({ message: 'Ticket deleted and inventory restored' });
    } catch (error: any) {
      if (error.message === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
      console.error('Error DELETE /api/tickets:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async archiveByDate(req: Request, res: Response): Promise<any> {
    try {
      const { date, start, end } = req.body;
      if (!date && (!start || !end)) {
        return res.status(400).json({ error: 'Date or range (start/end) is required' });
      }

      const count = await TicketService.archiveTicketsByDate(date, start, end);
      
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated');

      res.json({ message: 'Archived to historial', count });
    } catch (error: any) {
      console.error('Error archiving tickets:', error);
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  static async clearTickets(req: Request, res: Response) {
    try {
      await TicketService.clearTickets();
      res.json({ message: 'All tickets cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
