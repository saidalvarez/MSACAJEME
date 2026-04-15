"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
const Cliente_1 = __importDefault(require("../models/Cliente"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const ItemTicket_1 = __importDefault(require("../models/ItemTicket"));
const Inventory_1 = __importDefault(require("../models/Inventory"));
const ItemCatalogo_1 = __importDefault(require("../models/ItemCatalogo"));
const Sale_1 = __importDefault(require("../models/Sale"));
const SaleItem_1 = __importDefault(require("../models/SaleItem"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Usuario_1 = __importDefault(require("../models/Usuario"));
const auth_1 = __importDefault(require("../middleware/auth"));
const authorize_1 = __importDefault(require("../middleware/authorize"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.use((0, authorize_1.default)('admin'));
const BACKUP_SECRET = process.env.BACKUP_ENCRYPTION_KEY || (() => { logger_1.default.warn('[BACKUP] ⚠️ BACKUP_ENCRYPTION_KEY no configurado — usando clave por defecto'); return '1234'; })();
// --- START EXPORT BACKUP (ENCRYPTED) ---
router.get('/export', async (req, res) => {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '3.0.0', // Nueva versión unificada y encriptada
            data: {
                clients: await Cliente_1.default.findAll({ raw: true }),
                tickets: await Ticket_1.default.findAll({ raw: true }),
                ticket_items: await ItemTicket_1.default.findAll({ raw: true }),
                inventory: await Inventory_1.default.findAll({ raw: true }),
                item_catalogo: await ItemCatalogo_1.default.findAll({ raw: true }),
                sales: await Sale_1.default.findAll({ raw: true }),
                sale_items: await SaleItem_1.default.findAll({ raw: true }),
                expenses: await Expense_1.default.findAll({ raw: true }),
                usuarios: await Usuario_1.default.findAll({ raw: true })
            }
        };
        const plainText = JSON.stringify(backupData);
        // Encriptamos el contenido con AES
        const encrypted = crypto_js_1.default.AES.encrypt(plainText, BACKUP_SECRET).toString();
        res.setHeader('Content-disposition', `attachment; filename=msa_cajeme_secure_backup_${Date.now()}.json`);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify({
            encrypted: true,
            payload: encrypted,
            note: "Este archivo está protegido. Solo puede importarse en MSA Cajeme."
        }));
    }
    catch (error) {
        logger_1.default.error('[BACKUP] Error exportando BD:', error);
        res.status(500).json({ error: 'Hubo un error exportando la base de datos segura' });
    }
});
// --- START IMPORT BACKUP (AUTO-DECRYPT) ---
router.post('/import', async (req, res) => {
    const transaction = await base_de_datos_1.default.transaction();
    try {
        let dbData;
        const body = req.body;
        if (body.encrypted && body.payload) {
            // Intentamos desencriptar
            try {
                const bytes = crypto_js_1.default.AES.decrypt(body.payload, BACKUP_SECRET);
                const decryptedStr = bytes.toString(crypto_js_1.default.enc.Utf8);
                if (!decryptedStr)
                    throw new Error('Password incorrecto o archivo corrupto');
                dbData = JSON.parse(decryptedStr).data;
            }
            catch (e) {
                return res.status(401).json({ error: 'Error al desencriptar el respaldo. La clave de seguridad no coincide.' });
            }
        }
        else {
            // Soporte para archivos viejos (no encriptados) si es necesario, 
            // pero por seguridad el usuario pidió fase 3 "alv" con clave.
            dbData = body.data;
        }
        if (!dbData)
            return res.status(400).json({ error: 'Archivo de Respaldo Inválido' });
        logger_1.default.info('[BACKUP] Iniciando restauración segura...');
        // Desactivar chequeos de llave foránea
        await base_de_datos_1.default.query('SET session_replication_role = replica;', { transaction });
        // 1. Wipe de tablas existentes (basado en el nuevo esquema unificado)
        await ItemTicket_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await Ticket_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await SaleItem_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await Sale_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await Cliente_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await Inventory_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await ItemCatalogo_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        await Expense_1.default.destroy({ where: {}, truncate: true, cascade: true, transaction });
        // 2. Inserción Masiva
        if (dbData.clients?.length)
            await Cliente_1.default.bulkCreate(dbData.clients, { transaction });
        if (dbData.tickets?.length)
            await Ticket_1.default.bulkCreate(dbData.tickets, { transaction });
        if (dbData.ticket_items?.length)
            await ItemTicket_1.default.bulkCreate(dbData.ticket_items, { transaction });
        if (dbData.inventory?.length)
            await Inventory_1.default.bulkCreate(dbData.inventory, { transaction });
        if (dbData.item_catalogo?.length)
            await ItemCatalogo_1.default.bulkCreate(dbData.item_catalogo, { transaction });
        if (dbData.sales?.length)
            await Sale_1.default.bulkCreate(dbData.sales, { transaction });
        if (dbData.sale_items?.length)
            await SaleItem_1.default.bulkCreate(dbData.sale_items, { transaction });
        if (dbData.expenses?.length)
            await Expense_1.default.bulkCreate(dbData.expenses, { transaction });
        // Reactivar llaves foráneas
        await base_de_datos_1.default.query('SET session_replication_role = DEFAULT;', { transaction });
        await transaction.commit();
        logger_1.default.info('[BACKUP] ¡Base de Datos Restaurada Exitosamente!');
        res.json({ message: 'Base de datos restaurada correctamente' });
    }
    catch (error) {
        logger_1.default.error('[BACKUP] Falló la restauración:', error);
        await transaction.rollback();
        res.status(500).json({ error: 'La restauración falló', details: error.message });
    }
});
exports.default = router;
