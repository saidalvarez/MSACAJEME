"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const base_de_datos_1 = __importDefault(require("./base_de_datos"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const clientsRoutes_1 = __importDefault(require("./routes/clientsRoutes"));
const ticketsRoutes_1 = __importDefault(require("./routes/ticketsRoutes"));
const historialRoutes_1 = __importDefault(require("./routes/historialRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const catalogRoutes_1 = __importDefault(require("./routes/catalogRoutes"));
const expensesRoutes_1 = __importDefault(require("./routes/expensesRoutes"));
const salesRoutes_1 = __importDefault(require("./routes/salesRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const trashRoutes_1 = __importDefault(require("./routes/trashRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const emailRoutes_1 = __importDefault(require("./routes/emailRoutes"));
const notesRoutes_1 = __importDefault(require("./routes/notesRoutes"));
const seedAdmin_1 = __importDefault(require("./seedAdmin"));
const backup_1 = require("./cron/backup");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./utils/logger"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// ── CORS: Only allow configured origins ──
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());
// Add Tauri protocols for production desktop app
allowedOrigins.push('tauri://localhost');
allowedOrigins.push('https://tauri.localhost');
allowedOrigins.push('http://tauri.localhost'); // Added for Windows Tauri v2
allowedOrigins.push('http://localhost:3001'); // Self-referential for some environments
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Tauri)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});
app.set('io', io);
io.on('connection', (socket) => {
    logger_1.default.info(`[WS] Cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => {
        logger_1.default.info(`[WS] Cliente desconectado: ${socket.id}`);
    });
});
// Request logging middleware
app.use((req, _res, next) => {
    if (req.path !== '/api/health') {
        logger_1.default.info(`${req.method} ${req.path}`);
    }
    next();
});
// 5mb general limit — backup import route has its own 50mb limit
app.use(express_1.default.json({ limit: '15mb' }));
// ── Rate Limiting: General API (300 req/min) ──
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }
});
// ── Rate Limiting: Login (10 attempts per 15min) ──
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' }
});
// Apply limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
// ── Routes ──
app.use('/api/auth', authRoutes_1.default);
app.use('/api/clients', clientsRoutes_1.default);
app.use('/api/tickets', ticketsRoutes_1.default);
app.use('/api/historial', historialRoutes_1.default);
app.use('/api/inventory', inventoryRoutes_1.default);
app.use('/api/catalog', catalogRoutes_1.default);
app.use('/api/expenses', expensesRoutes_1.default);
app.use('/api/sales', salesRoutes_1.default);
app.use('/api/finance', financeRoutes_1.default);
app.use('/api/trash', trashRoutes_1.default);
// Backup import needs larger body — apply 50mb limit only to this route
app.use('/api/backup/import', express_1.default.json({ limit: '50mb' }));
app.use('/api/backup', backupRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/email', emailRoutes_1.default);
app.use('/api/notes', notesRoutes_1.default);
// ── Health check endpoint (public — no auth needed) ──
app.get('/api/health', async (_req, res) => {
    try {
        await base_de_datos_1.default.authenticate();
        res.json({ status: 'ok', database: 'connected', version: '2.0.0', host: process.env.DB_HOST || 'localhost', db_name: process.env.DB_NAME || 'msa_cajeme' });
    }
    catch (error) {
        logger_1.default.error('[HEALTH] Database check failed', { error: error.message });
        res.status(500).json({
            status: 'error',
            server: 'running',
            database: 'disconnected',
            error: error.message
        });
    }
});
// ── Database configuration endpoint (protected unless DB is down) ──
const SAFE_DB_FIELD = /^[a-zA-Z0-9_.-]+$/;
const SAFE_DB_PASSWORD = /^[^\n\r]*$/; // Passwords can have special chars but no newlines
app.post('/api/config/database', async (req, res) => {
    try {
        const { host, db_name, user, password } = req.body;
        // Check if we already have a working connection
        let dbIsDown = false;
        try {
            await base_de_datos_1.default.authenticate();
        }
        catch (e) {
            dbIsDown = true;
        }
        // Security: Only allow unprotected access if the DB is actually down
        // This allows for initial setup when no user can log in yet.
        if (!dbIsDown) {
            // If DB is UP, we MUST have a valid token to change config
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(403).json({ error: 'La base de datos ya está vinculada. Inicia sesión para cambiar la configuración.' });
            }
            // Manual verification since we are in an async route
            try {
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
                const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_only';
                require('jsonwebtoken').verify(token, JWT_SECRET);
            }
            catch (err) {
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
        }
        const fs = require('fs');
        const path = require('path');
        const envPath = path.resolve(process.cwd(), '.env');
        if (!host || !db_name || !user) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (host, db_name, user)' });
        }
        // Sanitize inputs to prevent command injection
        if (!SAFE_DB_FIELD.test(host) || !SAFE_DB_FIELD.test(db_name) || !SAFE_DB_FIELD.test(user)) {
            return res.status(400).json({ error: 'Caracteres no permitidos en la configuración' });
        }
        // SEC-04: Sanitize password — prevent newline injection into .env file
        if (password && !SAFE_DB_PASSWORD.test(password)) {
            return res.status(400).json({ error: 'La contraseña contiene caracteres no permitidos' });
        }
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
        const updates = {
            'DB_HOST': host,
            'DB_NAME': db_name,
            'DB_USER': user,
            'DB_PASSWORD': password || ''
        };
        let newContent = envContent;
        for (const [key, value] of Object.entries(updates)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (newContent.match(regex)) {
                newContent = newContent.replace(regex, `${key}=${value}`);
            }
            else {
                newContent += `\n${key}=${value}`;
            }
        }
        fs.writeFileSync(envPath, newContent.trim() + '\n');
        logger_1.default.info(`[CONFIG] Base de datos actualizada a: ${db_name}.`);
        res.json({ message: 'Configuración guardada. Reinicia el servidor para aplicar cambios.' });
    }
    catch (error) {
        logger_1.default.error('[CONFIG] Error:', { error: error.message });
        res.status(500).json({ error: 'Error al actualizar base de datos' });
    }
});
// ── Global Error Handler ──
app.use(errorHandler_1.errorHandler);
// ── Initialize Cron Jobs ──
(0, backup_1.setupCronJobs)();
const PORT = process.env.PORT || 3001;
// ── CRITICAL: Start HTTP server FIRST, regardless of DB status ──
// This ensures the /api/config/database and /api/health endpoints
// are always reachable, even if the DB credentials are wrong.
server.listen(Number(PORT), '0.0.0.0', () => {
    logger_1.default.info(`[SERVER] Taller MSA Cajeme v2.0 corriendo en puerto ${PORT}`);
    logger_1.default.info(`[SERVER] Rate Limit: 300 req/min (API), 10 req/15min (Login)`);
});
// ── Then attempt DB connection (non-blocking) ──
// NOTE: We NO LONGER use sync({ alter: true }) because it can drop columns with data.
// Schema changes should be handled through manual SQL migrations.
base_de_datos_1.default.authenticate()
    .then(async () => {
    logger_1.default.info('[DB] Conexión a PostgreSQL establecida exitosamente.');
    // Safe sync: only creates tables that don't exist yet, never alters existing ones
    await base_de_datos_1.default.sync({ force: false });
    logger_1.default.info(`[DB] Base de datos "${process.env.DB_NAME || 'msa_cajeme'}" verificada`);
    // --- AUTO-HEALING: Add missing columns if they don't exist
    try {
        logger_1.default.info('[DB] Verificando e inyectando columnas faltantes (Auto-healing)...');
        const tablesWithCreated = ['expenses', 'tickets', 'sales', 'sale_items', 'item_tickets', 'audit_logs', 'usuarios'];
        for (const table of tablesWithCreated) {
            await base_de_datos_1.default.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;`).catch(() => null);
        }
        const tablesWithDeleted = ['expenses', 'tickets', 'sales', 'sale_items', 'item_tickets'];
        for (const table of tablesWithDeleted) {
            await base_de_datos_1.default.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;`).catch(() => null);
        }
        const tablesWithArchived = ['sales', 'expenses', 'tickets', 'inventory'];
        for (const table of tablesWithArchived) {
            await base_de_datos_1.default.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false;`).catch(() => null);
        }
        // Ensure audit_logs id is autoincrement (this is tricky in postgres, but if it exists as integer, it won't auto-increment if not serial. We will alter its mapping or default value)
        // A quick fix for audit_logging id constraint error is just to use a sequence.
        await base_de_datos_1.default.query(`CREATE SEQUENCE IF NOT EXISTS audit_logs_id_seq;`).catch(() => null);
        await base_de_datos_1.default.query(`ALTER TABLE "audit_logs" ALTER COLUMN id SET DEFAULT nextval('audit_logs_id_seq');`).catch(() => null);
        await base_de_datos_1.default.query(`ALTER SEQUENCE audit_logs_id_seq OWNED BY "audit_logs".id;`).catch(() => null);
        logger_1.default.info('[DB] Reparación de esquema completada.');
    }
    catch (healErr) {
        logger_1.default.warn('[DB] Error en auto-reparación (ignorando):', { error: healErr.message });
    }
    // --- INDICES B-TREE (ESCALABILIDAD) ---
    try {
        logger_1.default.info('[DB] Aplicando Índices B-Tree...');
        await base_de_datos_1.default.query(`CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);`);
        await base_de_datos_1.default.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
        await base_de_datos_1.default.query(`CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date DESC);`);
        await base_de_datos_1.default.query(`CREATE INDEX IF NOT EXISTS idx_historial_client ON historial_tickets(client_id);`);
        await base_de_datos_1.default.query(`CREATE INDEX IF NOT EXISTS idx_historial_date ON historial_tickets(date DESC);`);
        logger_1.default.info('[DB] Índices aplicados exitosamente.');
    }
    catch (idxErr) {
        logger_1.default.warn('[DB] Error creando índices (ignorando):', { error: idxErr.message });
    }
    await (0, seedAdmin_1.default)();
})
    .catch((err) => {
    logger_1.default.error('[DB] Error al conectar/sincronizar:', { error: err.message });
    logger_1.default.warn('[DB] El servidor HTTP sigue activo. Usa /api/config/database para corregir.');
});
