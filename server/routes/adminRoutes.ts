import { Router } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import verifyToken from '../middleware/auth';
import authorize from '../middleware/authorize';
import { LOGS_PATH } from '../utils/logger';
import logger from '../utils/logger';

const router = Router();

// Protección global: Solo Admins
router.use(verifyToken);
router.use(authorize('admin'));

/**
 * Obtiene estadísticas vitales del sistema.
 */
router.get('/stats', (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    const stats = {
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg(), // [1, 5, 15 min]
      memory: {
        total: (totalMem / (1024 ** 3)).toFixed(2) + ' GB',
        used: (usedMem / (1024 ** 3)).toFixed(2) + ' GB',
        free: (freeMem / (1024 ** 3)).toFixed(2) + ' GB',
        percent: memUsagePercent.toFixed(1) + '%'
      },
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error: any) {
    logger.error('[ADMIN] Error obteniendo estadísticas:', error.message);
    res.status(500).json({ error: 'Fallo al obtener métricas del sistema' });
  }
});

/**
 * Obtiene las últimas líneas del log combinado.
 */
router.get('/logs', (req, res) => {
  try {
    const logFile = path.join(LOGS_PATH, 'combined.log');
    
    if (!fs.existsSync(logFile)) {
      return res.json({ logs: 'No se encontraron archivos de log todavía.' });
    }

    // Leemos las últimas 500 líneas (aprox) de forma eficiente
    const stats = fs.statSync(logFile);
    const fileSize = stats.size;
    const bufferSize = Math.min(fileSize, 50 * 1024); // Últimos 50KB
    const buffer = Buffer.alloc(bufferSize);
    
    const fd = fs.openSync(logFile, 'r');
    fs.readSync(fd, buffer, 0, bufferSize, fileSize - bufferSize);
    fs.closeSync(fd);

    const logs = buffer.toString('utf8');
    // Limpiamos líneas incompletas al inicio si el buffer cortó una
    const cleanLogs = logs.includes('\n') ? logs.substring(logs.indexOf('\n') + 1) : logs;

    res.json({ logs: cleanLogs });
  } catch (error: any) {
    logger.error('[ADMIN] Error leyendo logs:', error.message);
    res.status(500).json({ error: 'Fallo al leer archivos de registro' });
  }
});

/**
 * Vacía el archivo de logs (Mantenimiento).
 */
router.post('/logs/clear', (req, res) => {
  try {
    const combinedLog = path.join(LOGS_PATH, 'combined.log');
    const errorLog = path.join(LOGS_PATH, 'error.log');

    if (fs.existsSync(combinedLog)) fs.writeFileSync(combinedLog, '');
    if (fs.existsSync(errorLog)) fs.writeFileSync(errorLog, '');

    logger.info(`[ADMIN] Logs vaciados por el usuario ${req.body.userId || 'admin'}`);
    res.json({ message: 'Archivos de log vaciados correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'No se pudieron vaciar los logs' });
  }
});

export default router;
