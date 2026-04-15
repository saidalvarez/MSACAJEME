"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const models_1 = require("../models");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
router.use(auth_1.default);
router.get('/', async (req, res) => {
    try {
        const catalog = await models_1.ItemCatalogo.findAll({ order: [['brand', 'ASC']], raw: true });
        res.json(catalog);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const itemData = req.body;
        // ensure boolean
        itemData.is_custom = itemData.is_custom === true || itemData.isCustom === true;
        const item = await models_1.ItemCatalogo.create(itemData);
        res.status(201).json(item);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const item = await models_1.ItemCatalogo.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Item not found' });
        await item.destroy();
        res.json({ message: 'Catalog item deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
exports.default = router;
