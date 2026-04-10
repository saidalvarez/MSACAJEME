import { Router } from 'express';
import { Op } from 'sequelize';
import Ticket from '../models/Ticket';
import Sale from '../models/Sale';
import ItemTicket from '../models/ItemTicket';
import SaleItem from '../models/SaleItem';
import AuditLog from '../models/AuditLog';
import verifyToken from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// Get all soft deleted items
router.get('/', async (req, res) => {
    try {
        const deletedTickets = await Ticket.findAll({
            where: { deletedAt: { [Op.not]: null } },
            paranoid: false,
            include: [{ model: ItemTicket, as: 'items', paranoid: false }]
        });

        const deletedSales = await Sale.findAll({
            where: { deletedAt: { [Op.not]: null } },
            paranoid: false,
            include: [{ model: SaleItem, as: 'items', paranoid: false }]
        });

        res.json({
            tickets: deletedTickets,
            sales: deletedSales
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Recover a soft deleted ticket or sale
router.post('/recover/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'ticket') {
            await Ticket.restore({ where: { id } });
            await ItemTicket.restore({ where: { ticket_id: id } });
            
            await AuditLog.create({
                action: 'recover',
                entity: 'Ticket',
                entityId: id,
                userId: req.body.userId || 'admin',
                details: { recoveredAt: new Date() }
            });

            // Emit via socket if available
            if (req.app.get('io')) {
                req.app.get('io').emit('ticket_updated');
            }
        } else if (type === 'sale') {
            await Sale.restore({ where: { id } });
            await SaleItem.restore({ where: { sale_id: id } });
            if (req.app.get('io')) {
                req.app.get('io').emit('sale_updated');
            }
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: `${type} recovered successfully` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Force delete a ticket or sale permanently
router.delete('/force/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'ticket') {
            await ItemTicket.destroy({ where: { ticket_id: id }, force: true });
            await Ticket.destroy({ where: { id }, force: true });
            
            await AuditLog.create({
                action: 'permanent_delete',
                entity: 'Ticket',
                entityId: id,
                userId: 'admin'
            });
        } else if (type === 'sale') {
            await SaleItem.destroy({ where: { sale_id: id }, force: true });
            await Sale.destroy({ where: { id }, force: true });
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: `${type} permanently deleted` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
