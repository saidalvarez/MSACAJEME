import express from 'express';
import { ItemCatalogo } from '../models';
import verifyToken from '../middleware/auth';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const catalog = await ItemCatalogo.findAll({ order: [['brand', 'ASC']], raw: true });
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  try {
    const itemData = req.body;
    // ensure boolean
    itemData.is_custom = itemData.is_custom === true || itemData.isCustom === true;
    const item = await ItemCatalogo.create(itemData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await ItemCatalogo.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.destroy();
    res.json({ message: 'Catalog item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
