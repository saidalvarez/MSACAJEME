"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
/**
 * Middleware de autorización por roles.
 * Uso: router.delete('/danger', verifyToken, authorize('admin'), handler)
 *
 * Roles disponibles:
 *   - admin:      Acceso total (config, backup, borrado, usuarios)
 *   - recepcion:  Crear/editar tickets, clientes, ventas. Sin config ni borrado masivo.
 *   - mecanico:   Solo ver y actualizar status de tickets asignados.
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
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
exports.authorize = authorize;
exports.default = exports.authorize;
