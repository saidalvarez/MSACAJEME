import express from 'express';
import { Inventory } from '../models';
import verifyToken from '../middleware/auth';
import { Op } from 'sequelize';
import sequelize from '../base_de_datos';
import { validateRequest } from '../middleware/validateRequest';
import { createInventorySchema, updateInventorySchema } from '../schemas/inventory';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

// GET inventory with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause: any = {};
    
    if (search) {
      const searchTerm = `%${(search as string).toLowerCase()}%`;
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('brand')), { [Op.like]: searchTerm }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('type')), { [Op.like]: searchTerm }),
        { barcode: { [Op.like]: searchTerm } },
        { purchase_number: { [Op.like]: searchTerm } }
      ];
    }

    const inventory = await Inventory.findAll({ 
      where: whereClause,
      order: [['created_at', 'DESC']] 
    });
    res.json(inventory);
  } catch (error) {
    logger.error('Error GET /api/inventory:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Barcode lookup (for scanner)
router.get('/barcode/:code', async (req, res) => {
  try {
    const item = await Inventory.findOne({ where: { barcode: req.params.code } });
    if (!item) return res.status(404).json({ error: 'Producto no encontrado con ese código de barras' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CREATE with validation
router.post('/', validateRequest(createInventorySchema as any), async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    logger.error('Error POST /api/inventory:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', validateRequest(updateInventorySchema as any), async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id as string);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id as string);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.destroy();
    res.json({ message: 'Inventory item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

