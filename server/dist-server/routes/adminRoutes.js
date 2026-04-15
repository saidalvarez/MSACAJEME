"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("../middleware/auth"));
const authorize_1 = __importDefault(require("../middleware/authorize"));
const logger_1 = require("../utils/logger");
const logger_2 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Protección global: Solo Admins
router.use(auth_1.default);
router.use((0, authorize_1.default)('admin'));
/**
 * Obtiene estadísticas vitales del sistema.
 */
router.get('/stats', (req, res) => {
    try {
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = (usedMem / totalMem) * 100;
        const stats = {
            uptime: os_1.default.uptime(),
            platform: os_1.default.platform(),
            arch: os_1.default.arch(),
            cpuCount: os_1.default.cpus().length,
            loadAvg: os_1.default.loadavg(), // [1, 5, 15 min]
            memory: {
                total: (totalMem / (1024 ** 3)).toFixed(2) + ' GB',
                used: (usedMem / (1024 ** 3)).toFixed(2) + ' GB',
                free: (freeMem / (1024 ** 3)).toFixed(2) + ' GB',
                percent: memUsagePercent.toFixed(1) + '%'
            },
            timestamp: new Date().toISOString()
        };
        res.json(stats);
    }
    catch (error) {
        logger_2.default.error('[ADMIN] Error obteniendo estadísticas:', error.message);
        res.status(500).json({ error: 'Fallo al obtener métricas del sistema' });
    }
});
/**
 * Obtiene las últimas líneas del log combinado.
 */
router.get('/logs', (req, res) => {
    try {
        const logFile = path_1.default.join(logger_1.LOGS_PATH, 'combined.log');
        if (!fs_1.default.existsSync(logFile)) {
            return res.json({ logs: 'No se encontraron archivos de log todavía.' });
        }
        // Leemos las últimas 500 líneas (aprox) de forma eficiente
        const stats = fs_1.default.statSync(logFile);
        const fileSize = stats.size;
        const bufferSize = Math.min(fileSize, 50 * 1024); // Últimos 50KB
        const buffer = Buffer.alloc(bufferSize);
        const fd = fs_1.default.openSync(logFile, 'r');
        fs_1.default.readSync(fd, buffer, 0, bufferSize, fileSize - bufferSize);
        fs_1.default.closeSync(fd);
        const logs = buffer.toString('utf8');
        // Limpiamos líneas incompletas al inicio si el buffer cortó una
        const cleanLogs = logs.includes('\n') ? logs.substring(logs.indexOf('\n') + 1) : logs;
        res.json({ logs: cleanLogs });
    }
    catch (error) {
        logger_2.default.error('[ADMIN] Error leyendo logs:', error.message);
        res.status(500).json({ error: 'Fallo al leer archivos de registro' });
    }
});
/**
 * Vacía el archivo de logs (Mantenimiento).
 */
router.post('/logs/clear', (req, res) => {
    try {
        const combinedLog = path_1.default.join(logger_1.LOGS_PATH, 'combined.log');
        const errorLog = path_1.default.join(logger_1.LOGS_PATH, 'error.log');
        if (fs_1.default.existsSync(combinedLog))
            fs_1.default.writeFileSync(combinedLog, '');
        if (fs_1.default.existsSync(errorLog))
            fs_1.default.writeFileSync(errorLog, '');
        logger_2.default.info(`[ADMIN] Logs vaciados por el usuario ${req.body.userId || 'admin'}`);
        res.json({ message: 'Archivos de log vaciados correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'No se pudieron vaciar los logs' });
    }
});
exports.default = router;
