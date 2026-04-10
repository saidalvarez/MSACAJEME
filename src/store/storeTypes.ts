import type { StateCreator } from 'zustand';
import type { Ticket, Client, InventoryItem, Expense, Sale, CatalogItem } from '../types';

export interface TicketSlice {
  tickets: Ticket[];
  pendingTickets: Ticket[];
  addTicket: (data: any) => Promise<any>;
  updateTicketStatus: (id: string, status: string) => Promise<void>;
  editTicket: (id: string, data: any) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  removeTicketGlobal: (id: string) => Promise<void>;
  archiveTicketsByDate: (date: string) => Promise<void>;
  clearTickets: () => Promise<void>;
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
  addExpense: (data: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<void>;
  clearExpensesByMonth: (month: string) => Promise<void>;
  addSale: (data: any) => Promise<any>;
  clearSalesByMonth: (month: string) => Promise<void>;
}

export interface CoreSlice {
  isLoading: boolean;
  error: string | null;
  loadAllData: () => Promise<void>;
  initWebSockets: () => void;
  syncOfflineData: () => Promise<void>;
}

export type AppState = TicketSlice & ClientSlice & InventorySlice & FinanceSlice & CoreSlice;

export type AppStateCreator<T> = StateCreator<AppState, [], [], T>;
