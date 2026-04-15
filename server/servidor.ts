import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import sequelize from './base_de_datos';
import authRoutes from './routes/authRoutes';
import clientsRoutes from './routes/clientsRoutes';
import ticketsRoutes from './routes/ticketsRoutes';
import historialRoutes from './routes/historialRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import catalogRoutes from './routes/catalogRoutes';
import expensesRoutes from './routes/expensesRoutes';
import salesRoutes from './routes/salesRoutes';
import financeRoutes from './routes/financeRoutes';
import trashRoutes from './routes/trashRoutes';
import backupRoutes from './routes/backupRoutes';
import adminRoutes from './routes/adminRoutes';
import emailRoutes from './routes/emailRoutes';
import notesRoutes from './routes/notesRoutes';
import seedAdmin from './seedAdmin';
import { setupCronJobs } from './cron/backup';
import { errorHandler } from './middleware/errorHandler';
import verifyToken from './middleware/auth';
import logger from './utils/logger';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ── CORS: Only allow configured origins ──
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

// Add Tauri protocols for production desktop app
allowedOrigins.push('tauri://localhost');
allowedOrigins.push('https://tauri.localhost');
allowedOrigins.push('http://tauri.localhost'); // Added for Windows Tauri v2
allowedOrigins.push('http://localhost:3001'); // Self-referential for some environments

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Tauri)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`[WS] Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`[WS] Cliente desconectado: ${socket.id}`);
  });
});

// Request logging middleware
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    logger.info(`${req.method} ${req.path}`);
  }
  next();
});

// 5mb general limit — backup import route has its own 50mb limit
app.use(express.json({ limit: '15mb' }));

// ── Rate Limiting: General API (300 req/min) ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }
});

// ── Rate Limiting: Login (10 attempts per 15min) ──
const loginLimiter = rateLimit({
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
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/trash', trashRoutes);
// Backup import needs larger body — apply 50mb limit only to this route
app.use('/api/backup/import', express.json({ limit: '50mb' }));
app.use('/api/backup', backupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/notes', notesRoutes);

// ── Health check endpoint (public — no auth needed) ──
app.get('/api/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected', version: '2.0.0', host: process.env.DB_HOST || 'localhost', db_name: process.env.DB_NAME || 'msa_cajeme' });
  } catch (error: any) {
    logger.error('[HEALTH] Database check failed', { error: error.message });
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
      await sequelize.authenticate();
    } catch (e) {
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
      } catch (err) {
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

    const updates: Record<string, string> = {
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
      } else {
        newContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, newContent.trim() + '\n');
    logger.info(`[CONFIG] Base de datos actualizada a: ${db_name}.`);

    res.json({ message: 'Configuración guardada. Reinicia el servidor para aplicar cambios.' });
  } catch (error: any) {
    logger.error('[CONFIG] Error:', { error: error.message });
    res.status(500).json({ error: 'Error al actualizar base de datos' });
  }
});

// ── Global Error Handler ──
app.use(errorHandler);

// ── Initialize Cron Jobs ──
setupCronJobs();

const PORT = process.env.PORT || 3001;

// ── CRITICAL: Start HTTP server FIRST, regardless of DB status ──
// This ensures the /api/config/database and /api/health endpoints
// are always reachable, even if the DB credentials are wrong.
server.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`[SERVER] Taller MSA Cajeme v2.0 corriendo en puerto ${PORT}`);
  logger.info(`[SERVER] Rate Limit: 300 req/min (API), 10 req/15min (Login)`);
});

// ── Then attempt DB connection (non-blocking) ──
// NOTE: We NO LONGER use sync({ alter: true }) because it can drop columns with data.
// Schema changes should be handled through manual SQL migrations.
sequelize.authenticate()
  .then(async () => {
    logger.info('[DB] Conexión a PostgreSQL establecida exitosamente.');
    
    // Safe sync: only creates tables that don't exist yet, never alters existing ones
    await sequelize.sync({ force: false });
    logger.info(`[DB] Base de datos "${process.env.DB_NAME || 'msa_cajeme'}" verificada`);
    
    // --- AUTO-HEALING: Add missing columns if they don't exist
    try {
      logger.info('[DB] Verificando e inyectando columnas faltantes (Auto-healing)...');
      const tablesWithCreated = ['expenses', 'tickets', 'sales', 'sale_items', 'item_tickets', 'audit_logs', 'usuarios'];
      for (const table of tablesWithCreated) {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;`).catch(()=>null);
      }
      
      const tablesWithDeleted = ['expenses', 'tickets', 'sales', 'sale_items', 'item_tickets'];
      for (const table of tablesWithDeleted) {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;`).catch(()=>null);
      }

      const tablesWithArchived = ['sales', 'expenses', 'tickets', 'inventory'];
      for (const table of tablesWithArchived) {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false;`).catch(()=>null);
      }

      // Ensure audit_logs id is autoincrement (this is tricky in postgres, but if it exists as integer, it won't auto-increment if not serial. We will alter its mapping or default value)
      // A quick fix for audit_logging id constraint error is just to use a sequence.
      await sequelize.query(`CREATE SEQUENCE IF NOT EXISTS audit_logs_id_seq;`).catch(()=>null);
      await sequelize.query(`ALTER TABLE "audit_logs" ALTER COLUMN id SET DEFAULT nextval('audit_logs_id_seq');`).catch(()=>null);
      await sequelize.query(`ALTER SEQUENCE audit_logs_id_seq OWNED BY "audit_logs".id;`).catch(()=>null);

      logger.info('[DB] Reparación de esquema completada.');
    } catch (healErr: any) {
      logger.warn('[DB] Error en auto-reparación (ignorando):', { error: healErr.message });
    }

    // --- INDICES B-TREE (ESCALABILIDAD) ---
    try {
      logger.info('[DB] Aplicando Índices B-Tree...');
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date DESC);`);
      logger.info('[DB] Índices aplicados exitosamente.');
    } catch (idxErr: any) {
      logger.warn('[DB] Error creando índices (ignorando):', { error: idxErr.message });
    }
    
    await seedAdmin();
  })
  .catch((err: any) => {
    logger.error('[DB] Error al conectar/sincronizar:', { error: err.message });
    logger.warn('[DB] El servidor HTTP sigue activo. Usa /api/config/database para corregir.');
  });
