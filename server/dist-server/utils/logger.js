"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGS_PATH = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
// Determine base directories for logs from environment or AppData
const DEFAULT_DATA_DIR = path_1.default.join(os_1.default.homedir(), '.msa_cajeme');
const LOGS_DIR = process.env.MSA_LOG_DIR || path_1.default.join(DEFAULT_DATA_DIR, 'logs');
// Ensure directory exists
try {
    if (!fs_1.default.existsSync(LOGS_DIR))
        fs_1.default.mkdirSync(LOGS_DIR, { recursive: true });
}
catch (e) {
    console.error(`[LOGGER] Error creating logs directory at ${LOGS_DIR}:`, e);
}
// Custom format: timestamp + level + message
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
}));
exports.logger = winston_1.default.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), logFormat)
        }),
        // Error-only log (max 5MB, keep 5 rotated files)
        new winston_1.default.transports.File({
            filename: path_1.default.join(LOGS_DIR, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        }),
        // Combined log
        new winston_1.default.transports.File({
            filename: path_1.default.join(LOGS_DIR, 'combined.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        })
    ]
});
exports.LOGS_PATH = LOGS_DIR;
exports.default = exports.logger;
