import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import Ticket from '../models/Ticket';
import Sale from '../models/Sale';
import ItemTicket from '../models/ItemTicket';
import SaleItem from '../models/SaleItem';
import logger from '../utils/logger';
import os from 'os';

// Determine base directories from environment or default to AppData/Home
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.msa_cajeme');
const BACKUP_DIR = process.env.MSA_BACKUP_DIR || path.join(DEFAULT_DATA_DIR, 'backups');

// Ensure directory exists
try {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
} catch (e) {
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
  const backupFile = path.join(BACKUP_DIR, `backup_${dbName}_${timestamp}.sql`);

  const cmd = `pg_dump -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -F c -f "${backupFile}"`;

  logger.info(`[BACKUP] Iniciando respaldo de "${dbName}"...`);
  exec(cmd, { env: { ...process.env, PGPASSWORD: dbPass } }, (error, _stdout, stderr) => {
    if (error) {
      logger.error(`[BACKUP] Falló el respaldo`, { error: error.message, stderr });
      return;
    }
    if (stderr) {
      logger.warn(`[BACKUP] stderr: ${stderr}`);
    }
    logger.info(`[BACKUP] Respaldo creado: ${backupFile}`);
  });
};

/**
 * Cleans up old backup files (older than 30 days)
 */
const cleanupOldBackups = () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const file of files) {
      if (!file.startsWith('backup_')) continue;
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtimeMs < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[BACKUP] Limpieza: ${cleaned} respaldos antiguos eliminados (>30 días)`);
    }
  } catch (err: any) {
    logger.error('[BACKUP] Error en limpieza de respaldos:', { error: err.message });
  }
};

export const setupCronJobs = () => {
  logger.info(`[CRON] Schedulers initialized. Backups: ${BACKUP_DIR}`);

  // ═══ BACKUP: Every 6 hours (00:00, 06:00, 12:00, 18:00) ═══
  cron.schedule('0 */6 * * *', () => {
    runDatabaseBackup();
    cleanupOldBackups();
  }, {
    scheduled: true,
    timezone: "America/Phoenix"
  } as any);

  // ═══ SOFT-DELETE CLEANUP: Every day at 1:00 AM ═══
  cron.schedule('0 1 * * *', async () => {
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      logger.info('[CRON] Iniciando limpieza de soft-deletes (>15 días)...');
      
      const oldTickets = await Ticket.findAll({ where: { deletedAt: { [Op.lte]: fifteenDaysAgo } }, paranoid: false });
      for (const t of oldTickets) {
        await ItemTicket.destroy({ where: { ticket_id: t.getDataValue('id') }, force: true });
        await t.destroy({ force: true });
      }

      const oldSales = await Sale.findAll({ where: { deletedAt: { [Op.lte]: fifteenDaysAgo } }, paranoid: false });
      for (const s of oldSales) {
        await SaleItem.destroy({ where: { sale_id: s.getDataValue('id') }, force: true });
        await s.destroy({ force: true });
      }

      logger.info(`[CRON] Limpieza completada: ${oldTickets.length} tickets, ${oldSales.length} ventas eliminadas`);
    } catch (error: any) {
      logger.error('[CRON] Error en limpieza:', { error: error.message });
    }
  }, {
    scheduled: true,
    timezone: "America/Phoenix"
  } as any);
};

// Re-export for backwards compatibility
export { logger as errorLogger };
