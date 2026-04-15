"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInventorySchema = exports.createInventorySchema = void 0;
const zod_1 = require("zod");
exports.createInventorySchema = zod_1.z.object({
    body: zod_1.z.object({
        brand: zod_1.z.string().min(1, 'La marca es requerida'),
        type: zod_1.z.string().min(1, 'El tipo es requerido'),
        viscosity: zod_1.z.string().optional(),
        category: zod_1.z.string().optional().default('Aceite'),
        initialStock: zod_1.z.number().int().nonnegative('El stock inicial no puede ser negativo').default(0),
        currentStock: zod_1.z.number().int().nonnegative('El stock actual no puede ser negativo').default(0),
        purchaseNumber: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        purchasePrice: zod_1.z.number().nonnegative().optional(),
        marketPrice: zod_1.z.number().nonnegative().optional(),
        wholesalePrice: zod_1.z.number().nonnegative().optional(),
        date: zod_1.z.string().optional(),
        barcode: zod_1.z.string().optional()
    })
});
exports.updateInventorySchema = zod_1.z.object({
    body: exports.createInventorySchema.shape.body.partial()
});
