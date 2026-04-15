import { Request, Response } from 'express';
import { TicketService } from '../services/ticketService';
import logger from '../utils/logger';

export class TicketController {
  
  static async getTickets(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0, search, status } = req.query;
      
      const data = await TicketService.getTickets(
        Number(limit), 
        Number(offset), 
        search as string,
        status as string
      );
      
      res.json(data);
    } catch (error: any) {
      logger.error('Error GET /api/tickets:', { error: error.message });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async createTicket(req: Request, res: Response): Promise<any> {
    try {
      const { items, ...ticketData } = req.body;
      
      const newTicket = await TicketService.createTicket(ticketData, items);
      
      // Emit event for real-time updates
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated');

      res.status(201).json(newTicket);
    } catch (error: any) {
      logger.error('Error POST /api/tickets:', { error: error.message });
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  static async updateTicket(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { items, ...ticketData } = req.body;
      
      const updatedTicket = await TicketService.updateTicket(id, ticketData, items);
      
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated', { id });

      res.json(updatedTicket);
    } catch (error: any) {
      logger.error('Error PUT /api/tickets:', { error: error.message });
      if (error.message === 'Ticket no encontrado') {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async deleteTicket(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      
      await TicketService.deleteTicket(id, user?.username || 'unknown');

      const io = req.app.get('io');
      if (io) io.emit('ticket_updated');

      res.json({ message: 'Ticket eliminado e inventario restaurado' });
    } catch (error: any) {
      if (error.message === 'Ticket no encontrado') return res.status(404).json({ error: 'Ticket no encontrado' });
      logger.error('Error DELETE /api/tickets:', { error: error.message });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async archiveByDate(req: Request, res: Response): Promise<any> {
    try {
      const { date, start, end } = req.body;
      if (!date && (!start || !end)) {
        return res.status(400).json({ error: 'Fecha o rango requerido' });
      }

      const count = await TicketService.archiveTicketsByDate(date, start, end);
      
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated');

      res.json({ message: 'Tickets archivados correctamente', count });
    } catch (error: any) {
      logger.error('Error archivando tickets:', { error: error.message });
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  static async clearTickets(req: Request, res: Response) {
    try {
      await TicketService.clearTickets();
      
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated');

      res.json({ message: 'Todos los tickets han sido eliminados' });
    } catch (error: any) {
      logger.error('Error CLEAR /api/tickets:', { error: error.message });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
