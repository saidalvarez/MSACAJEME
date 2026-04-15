import { z } from 'zod';

export const ticketItemSchema = z.object({
  id: z.any().optional(),
  name: z.string().min(1, 'El nombre del servicio/producto es requerido'),
  price: z.number().min(0, 'El precio debe ser 0 o mayor'),
  quantity: z.number().min(1, 'La cantidad mínima es 1'),
  inventory_id: z.string().optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  brand: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  viscosity: z.string().optional().nullable(),
  image: z.string().optional().nullable()
});

export const createTicketSchema = z.object({
  client_name: z.string().min(1, 'El nombre del cliente es requerido'),
  client_phone: z.string().nullish(),
  client_email: z.string().email('Debe ser un email válido').nullish().or(z.literal('')),
  vehicle: z.string().optional().nullable(),
  format_type: z.string().optional().default('payment_info'),
  items: z.array(ticketItemSchema).min(1, 'Se requiere al menos un servicio o producto'),
  discount: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional().nullable(),
  service_photo: z.string().optional().nullable(),
});
