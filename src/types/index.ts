export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string; // Para las notas
}

export interface Ticket {
  id: string;
  ticketNumber: number; // El #3, #2 de la imagen
  createdAt: string;    // Fecha y hora
  client: Client;
  items: ProductItem[];
  status: 'paid' | 'pending' | 'quote'; // 'quote' para cotizaciones
  discount: number;
  total: number;
}