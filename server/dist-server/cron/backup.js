"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.setupCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Sale_1 = __importDefault(require("../models/Sale"));
const ItemTicket_1 = __importDefault(require("../models/ItemTicket"));
const SaleItem_1 = __importDefault(require("../models/SaleItem"));
const logger_1 = __importDefault(require("../utils/logger"));
exports.errorLogger = logger_1.default;
const os_1 = __importDefault(require("os"));
// Determine base directories from environment or default to AppData/Home
const DEFAULT_DATA_DIR = path_1.default.join(os_1.default.homedir(), '.msa_cajeme');
const BACKUP_DIR = process.env.MSA_BACKUP_DIR || path_1.default.join(DEFAULT_DATA_DIR, 'backups');
// Ensure directory exists
try {
    if (!fs_1.default.existsSync(BACKUP_DIR))
        fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
}
catch (e) {
    console.error(`[CRON] Error creating backup directory at ${BACKUP_DIR}:`, e);
}
/**
 * Runs a pg_dump backup and saves it to the backup directory.
 */
const runDatabaseBackup = () => {
    const dbName = process.env.DB_NAME || 'msa_cajeme';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path_1.default.join(BACKUP_DIR, `backup_${dbName}_${timestamp}.sql`);
    const cmd = `pg_dump -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -F c -f "${backupFile}"`;
    logger_1.default.info(`[BACKUP] Iniciando respaldo de "${dbName}"...`);
    (0, child_process_1.exec)(cmd, { env: { ...process.env, PGPASSWORD: dbPass } }, (error, _stdout, stderr) => {
        if (error) {
            logger_1.default.error(`[BACKUP] Falló el respaldo`, { error: error.message, stderr });
            return;
        }
        if (stderr) {
            logger_1.default.warn(`[BACKUP] stderr: ${stderr}`);
        }
        logger_1.default.info(`[BACKUP] Respaldo creado: ${backupFile}`);
    });
};
/**
 * Cleans up old backup files (older than 30 days)
 */
const cleanupOldBackups = () => {
    try {
        const files = fs_1.default.readdirSync(BACKUP_DIR);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let cleaned = 0;
        for (const file of files) {
            if (!file.startsWith('backup_'))
                continue;
            const filePath = path_1.default.join(BACKUP_DIR, file);
            const stats = fs_1.default.statSync(filePath);
            if (stats.mtimeMs < thirtyDaysAgo) {
                fs_1.default.unlinkSync(filePath);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger_1.default.info(`[BACKUP] Limpieza: ${cleaned} respaldos antiguos eliminados (>30 días)`);
        }
    }
    catch (err) {
        logger_1.default.error('[BACKUP] Error en limpieza de respaldos:', { error: err.message });
    }
};
const setupCronJobs = () => {
    logger_1.default.info(`[CRON] Schedulers initialized. Backups: ${BACKUP_DIR}`);
    // ═══ BACKUP: Every 6 hours (00:00, 06:00, 12:00, 18:00) ═══
    node_cron_1.default.schedule('0 */6 * * *', () => {
        runDatabaseBackup();
        cleanupOldBackups();
    }, {
        scheduled: true,
        timezone: "America/Phoenix"
    });
    // ═══ SOFT-DELETE CLEANUP: Every day at 1:00 AM ═══
    node_cron_1.default.schedule('0 1 * * *', async () => {
        try {
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
            logger_1.default.info('[CRON] Iniciando limpieza de soft-deletes (>15 días)...');
            const oldTickets = await Ticket_1.default.findAll({ where: { deletedAt: { [sequelize_1.Op.lte]: fifteenDaysAgo } }, paranoid: false });
            for (const t of oldTickets) {
                await ItemTicket_1.default.destroy({ where: { ticket_id: t.getDataValue('id') }, force: true });
                await t.destroy({ force: true });
            }
            const oldSales = await Sale_1.default.findAll({ where: { deletedAt: { [sequelize_1.Op.lte]: fifteenDaysAgo } }, paranoid: false });
            for (const s of oldSales) {
                await SaleItem_1.default.destroy({ where: { sale_id: s.getDataValue('id') }, force: true });
                await s.destroy({ force: true });
            }
            logger_1.default.info(`[CRON] Limpieza completada: ${oldTickets.length} tickets, ${oldSales.length} ventas eliminadas`);
        }
        catch (error) {
            logger_1.default.error('[CRON] Error en limpieza:', { error: error.message });
        }
    }, {
        scheduled: true,
        timezone: "America/Phoenix"
    });
};
exports.setupCronJobs = setupCronJobs;
