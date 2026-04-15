import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine base directories for logs from environment or AppData
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.msa_cajeme');
const LOGS_DIR = process.env.MSA_LOG_DIR || path.join(DEFAULT_DATA_DIR, 'logs');

// Ensure directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
} catch (e) {
  console.error(`[LOGGER] Error creating logs directory at ${LOGS_DIR}:`, e);
}

// Custom format: timestamp + level + message
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // Error-only log (max 5MB, keep 5 rotated files)
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    }),
    // Combined log
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

export const LOGS_PATH = LOGS_DIR;
export default logger;
