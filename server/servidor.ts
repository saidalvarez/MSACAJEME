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
import seedAdmin from './seedAdmin';
import { setupCronJobs } from './cron/backup';
import { errorHandler } from './middleware/errorHandler';
import verifyToken from './middleware/auth';

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
  console.log(`[WS] Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] Cliente desconectado: ${socket.id}`);
  });
});

// 5mb general limit — backup import route has its own 50mb limit
app.use(express.json({ limit: '5mb' }));

// ── Rate Limiting: General API (100 req/min) ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }
});

// ── Rate Limiting: Login (5 attempts per 15min) ──
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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

// ── Health check endpoint (public — no auth needed) ──
app.get('/api/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected', version: '1.0.0' });
  } catch (error: any) {
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
    console.log(`[CONFIG] Base de datos actualizada a: ${db_name}.`);

    res.json({ message: 'Configuración guardada. Reinicia el servidor para aplicar cambios.' });
  } catch (error: any) {
    console.error('[CONFIG] Error:', error);
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
  console.log(`[SERVER] Taller MSA Cajeme v1.0 corriendo en puerto ${PORT}`);
  console.log(`[SERVER] Rate Limit: 100 req/min (API), 5 req/15min (Login)`);
});

// ── Then attempt DB connection (non-blocking) ──
sequelize.authenticate()
  .then(() => {
    console.log('[DB] Conexión a PostgreSQL establecida exitosamente.');
    return sequelize.sync({ alter: true });
  })
  .then(async () => {
    console.log(`[DB] Base de datos "${process.env.DB_NAME || 'msa_cajeme'}" sincronizada`);
    
    // --- INDICES B-TREE (ESCALABILIDAD) ---
    try {
      console.log('[DB] Aplicando Índices B-Tree para alta velocidad escalar...');
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date DESC);`);
      
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_historial_client ON historial_tickets(client_id);`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_historial_date ON historial_tickets(date DESC);`);
      console.log('[DB] Índices aplicados exitosamente.');
    } catch (idxErr: any) {
      console.error('[DB] Error creando índices (ignorando si ya existen):', idxErr.message);
    }
    
    await seedAdmin();
  })
  .catch((err: any) => {
    console.error('[DB] Error al conectar/sincronizar:', err.message);
    console.error('[DB] El servidor HTTP sigue activo. Usa /api/config/database para corregir.');
  });
