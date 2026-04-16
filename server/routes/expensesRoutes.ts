import express from 'express';
import { Expense } from '../models';
import verifyToken from '../middleware/auth';
import { Op } from 'sequelize';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { date, includeArchived } = req.query;
    const whereClause: any = {};

    // Filter by Archive Status
    if (includeArchived !== 'true') {
      whereClause[Op.or] = [
        { is_archived: false },
        { is_archived: null }
      ];
    }

    // Filter by Date
    if (date && typeof date === 'string') {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      whereClause.date = { [Op.between]: [startOfDay, endOfDay] };
    }

    logger.info(`GET /api/expenses - Date: ${date}, Archived: ${includeArchived}`);
    const expenses = await Expense.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });
    res.json(expenses);
  } catch (error) {
    logger.error('Error GET /api/expenses:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  try {
    logger.info('POST /api/expenses - Body:', req.body);
    const expense = await Expense.create(req.body);
    logger.info(`Expense created: ${expense.id}`);
    res.status(201).json(expense);
  } catch (error) {
    logger.error('Error POST /api/expenses:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await expense.destroy();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/clear', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'Month (YYYY-MM) is required' });

    const startOfDay = new Date(`${month}-01T00:00:00`);
    const endOfDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59);

    const result = await Expense.update(
      { is_archived: true },
      { where: { date: { [Op.between]: [startOfDay, endOfDay] } } }
    );
    res.json({ message: 'Expenses cleared for the month', count: result[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
