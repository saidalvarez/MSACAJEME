import express from 'express';
import { Sale, SaleItem, Inventory } from '../models';
import sequelize from '../base_de_datos';
import verifyToken from '../middleware/auth';
import { Op } from 'sequelize';
import crypto from 'crypto';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { date, includeArchived, clientId } = req.query;
    const whereClause: any = {};

    // Filter by Archive Status
    if (includeArchived !== 'true') {
      whereClause[Op.or] = [
        { is_archived: false },
        { is_archived: null }
      ];
    }

    // Filter by Date
    if (date && typeof date === 'string') {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      whereClause.date = { [Op.between]: [startOfDay, endOfDay] };
    }

    if (clientId) {
      whereClause.client_id = clientId;
    }

    logger.info(`GET /api/sales - Date: ${date}, Archived: ${includeArchived}, Client: ${clientId}`);
    
    const sales = await Sale.findAll({
      where: whereClause,
      include: [{ model: SaleItem, as: 'items' }],
      order: [['date', 'DESC']]
    });
    res.json(sales);
  } catch (error) {
    logger.error('Error GET /api/sales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    logger.info('POST /api/sales - Body:', req.body);
    const { items, ...saleData } = req.body;
    
    logger.info(`[SALE] Received request. Items: ${items?.length}, Sale Info:`, saleData);

    // Robust mapping for SnakeCase vs CamelCase
    const finalSaleData = {
      ...saleData,
      id: saleData.id || crypto.randomUUID(),
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
      calculatedTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    }
    finalSaleData.total = calculatedTotal;

    logger.info('[SALE] Creating record with:', finalSaleData);
    
    // LOGIC-05: Idempotency — prevent duplicate sales from offline sync retries
    const existingSale = await Sale.findByPk(finalSaleData.id, { transaction: t });
    if (existingSale) {
      await t.commit();
      logger.info(`[SALE] Sale ${finalSaleData.id} already exists — returning existing record (idempotent)`);
      return res.status(200).json(await Sale.findByPk(existingSale.id, { include: [{ model: SaleItem, as: 'items' }] }));
    }

    const sale = await Sale.create(finalSaleData, { transaction: t });

    if (items && items.length > 0) {
      for (const item of items) {
        const inventory_id = item.inventory_id || item.inventoryId || item.id;
        const { id, inventoryId, ...itemData } = item;
        
        // Ensure SaleItem mapping is robust
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

        // VALIDACIÓN QUIRÚRGICA DE STOCK (PRE-DEDUCCIÓN)
        if (inventory_id) {
           logger.info(`[SALE] Procesando ítem: ${finalItemData.brand}. Buscando ID de inventario: ${inventory_id}`);
           const inventoryItem = await Inventory.findByPk(inventory_id, { transaction: t });
           
           if (!inventoryItem) {
             throw new Error(`Artículo del catálogo no encontrado: ${finalItemData.brand} (ID: ${inventory_id})`);
           }

           const requestedQty = Number(itemData.quantity || 1);
           if (inventoryItem.currentStock < requestedQty) {
             throw new Error(`Stock insuficiente para "${inventoryItem.brand}". Disponible: ${inventoryItem.currentStock}, Solicitado: ${requestedQty}`);
           }

           // Deducción Atómica
           logger.info(`[SALE] Deducting stock for "${inventoryItem.brand}". Current: ${inventoryItem.currentStock}, Sub: ${requestedQty}`);
           await inventoryItem.update({ 
             currentStock: inventoryItem.currentStock - requestedQty 
           }, { transaction: t });
        }

        await SaleItem.create(finalItemData, { transaction: t });
      }
    }

    await t.commit();
    logger.info('[SALE] Successfully recorded sale and adjusted inventory.');
    res.status(201).json(await Sale.findByPk(sale.id, { include: [{ model: SaleItem, as: 'items' }] }));
  } catch (error: any) {
    logger.error('Error POST /api/sales:', error);
    logger.error('Stack Trace:', error.stack);
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
    if (!month) return res.status(400).json({ error: 'Month (YYYY-MM) is required' });

    const startOfDay = new Date(`${month}-01T00:00:00`);
    const endOfDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59);

    // Soft-delete: mark as archived instead of destroying
    const [count] = await Sale.update(
      { is_archived: true },
      { where: { date: { [Op.between]: [startOfDay, endOfDay] } } }
    );
    logger.info(`[SALES] Archived ${count} sales for month ${month}`);
    res.json({ message: 'Ventas archivadas exitosamente', count });
  } catch (error) {
    logger.error('[SALES] Error archiving:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
