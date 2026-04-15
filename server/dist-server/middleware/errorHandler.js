"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('[Error Handler]:', err);
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: 'Error de base de datos',
            details: err.errors.map((e) => e.message)
        });
    }
    // Never leak internal error details in production
    res.status(500).json({
        error: 'Error interno del servidor',
        code: err.code || 'INTERNAL_ERROR'
    });
};
exports.errorHandler = errorHandler;
