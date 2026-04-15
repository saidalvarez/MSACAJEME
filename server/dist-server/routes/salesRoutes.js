"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const models_1 = require("../models");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
const auth_1 = __importDefault(require("../middleware/auth"));
const sequelize_1 = require("sequelize");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.use(auth_1.default);
router.get('/', async (req, res) => {
    try {
        logger_1.default.info('GET /api/sales');
        const sales = await models_1.Sale.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { is_archived: false },
                    { is_archived: null }
                ]
            },
            include: [{ model: models_1.SaleItem, as: 'items' }],
            order: [['date', 'DESC']]
        });
        res.json(sales);
    }
    catch (error) {
        logger_1.default.error('Error GET /api/sales:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.post('/', async (req, res) => {
    const t = await base_de_datos_1.default.transaction();
    try {
        logger_1.default.info('POST /api/sales - Body:', req.body);
        const { items, ...saleData } = req.body;
        logger_1.default.info(`[SALE] Received request. Items: ${items?.length}, Sale Info:`, saleData);
        // Robust mapping for SnakeCase vs CamelCase
        const finalSaleData = {
            ...saleData,
            id: saleData.id || crypto_1.default.randomUUID(),
            client_name: saleData.client_name || saleData.clientName || 'Público General',
            client_phone: saleData.client_phone || saleData.clientPhone || '',
            payment_method: saleData.payment_method || saleData.paymentMethod || 'Efectivo',
            status: saleData.status || 'completed',
            date: saleData.date || new Date().toISOString(),
            is_archived: saleData.is_archived || false
        };
        // BACKEND FINANCIAL CALCULATION
        let calculatedTotal = 0;
        if (items && items.length > 0) {
            calculatedTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
        }
        finalSaleData.total = calculatedTotal;
        logger_1.default.info('[SALE] Creating record with:', finalSaleData);
        // LOGIC-05: Idempotency — prevent duplicate sales from offline sync retries
        const existingSale = await models_1.Sale.findByPk(finalSaleData.id, { transaction: t });
        if (existingSale) {
            await t.commit();
            logger_1.default.info(`[SALE] Sale ${finalSaleData.id} already exists — returning existing record (idempotent)`);
            return res.status(200).json(await models_1.Sale.findByPk(existingSale.id, { include: [{ model: models_1.SaleItem, as: 'items' }] }));
        }
        const sale = await models_1.Sale.create(finalSaleData, { transaction: t });
        if (items && items.length > 0) {
            for (const item of items) {
                // Omit the 'id' from the item spread because SaleItem has its own auto-increment PK
                const { id: inventory_id, ...itemData } = item;
                // Ensure SaleItem mapping is also robust
                const finalItemData = {
                    ...itemData,
                    sale_id: sale.id,
                    inventory_id: inventory_id,
                    brand: itemData.brand || 'Genérico',
                    type: itemData.type || 'Producto',
                    price: Number(itemData.price || 0),
                    quantity: Number(itemData.quantity || 1),
                    purchase_price: Number(itemData.purchase_price || itemData.purchasePrice || 0)
                };
                await models_1.SaleItem.create(finalItemData, { transaction: t });
                // Deduct inventory atomically using ID (UUID)
                if (inventory_id) {
                    const inventoryItem = await models_1.Inventory.findByPk(inventory_id, { transaction: t });
                    if (inventoryItem) {
                        const qty = Number(item.quantity || 1);
                        logger_1.default.info(`[SALE] Deducting stock for "${inventoryItem.brand}". Current: ${inventoryItem.currentStock}, Subtracting: ${qty}`);
                        const newStock = Math.max(0, inventoryItem.currentStock - qty);
                        await inventoryItem.update({ currentStock: newStock }, { transaction: t });
                    }
                    else {
                        logger_1.default.warn(`[SALE] Inventory item ${inventory_id} not found for deduction`);
                    }
                }
            }
        }
        await t.commit();
        logger_1.default.info('[SALE] Successfully recorded sale and adjusted inventory.');
        res.status(201).json(await models_1.Sale.findByPk(sale.id, { include: [{ model: models_1.SaleItem, as: 'items' }] }));
    }
    catch (error) {
        logger_1.default.error('Error POST /api/sales:', error);
        logger_1.default.error('Stack Trace:', error.stack);
        await t.rollback();
        res.status(500).json({
            error: 'Error al registrar venta',
            details: error.message,
            originalError: error.name
        });
    }
});
router.post('/clear', async (req, res) => {
    try {
        const { month } = req.body;
        if (!month)
            return res.status(400).json({ error: 'Month (YYYY-MM) is required' });
        const startOfDay = new Date(`${month}-01T00:00:00`);
        const endOfDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59);
        // Soft-delete: mark as archived instead of destroying
        const [count] = await models_1.Sale.update({ is_archived: true }, { where: { date: { [sequelize_1.Op.between]: [startOfDay, endOfDay] } } });
        logger_1.default.info(`[SALES] Archived ${count} sales for month ${month}`);
        res.json({ message: 'Ventas archivadas exitosamente', count });
    }
    catch (error) {
        logger_1.default.error('[SALES] Error archiving:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
exports.default = router;
