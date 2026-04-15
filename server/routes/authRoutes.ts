import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models';
import sequelize from '../base_de_datos';
import verifyToken, { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_fallback';

if (!process.env.JWT_SECRET) console.error('⚠️ [AUTH] JWT_SECRET no configurado en .env — usando clave insegura');
if (!process.env.JWT_REFRESH_SECRET) console.error('⚠️ [AUTH] JWT_REFRESH_SECRET no configurado en .env — usando clave insegura');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const user = await Usuario.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('username')), 
        '=', 
        username.toLowerCase()
      )
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrecto' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrecto' });
    }

    // Access token: short-lived (1 hour)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Refresh token: long-lived (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      refreshToken, 
      message: 'Autenticación exitosa',
      force_password_change: user.force_password_change || false
    });
  } catch (error: any) {
    logger.error('[AUTH] Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Refresh Token Endpoint ──
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const verified = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as jwt.JwtPayload;
    
    // Issue a new access token
    const newToken = jwt.sign(
      { id: verified.id, username: verified.username, role: verified.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token: newToken });
  } catch (error) {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

// ── Change Password Endpoint (authenticated) ──
router.post('/change-password', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
    }

    const userData = req.user as any;
    const user = await Usuario.findByPk(userData.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // If not a forced change, verify current password
    if (!user.force_password_change) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'La contraseña actual es requerida' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword, force_password_change: false });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error: any) {
    logger.error('[AUTH] Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── User Management (admin only) ──
import authorize from '../middleware/authorize';

router.get('/users', verifyToken, authorize('admin'), async (_req, res) => {
  try {
    const users = await Usuario.findAll({
      attributes: ['id', 'username', 'role', 'force_password_change', 'created_at']
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/users', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }
    
    const validRoles = ['admin', 'recepcion', 'mecanico'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Rol inválido. Roles válidos: ${validRoles.join(', ')}` });
    }

    const existing = await Usuario.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await Usuario.create({
      username,
      password: hashedPassword,
      role: role || 'mecanico',
      force_password_change: true
    });

    res.status(201).json({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      message: 'Usuario creado exitosamente' 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.delete('/users/:id', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.params.id as string);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await Usuario.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'No puedes eliminar el último administrador' });
      }
    }

    await user.destroy();
    res.json({ message: 'Usuario eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;

