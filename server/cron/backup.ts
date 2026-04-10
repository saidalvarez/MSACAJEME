import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import winston from 'winston';
import { Op } from 'sequelize';
import Ticket from '../models/Ticket';
import Sale from '../models/Sale';
import ItemTicket from '../models/ItemTicket';
import SaleItem from '../models/SaleItem';

import os from 'os';

// Determine base directories for logs and backups from environment or default to AppData/Home
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.msa_cajeme');
const LOGS_DIR = process.env.MSA_LOG_DIR || path.join(DEFAULT_DATA_DIR, 'logs');
const BACKUP_DIR = process.env.MSA_BACKUP_DIR || path.join(DEFAULT_DATA_DIR, 'backups');

// Ensure directories exist immediately at startup
try {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
} catch (e) {
  console.error(`[CRON] Error creating directories at ${LOGS_DIR} or ${BACKUP_DIR}:`, e);
}

// Configure Winston logger to use the dynamic LOGS_DIR
export const errorLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(LOGS_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(LOGS_DIR, 'combined.log') }),
  ],
});

export const setupCronJobs = () => {
  console.log(`[CRON] Schedulers initialized. Backups: ${BACKUP_DIR}, Logs: ${LOGS_DIR}`);

  // Run everyday at Midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    const dbName = process.env.DB_NAME || 'msa_cajeme';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASS || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup_${dbName}_${timestamp}.sql`);

    // We use PGPASSWORD env variable to avoid password prompt
    const cmd = `pg_dump -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -F c -f "${backupFile}"`;

    console.log(`Starting scheduled database backup for ${dbName}...`);
    exec(cmd, { env: { ...process.env, PGPASSWORD: dbPass } }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup execution error: ${error.message}`);
        errorLogger.error(`Database Backup Failed`, { error: error.message, stderr });
        return;
      }
      if (stderr) {
        console.warn(`Backup stderr: ${stderr}`);
      }
      console.log(`Backup successfully created at ${backupFile}`);
      errorLogger.info(`Scheduled backup completed`, { file: backupFile });
    });
  }, {
    scheduled: true,
    timezone: "America/Phoenix"
  } as any);

  // Automated Soft-Delete Cleanup (Everyday at 1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    try {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        console.log('Initiating 15-day soft-delete cleanup...');
        
        // Find tickets and sales before destroying cascades
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

        console.log(`Cleaned up ${oldTickets.length} tickets and ${oldSales.length} sales permanently.`);
        errorLogger.info('Soft deletes cleanup executed', { tickets: oldTickets.length, sales: oldSales.length });
    } catch (error: any) {
        console.error('Error during soft-delete cleanup:', error.message);
        errorLogger.error('Soft delete cleanup failed', { error: error.message });
    }
  }, {
    scheduled: true,
    timezone: "America/Phoenix"
  } as any);
};
