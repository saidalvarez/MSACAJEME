import { z } from 'zod';

export const createInventorySchema = z.object({
  body: z.object({
    brand: z.string().min(1, 'La marca es requerida'),
    type: z.string().min(1, 'El tipo es requerido'),
    viscosity: z.string().optional(),
    category: z.string().optional().default('Aceite'),
    initialStock: z.number().int().nonnegative('El stock inicial no puede ser negativo').default(0),
    currentStock: z.number().int().nonnegative('El stock actual no puede ser negativo').default(0),
    purchaseNumber: z.string().optional(),
    image: z.string().optional(),
    purchasePrice: z.number().nonnegative().optional(),
    marketPrice: z.number().nonnegative().optional(),
    wholesalePrice: z.number().nonnegative().optional(),
    date: z.string().optional(),
    barcode: z.string().optional()
  })
});

export const updateInventorySchema = z.object({
  body: createInventorySchema.shape.body.partial()
});
