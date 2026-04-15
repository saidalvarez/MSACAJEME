"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketSchema = exports.createTicketSchema = exports.ticketItemSchema = void 0;
const zod_1 = require("zod");
exports.ticketItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre del servicio/producto es requerido'),
    price: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val >= 0, {
        message: 'El precio debe ser un número válido mayor o igual a 0',
    }),
    quantity: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().transform((val) => val ? Number(val) : 1),
    inventory_id: zod_1.z.string().optional().nullable(),
    brand: zod_1.z.string().optional().nullable(),
    type: zod_1.z.string().optional().nullable(),
    viscosity: zod_1.z.string().optional().nullable(),
    image: zod_1.z.string().optional().nullable()
});
exports.createTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        client_name: zod_1.z.string().min(1, 'El nombre del cliente es requerido'),
        client_phone: zod_1.z.string().nullish(),
        client_email: zod_1.z.string().email('Debe ser un email válido').nullish().or(zod_1.z.literal('')),
        vehicle: zod_1.z.string().optional().nullable(),
        format_type: zod_1.z.enum(['payment_info', 'invoice', 'estimate']).optional().default('payment_info'),
        items: zod_1.z.array(exports.ticketItemSchema).min(1, 'Se requiere al menos un servicio o producto'),
        discount: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().transform((val) => Number(val) || 0)
    })
});
exports.updateTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'completed', 'cancelled']).optional(),
        client_name: zod_1.z.string().optional(),
        client_phone: zod_1.z.string().nullish(),
        client_email: zod_1.z.string().email('Debe ser un email válido').nullish().or(zod_1.z.literal('')),
        vehicle: zod_1.z.string().optional().nullable(),
        format_type: zod_1.z.enum(['payment_info', 'invoice', 'estimate']).optional(),
        items: zod_1.z.array(exports.ticketItemSchema).optional(),
        discount: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().transform((val) => val ? Number(val) : undefined)
    })
});
