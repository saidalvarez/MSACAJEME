"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const models_1 = require("../models");
const auth_1 = __importDefault(require("../middleware/auth"));
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
const validateRequest_1 = require("../middleware/validateRequest");
const inventory_1 = require("../schemas/inventory");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.use(auth_1.default);
// GET inventory with optional search
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const whereClause = {};
        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause[sequelize_1.Op.or] = [
                base_de_datos_1.default.where(base_de_datos_1.default.fn('LOWER', base_de_datos_1.default.col('brand')), { [sequelize_1.Op.like]: searchTerm }),
                base_de_datos_1.default.where(base_de_datos_1.default.fn('LOWER', base_de_datos_1.default.col('type')), { [sequelize_1.Op.like]: searchTerm }),
                { barcode: { [sequelize_1.Op.like]: searchTerm } },
                { purchase_number: { [sequelize_1.Op.like]: searchTerm } }
            ];
        }
        const inventory = await models_1.Inventory.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']]
        });
        res.json(inventory);
    }
    catch (error) {
        logger_1.default.error('Error GET /api/inventory:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Barcode lookup (for scanner)
router.get('/barcode/:code', async (req, res) => {
    try {
        const item = await models_1.Inventory.findOne({ where: { barcode: req.params.code } });
        if (!item)
            return res.status(404).json({ error: 'Producto no encontrado con ese código de barras' });
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// CREATE with validation
router.post('/', (0, validateRequest_1.validateRequest)(inventory_1.createInventorySchema), async (req, res) => {
    try {
        const item = await models_1.Inventory.create(req.body);
        res.status(201).json(item);
    }
    catch (error) {
        logger_1.default.error('Error POST /api/inventory:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.put('/:id', (0, validateRequest_1.validateRequest)(inventory_1.updateInventorySchema), async (req, res) => {
    try {
        const item = await models_1.Inventory.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Item not found' });
        await item.update(req.body);
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const item = await models_1.Inventory.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Item not found' });
        await item.destroy();
        res.json({ message: 'Inventory item deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
exports.default = router;
