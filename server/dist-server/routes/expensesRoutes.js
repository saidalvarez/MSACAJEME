"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const models_1 = require("../models");
const auth_1 = __importDefault(require("../middleware/auth"));
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.use(auth_1.default);
router.get('/', async (req, res) => {
    try {
        logger_1.default.info('GET /api/expenses');
        const expenses = await models_1.Expense.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { is_archived: false },
                    { is_archived: null }
                ]
            },
            order: [['date', 'DESC']]
        });
        res.json(expenses);
    }
    catch (error) {
        logger_1.default.error('Error GET /api/expenses:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        logger_1.default.info('POST /api/expenses - Body:', req.body);
        const expense = await models_1.Expense.create(req.body);
        logger_1.default.info(`Expense created: ${expense.id}`);
        res.status(201).json(expense);
    }
    catch (error) {
        logger_1.default.error('Error POST /api/expenses:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const expense = await models_1.Expense.findByPk(req.params.id);
        if (!expense)
            return res.status(404).json({ error: 'Expense not found' });
        await expense.destroy();
        res.json({ message: 'Expense deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.post('/clear', async (req, res) => {
    try {
        const { month } = req.body;
        if (!month)
            return res.status(400).json({ error: 'Month (YYYY-MM) is required' });
        const startOfDay = new Date(`${month}-01T00:00:00`);
        const endOfDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59);
        const result = await models_1.Expense.update({ is_archived: true }, { where: { date: { [sequelize_1.Op.between]: [startOfDay, endOfDay] } } });
        res.json({ message: 'Expenses cleared for the month', count: result[0] });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
exports.default = router;
