import express from 'express';
import { Ticket, ItemTicket } from '../models';
import verifyToken from '../middleware/auth';
import { Op } from 'sequelize';
import sequelize from '../base_de_datos';
import { TicketService } from '../services/ticketService';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

/**
 * GET Bitácora (Tickets con status 'archived')
 */
router.get('/', async (req: any, res) => {
  try {
    const { page = 1, limit = 20, search, dateFrom, dateTo, clientId } = req.query;
    
    const parsedLimit = Math.max(1, parseInt(limit as string, 10) || 20);
    const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;
    
    const where: any = {
      status: 'archived'
    };

    if (clientId) {
      where.client_id = clientId;
    }
    
    if (search && typeof search === 'string' && search.trim() !== '') {
       const searchStr = search.trim();
       const searchNum = parseInt(searchStr, 10);
       const searchTerm = `%${searchStr.toLowerCase()}%`;
       
       where[Op.or] = [
         sequelize.where(sequelize.fn('LOWER', sequelize.col('client_name')), { [Op.like]: searchTerm }),
         sequelize.where(sequelize.fn('LOWER', sequelize.col('vehicle')), { [Op.like]: searchTerm }),
       ];
       if (!isNaN(searchNum)) {
         where[Op.or].push({ ticket_number: searchNum });
       }
    }
    
    if (dateFrom && dateTo) {
      where.date = { 
         [Op.between]: [new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)] 
      };
    } else if (dateFrom) {
      where.date = { [Op.gte]: new Date(`${dateFrom}T00:00:00`) };
    } else if (dateTo) {
      where.date = { [Op.lte]: new Date(`${dateTo}T23:59:59`) };
    }

    const tickets = await Ticket.findAndCountAll({
      where,
      include: [{ model: ItemTicket, as: 'items' }],
      limit: parsedLimit,
      offset,
      order: [['date', 'DESC'], ['ticket_number', 'DESC']],
      distinct: true
    });
    
    res.json({
        rows: tickets.rows,
        count: tickets.count
    });
  } catch (error: any) {
    logger.error('Error GET /api/historial:', { error: error.message });
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
    await TicketService.deleteTicket(id, (req as any).user?.username);
    res.json({ message: 'Registro del historial eliminado' });
  } catch (error: any) {
    logger.error('Error DELETE /api/historial/:id:', { error: error.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE Limpiar todo el historial (SOLO ADMIN)
 */
router.delete('/', async (req, res) => {
  try {
    await ItemTicket.destroy({ 
      where: { 
        ticket_id: { 
          [Op.in]: sequelize.literal('(SELECT id FROM tickets WHERE status = \'archived\')') 
        } 
      } 
    });
    const affected = await Ticket.destroy({ where: { status: 'archived' } });
    
    res.json({ message: `Bitácora limpiada. Se eliminaron ${affected} registros.` });
  } catch (error: any) {
    logger.error('Error DELETE /api/historial:', { error: error.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
