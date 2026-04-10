import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Handler]:', err);
  
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ 
      error: 'Error de base de datos', 
      details: err.errors.map((e: any) => e.message) 
    });
  }

  // Never leak internal error details in production
  res.status(500).json({ 
    error: 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR'
  });
};
