import { z } from 'zod';

export const ticketItemSchema = z.object({
  name: z.string().min(1, 'El nombre del servicio/producto es requerido'),
  price: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val >= 0, {
    message: 'El precio debe ser un número válido mayor o igual a 0',
  }),
  quantity: z.union([z.number(), z.string()]).optional().transform((val) => val ? Number(val) : 1),
  inventory_id: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  viscosity: z.string().optional().nullable(),
  image: z.string().optional().nullable()
});

export const createTicketSchema = z.object({
  body: z.object({
    client_name: z.string().min(1, 'El nombre del cliente es requerido'),
    client_phone: z.string().nullish(),
    client_email: z.string().email('Debe ser un email válido').nullish().or(z.literal('')),
    vehicle: z.string().optional().nullable(),
    format_type: z.enum(['payment_info', 'invoice', 'estimate']).optional().default('payment_info'),
    items: z.array(ticketItemSchema).min(1, 'Se requiere al menos un servicio o producto'),
    discount: z.union([z.number(), z.string()]).optional().transform((val) => Number(val) || 0)
  })
});

export const updateTicketSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'completed', 'cancelled']).optional(),
    client_name: z.string().optional(),
    client_phone: z.string().nullish(),
    client_email: z.string().email('Debe ser un email válido').nullish().or(z.literal('')),
    vehicle: z.string().optional().nullable(),
    format_type: z.enum(['payment_info', 'invoice', 'estimate']).optional(),
    items: z.array(ticketItemSchema).optional(),
    discount: z.union([z.number(), z.string()]).optional().transform((val) => val ? Number(val) : undefined)
  })
});
