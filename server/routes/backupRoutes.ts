import { Router } from 'express';
import sequelize from '../base_de_datos';
import Cliente from '../models/Cliente';
import Ticket from '../models/Ticket';
import ItemTicket from '../models/ItemTicket';
import HistorialTicket from '../models/HistorialTicket';
import ItemHistorial from '../models/ItemHistorial';
import Inventory from '../models/Inventory';
import ItemCatalogo from '../models/ItemCatalogo';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import Expense from '../models/Expense';
import Usuario from '../models/Usuario';
import verifyToken from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// --- START EXPORT BACKUP ---
router.get('/export', async (req, res) => {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      data: {
        clients: await Cliente.findAll({ raw: true }),
        tickets: await Ticket.findAll({ raw: true }),
        ticket_items: await ItemTicket.findAll({ raw: true }),
        historial_tickets: await HistorialTicket.findAll({ raw: true }),
        historial_ticket_items: await ItemHistorial.findAll({ raw: true }),
        inventory: await Inventory.findAll({ raw: true }),
        item_catalogo: await ItemCatalogo.findAll({ raw: true }),
        sales: await Sale.findAll({ raw: true }),
        sale_items: await SaleItem.findAll({ raw: true }),
        expenses: await Expense.findAll({ raw: true }),
        usuarios: await Usuario.findAll({ raw: true })
      }
    };

    res.setHeader('Content-disposition', `attachment; filename=msa_cajeme_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backupData));
  } catch (error: any) {
    console.error('[BACKUP] Error exportando BD:', error);
    res.status(500).json({ error: 'Hubo un error exportando la base de datos' });
  }
});

// --- START IMPORT BACKUP ---
router.post('/import', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const dbData = req.body.data;
    if (!dbData) return res.status(400).json({ error: 'Archivo de Respaldo Inválido' });

    console.log('[BACKUP] Iniciando proceso de restauración (Importación JS-Natvia)...');

    // Desactivar temporalmente los chequeos de llave foránea para inserción masiva
    await sequelize.query('SET session_replication_role = replica;', { transaction });

    // 1. Limpiar Bases de Datos Actuales (Wipe)
    await ItemTicket.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Ticket.destroy({ where: {}, truncate: true, cascade: true, transaction });
    
    await ItemHistorial.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await HistorialTicket.destroy({ where: {}, truncate: true, cascade: true, transaction });
    
    await SaleItem.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Sale.destroy({ where: {}, truncate: true, cascade: true, transaction });
    
    await Cliente.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Inventory.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await ItemCatalogo.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Expense.destroy({ where: {}, truncate: true, cascade: true, transaction });

    // 2. Inserción Masiva de Datos del Backup
    if (dbData.clients?.length) await Cliente.bulkCreate(dbData.clients, { transaction });
    if (dbData.tickets?.length) await Ticket.bulkCreate(dbData.tickets, { transaction });
    if (dbData.ticket_items?.length) await ItemTicket.bulkCreate(dbData.ticket_items, { transaction });
    
    if (dbData.historial_tickets?.length) await HistorialTicket.bulkCreate(dbData.historial_tickets, { transaction });
    if (dbData.historial_ticket_items?.length) await ItemHistorial.bulkCreate(dbData.historial_ticket_items, { transaction });
    
    if (dbData.inventory?.length) await Inventory.bulkCreate(dbData.inventory, { transaction });
    if (dbData.item_catalogo?.length) await ItemCatalogo.bulkCreate(dbData.item_catalogo, { transaction });
    
    if (dbData.sales?.length) await Sale.bulkCreate(dbData.sales, { transaction });
    if (dbData.sale_items?.length) await SaleItem.bulkCreate(dbData.sale_items, { transaction });
    if (dbData.expenses?.length) await Expense.bulkCreate(dbData.expenses, { transaction });

    // Reactivar las llaves foráneas
    await sequelize.query('SET session_replication_role = DEFAULT;', { transaction });

    await transaction.commit();
    console.log('[BACKUP] ¡Base de Datos Restaurada con Éxito!');
    res.json({ message: 'Base de datos restaurada correctamente' });

  } catch (error: any) {
    console.error('[BACKUP] Falló la restauración:', error);
    await transaction.rollback();
    res.status(500).json({ error: 'La restauración falló y se han revertido los cambios', details: error.message });
  }
});

export default router;
