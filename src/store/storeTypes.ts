import type { StateCreator } from 'zustand';
import type { Ticket, Client, InventoryItem, Expense, Sale, CatalogItem } from '../types';

export interface TicketSlice {
  tickets: Ticket[];
  totalTickets: number;
  hasMoreTickets: boolean;
  currentPage: number;
  
  addTicket: (data: any) => Promise<any>;
  updateTicketStatus: (id: string, status: string) => Promise<void>;
  editTicket: (id: string, data: any) => Promise<any>;
  deleteTicket: (id: string) => Promise<void>;
  removeTicketGlobal: (id: string) => Promise<void>;
  archiveTicketsByDate: (date: string) => Promise<void>;
  clearTickets: () => Promise<void>;
  loadTickets: (page?: number, search?: string) => Promise<void>;
}

export interface ClientSlice {
  clients: Client[];
  addClient: (data: any) => Promise<any>;
  updateClient: (id: string, data: any) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
}

export interface InventorySlice {
  inventory: InventoryItem[];
  catalog: CatalogItem[];
  addInventoryItem: (data: any) => Promise<any>;
  updateInventoryItem: (id: string, data: any) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  addCatalogItem: (data: any) => Promise<any>;
  deleteCatalogItem: (id: string | number) => Promise<void>;
}

export interface FinanceSlice {
  expenses: Expense[];
  sales: Sale[];
  loadExpenses: () => Promise<void>;
  loadSales: () => Promise<void>;
  addExpense: (data: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<void>;
  clearExpensesByMonth: (month: string) => Promise<void>;
  addSale: (data: any) => Promise<any>;
  clearSalesByMonth: (month: string) => Promise<void>;
}

export interface CoreSlice {
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  pendingTickets: (Ticket & { lastError?: string })[];
  socket: any | null;
  loadAllData: () => Promise<void>;
  initWebSockets: () => void;
  syncOfflineData: () => Promise<void>;
  removePendingTicket: (id: string) => void;
}

export type AppState = TicketSlice & ClientSlice & InventorySlice & FinanceSlice & CoreSlice;

export type AppStateCreator<T> = StateCreator<AppState, [], [], T>;
