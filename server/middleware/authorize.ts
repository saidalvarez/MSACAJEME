import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware de autorización por roles.
 * Uso: router.delete('/danger', verifyToken, authorize('admin'), handler)
 * 
 * Roles disponibles:
 *   - admin:      Acceso total (config, backup, borrado, usuarios)
 *   - recepcion:  Crear/editar tickets, clientes, ventas. Sin config ni borrado masivo.
 *   - mecanico:   Solo ver y actualizar status de tickets asignados.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
    const user = req.user as any;
    
    if (!user || !user.role) {
      return res.status(403).json({ error: 'No se pudo determinar el rol del usuario' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}. Tu rol: ${user.role}` 
      });
    }

    next();
  };
};

export default authorize;
