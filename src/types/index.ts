// ── MSA Cajeme — Typed Interfaces ──

export interface TicketItem {
  id: number;
  ticket_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Ticket {
  id: string;
  ticket_number: number;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  vehicle?: string;
  total: number;
  status: 'pending' | 'completed';
  format_type: string;
  notes?: string;
  discount: number;
  is_archived: boolean;
  date: string;
  service_photo?: string;
  items: TicketItem[];
  _isOffline?: boolean;
  // Legacy camelCase aliases (from old code paths)
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  formatType?: string;
  servicePhoto?: string;
  ticketNumber?: number;
  isArchived?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  registrationDate?: string;
  created_at: string;
  _isOffline?: boolean;
}

export interface InventoryItem {
  id: string;
  brand: string;
  type: string;
  viscosity?: string;
  category?: string;
  initialStock: number;
  currentStock: number;
  purchaseNumber: string;
  image?: string;
  purchasePrice?: number;
  marketPrice?: number;
  wholesalePrice?: number;
  barcode?: string;
  min_stock?: number;
  date: string;
  created_at?: string;
  _isOffline?: boolean;
  // snake_case aliases from raw SQL
  initial_stock?: number;
  current_stock?: number;
  purchase_price?: number;
  market_price?: number;
  purchase_number?: string;
}

export interface SaleItem {
  id?: number;
  sale_id?: string;
  name?: string;
  brand?: string;
  type?: string;
  viscosity?: string;
  barcode?: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Sale {
  id: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  date: string;
  is_archived: boolean;
  items: SaleItem[];
  _isOffline?: boolean;
  // Legacy aliases
  clientName?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
  paymentMethod?: string;
  is_archived?: boolean;
  _isOffline?: boolean;
}

export interface CatalogItem {
  id: string | number;
  brand: string;
  viscosity: string;
  type: string;
  image?: string;
  marketPrice?: number;
  category?: string;
  barcode?: string;
  created_at?: string;
  _isOffline?: boolean;
  market_price?: number;
}