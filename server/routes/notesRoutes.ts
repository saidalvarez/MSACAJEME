import express from 'express';
import Note from '../models/Note';
import verifyToken from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

// GET all notes (ordered: pinned first, then by date desc)
router.get('/', async (_req, res) => {
  try {
    // Ensure table exists
    await Note.sync();
    const notes = await Note.findAll({
      order: [['pinned', 'DESC'], ['created_at', 'DESC']]
    });
    res.json(notes);
  } catch (error) {
    logger.error('Error GET /api/notes:', error);
    res.status(500).json({ error: 'Error al cargar notas' });
  }
});

// POST create note
router.post('/', async (req, res) => {
  try {
    await Note.sync();
    const note = await Note.create({
      id: require('crypto').randomUUID(),
      text: req.body.text || '',
      color: req.body.color || 'yellow',
      pinned: req.body.pinned || false,
      priority: req.body.priority || 'normal'
    });
    res.status(201).json(note);
  } catch (error) {
    logger.error('Error POST /api/notes:', error);
    res.status(500).json({ error: 'Error al crear nota' });
  }
});

// PUT update note
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ error: 'Nota no encontrada' });
    await note.update(req.body);
    res.json(note);
  } catch (error) {
    logger.error('Error PUT /api/notes:', error);
    res.status(500).json({ error: 'Error al actualizar nota' });
  }
});

// DELETE single note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ error: 'Nota no encontrada' });
    await note.destroy();
    res.json({ message: 'Nota eliminada' });
  } catch (error) {
    logger.error('Error DELETE /api/notes:', error);
    res.status(500).json({ error: 'Error al eliminar nota' });
  }
});

// DELETE all notes
router.delete('/', async (_req, res) => {
  try {
    await Note.destroy({ where: {} });
    res.json({ message: 'Todas las notas eliminadas' });
  } catch (error) {
    logger.error('Error DELETE ALL /api/notes:', error);
    res.status(500).json({ error: 'Error al vaciar notas' });
  }
});

export default router;
