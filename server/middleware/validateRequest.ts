import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        return res.status(400).json({ 
          error: 'Error de validación de datos', 
          details: issues.map((e: any) => `${e.path?.join('.') || 'body'}: ${e.message}`)
        });
      }
      return res.status(500).json({ error: 'Error interno de validación' });
    }
  };
};
