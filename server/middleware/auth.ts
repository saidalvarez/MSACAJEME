import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (() => { console.warn('[AUTH] ⚠️ JWT_SECRET no configurado en .env — usando fallback inseguro'); return 'dev_fallback_only'; })();

export interface AuthenticatedRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>> => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    const verified = jwt.verify(cleanToken, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized token' });
  }
};

export default verifyToken;
