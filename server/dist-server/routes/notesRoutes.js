"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Note_1 = __importDefault(require("../models/Note"));
const auth_1 = __importDefault(require("../middleware/auth"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.use(auth_1.default);
// GET all notes (ordered: pinned first, then by date desc)
router.get('/', async (_req, res) => {
    try {
        // Ensure table exists
        await Note_1.default.sync();
        const notes = await Note_1.default.findAll({
            order: [['pinned', 'DESC'], ['created_at', 'DESC']]
        });
        res.json(notes);
    }
    catch (error) {
        logger_1.default.error('Error GET /api/notes:', error);
        res.status(500).json({ error: 'Error al cargar notas' });
    }
});
// POST create note
router.post('/', async (req, res) => {
    try {
        await Note_1.default.sync();
        const note = await Note_1.default.create({
            id: require('crypto').randomUUID(),
            text: req.body.text || '',
            color: req.body.color || 'yellow',
            pinned: req.body.pinned || false,
            priority: req.body.priority || 'normal'
        });
        res.status(201).json(note);
    }
    catch (error) {
        logger_1.default.error('Error POST /api/notes:', error);
        res.status(500).json({ error: 'Error al crear nota' });
    }
});
// PUT update note
router.put('/:id', async (req, res) => {
    try {
        const note = await Note_1.default.findByPk(req.params.id);
        if (!note)
            return res.status(404).json({ error: 'Nota no encontrada' });
        await note.update(req.body);
        res.json(note);
    }
    catch (error) {
        logger_1.default.error('Error PUT /api/notes:', error);
        res.status(500).json({ error: 'Error al actualizar nota' });
    }
});
// DELETE single note
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note_1.default.findByPk(req.params.id);
        if (!note)
            return res.status(404).json({ error: 'Nota no encontrada' });
        await note.destroy();
        res.json({ message: 'Nota eliminada' });
    }
    catch (error) {
        logger_1.default.error('Error DELETE /api/notes:', error);
        res.status(500).json({ error: 'Error al eliminar nota' });
    }
});
// DELETE all notes
router.delete('/', async (_req, res) => {
    try {
        await Note_1.default.destroy({ where: {} });
        res.json({ message: 'Todas las notas eliminadas' });
    }
    catch (error) {
        logger_1.default.error('Error DELETE ALL /api/notes:', error);
        res.status(500).json({ error: 'Error al vaciar notas' });
    }
});
exports.default = router;
