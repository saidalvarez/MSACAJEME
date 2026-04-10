import express from 'express';
import { HistorialTicket, ItemHistorial } from '../models';
import verifyToken from '../middleware/auth';
import { Op } from 'sequelize';
import sequelize from '../base_de_datos';

const router = express.Router();
router.use(verifyToken);

// GET all historial tickets (paginated, searchable)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, dateFrom, dateTo, clientId } = req.query;
    
    // Safely parse integers
    const parsedLimit = Math.max(1, parseInt(limit as string, 10) || 20);
    const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;
    
    const where: any = {};

    if (clientId) {
      where.client_id = clientId;
    }
    
    // Robust search mapping
    if (search && typeof search === 'string' && search.trim() !== '') {
       const searchStr = search.trim();
       const searchNum = parseInt(searchStr, 10);
       const searchTerm = `%${searchStr.toLowerCase()}%`;
       
       where[Op.or] = [
         sequelize.where(sequelize.fn('LOWER', sequelize.col('client_name')), { [Op.like]: searchTerm }),
         sequelize.where(sequelize.fn('LOWER', sequelize.col('client_phone')), { [Op.like]: searchTerm }),
       ];
       if (!isNaN(searchNum)) {
         where[Op.or].push({ ticket_number: searchNum });
       }
    }
    
    // Robust date mapping
    if (dateFrom && dateTo) {
      where.date = { 
         [Op.between]: [new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)] 
      };
    } else if (dateFrom) {
      where.date = { [Op.gte]: new Date(`${dateFrom}T00:00:00`) };
    } else if (dateTo) {
      where.date = { [Op.lte]: new Date(`${dateTo}T23:59:59`) };
    }

    const tickets = await HistorialTicket.findAndCountAll({
      where,
      include: [{ model: ItemHistorial, as: 'items' }],
      limit: parsedLimit,
      offset,
      order: [['date', 'DESC']]
    });
    
    res.json({
        rows: tickets.rows,
        count: tickets.count
    });
  } catch (error) {
    console.error('Error GET /api/historial:', error);
    res.status(500).json({ error: 'Error interno o de sintaxis SQL al buscar en la base de datos' });
  }
});

// DELETE a single historial ticket
router.delete('/:id', async (req, res) => {
  try {
    await ItemHistorial.destroy({ where: { historial_ticket_id: req.params.id } });
    await HistorialTicket.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Historial ticket deleted' });
  } catch (error) {
    console.error('Error DELETE /api/historial/:id:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE all historial tickets
router.delete('/', async (req, res) => {
  try {
    await ItemHistorial.destroy({ where: {}, truncate: true });
    await HistorialTicket.destroy({ where: {}, truncate: true });
    res.json({ message: 'All historial cleared' });
  } catch (error) {
    console.error('Error DELETE /api/historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
