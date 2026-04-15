import { Router } from 'express';
import sequelize from '../base_de_datos';
import Cliente from '../models/Cliente';
import Ticket from '../models/Ticket';
import ItemTicket from '../models/ItemTicket';
import Inventory from '../models/Inventory';
import ItemCatalogo from '../models/ItemCatalogo';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import Expense from '../models/Expense';
import Usuario from '../models/Usuario';
import verifyToken from '../middleware/auth';
import authorize from '../middleware/authorize';
import CryptoJS from 'crypto-js';
import logger from '../utils/logger';

const router = Router();
router.use(verifyToken);
router.use(authorize('admin'));

const BACKUP_SECRET = process.env.BACKUP_ENCRYPTION_KEY || (() => { logger.warn('[BACKUP] ⚠️ BACKUP_ENCRYPTION_KEY no configurado — usando clave por defecto'); return '1234'; })();

// --- START EXPORT BACKUP (ENCRYPTED) ---
router.get('/export', async (req, res) => {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '3.0.0', // Nueva versión unificada y encriptada
      data: {
        clients: await Cliente.findAll({ raw: true }),
        tickets: await Ticket.findAll({ raw: true }),
        ticket_items: await ItemTicket.findAll({ raw: true }),
        inventory: await Inventory.findAll({ raw: true }),
        item_catalogo: await ItemCatalogo.findAll({ raw: true }),
        sales: await Sale.findAll({ raw: true }),
        sale_items: await SaleItem.findAll({ raw: true }),
        expenses: await Expense.findAll({ raw: true }),
        usuarios: await Usuario.findAll({ raw: true })
      }
    };

    const plainText = JSON.stringify(backupData);
    // Encriptamos el contenido con AES
    const encrypted = CryptoJS.AES.encrypt(plainText, BACKUP_SECRET).toString();

    res.setHeader('Content-disposition', `attachment; filename=msa_cajeme_secure_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify({ 
        encrypted: true, 
        payload: encrypted,
        note: "Este archivo está protegido. Solo puede importarse en MSA Cajeme."
    }));
  } catch (error: any) {
    logger.error('[BACKUP] Error exportando BD:', error);
    res.status(500).json({ error: 'Hubo un error exportando la base de datos segura' });
  }
});

// --- START IMPORT BACKUP (AUTO-DECRYPT) ---
router.post('/import', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    let dbData: any;
    const body = req.body;

    if (body.encrypted && body.payload) {
      // Intentamos desencriptar
      try {
        const bytes = CryptoJS.AES.decrypt(body.payload, BACKUP_SECRET);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) throw new Error('Password incorrecto o archivo corrupto');
        dbData = JSON.parse(decryptedStr).data;
      } catch (e) {
        return res.status(401).json({ error: 'Error al desencriptar el respaldo. La clave de seguridad no coincide.' });
      }
    } else {
      // Soporte para archivos viejos (no encriptados) si es necesario, 
      // pero por seguridad el usuario pidió fase 3 "alv" con clave.
      dbData = body.data;
    }

    if (!dbData) return res.status(400).json({ error: 'Archivo de Respaldo Inválido' });

    logger.info('[BACKUP] Iniciando restauración segura...');

    // Desactivar chequeos de llave foránea
    await sequelize.query('SET session_replication_role = replica;', { transaction });

    // 1. Wipe de tablas existentes (basado en el nuevo esquema unificado)
    await ItemTicket.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Ticket.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await SaleItem.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Sale.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Cliente.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Inventory.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await ItemCatalogo.destroy({ where: {}, truncate: true, cascade: true, transaction });
    await Expense.destroy({ where: {}, truncate: true, cascade: true, transaction });

    // 2. Inserción Masiva
    if (dbData.clients?.length) await Cliente.bulkCreate(dbData.clients, { transaction });
    if (dbData.tickets?.length) await Ticket.bulkCreate(dbData.tickets, { transaction });
    if (dbData.ticket_items?.length) await ItemTicket.bulkCreate(dbData.ticket_items, { transaction });
    if (dbData.inventory?.length) await Inventory.bulkCreate(dbData.inventory, { transaction });
    if (dbData.item_catalogo?.length) await ItemCatalogo.bulkCreate(dbData.item_catalogo, { transaction });
    if (dbData.sales?.length) await Sale.bulkCreate(dbData.sales, { transaction });
    if (dbData.sale_items?.length) await SaleItem.bulkCreate(dbData.sale_items, { transaction });
    if (dbData.expenses?.length) await Expense.bulkCreate(dbData.expenses, { transaction });

    // Reactivar llaves foráneas
    await sequelize.query('SET session_replication_role = DEFAULT;', { transaction });

    await transaction.commit();
    logger.info('[BACKUP] ¡Base de Datos Restaurada Exitosamente!');
    res.json({ message: 'Base de datos restaurada correctamente' });

  } catch (error: any) {
    logger.error('[BACKUP] Falló la restauración:', error);
    await transaction.rollback();
    res.status(500).json({ error: 'La restauración falló', details: error.message });
  }
});

export default router;
