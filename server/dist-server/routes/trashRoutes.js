"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Sale_1 = __importDefault(require("../models/Sale"));
const ItemTicket_1 = __importDefault(require("../models/ItemTicket"));
const SaleItem_1 = __importDefault(require("../models/SaleItem"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
router.use(auth_1.default);
// Get all soft deleted items
router.get('/', async (req, res) => {
    try {
        const deletedTickets = await Ticket_1.default.findAll({
            where: { deletedAt: { [sequelize_1.Op.not]: null } },
            paranoid: false,
            include: [{ model: ItemTicket_1.default, as: 'items', paranoid: false }]
        });
        const deletedSales = await Sale_1.default.findAll({
            where: { deletedAt: { [sequelize_1.Op.not]: null } },
            paranoid: false,
            include: [{ model: SaleItem_1.default, as: 'items', paranoid: false }]
        });
        res.json({
            tickets: deletedTickets,
            sales: deletedSales
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Recover a soft deleted ticket or sale
router.post('/recover/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'ticket') {
            await Ticket_1.default.restore({ where: { id } });
            await ItemTicket_1.default.restore({ where: { ticket_id: id } });
            await AuditLog_1.default.create({
                action: 'recover',
                entity: 'Ticket',
                entity_id: id,
                user_id: req.body.userId || 'admin',
                details: JSON.stringify({ recoveredAt: new Date() })
            });
            // Emit via socket if available
            if (req.app.get('io')) {
                req.app.get('io').emit('ticket_updated');
            }
        }
        else if (type === 'sale') {
            await Sale_1.default.restore({ where: { id } });
            await SaleItem_1.default.restore({ where: { sale_id: id } });
            if (req.app.get('io')) {
                req.app.get('io').emit('sale_updated');
            }
        }
        else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: `${type} recovered successfully` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Force delete a ticket or sale permanently
router.delete('/force/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'ticket') {
            await ItemTicket_1.default.destroy({ where: { ticket_id: id }, force: true });
            await Ticket_1.default.destroy({ where: { id }, force: true });
            await AuditLog_1.default.create({
                action: 'permanent_delete',
                entity: 'Ticket',
                entity_id: id,
                user_id: 'admin'
            });
        }
        else if (type === 'sale') {
            await SaleItem_1.default.destroy({ where: { sale_id: id }, force: true });
            await Sale_1.default.destroy({ where: { id }, force: true });
        }
        else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: `${type} permanently deleted` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
