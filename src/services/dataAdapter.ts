// Database operations now use the secureApi (Express + PostgreSQL backend).

import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Returns the new token or null if refresh fails.
 */
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = sessionStorage.getItem('msa_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) return null;

    const data = await response.json();
    sessionStorage.setItem('msa_token', data.token);
    return data.token;
  } catch {
    return null;
  }
};

/**
 * Intercepts API calls to inject Authentication headers, auto-refresh tokens, and handle global errors.
 */
const secureApi = {
  get: async <T>(path: string): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      let response = await fetch(`${API_BASE}${path}`, { headers });
      
      // Auto-refresh on 401
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, { headers });
        } else {
          toast.error("Sesión expirada. Por favor, inicia sesión de nuevo.");
          sessionStorage.clear();
          window.location.reload();
          throw new Error('Session expired');
        }
      }

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    } catch (error: any) {
      console.error(`GET ${path} failed:`, error);
      throw error;
    }
  },
  post: async <T>(path: string, body: any, silent = false): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      let response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
        } else {
          sessionStorage.clear();
          window.location.reload();
          throw new Error('Session expired');
        }
      }

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    } catch (error: any) {
      console.error(`POST ${path} failed:`, error);
      if (!silent) toast.error("Error al enviar datos al servidor.");
      throw error;
    }
  },
  put: async <T>(path: string, body: any, silent = false): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      let response = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
        } else {
          sessionStorage.clear();
          window.location.reload();
          throw new Error('Session expired');
        }
      }

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    } catch (error: any) {
      console.error(`PUT ${path} failed:`, error);
      if (!silent) toast.error("Error al actualizar datos.");
      throw error;
    }
  },
  delete: async <T>(path: string, silent = false): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      let response = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
        } else {
          sessionStorage.clear();
          window.location.reload();
          throw new Error('Session expired');
        }
      }

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    } catch (error: any) {
      console.error(`DELETE ${path} failed:`, error);
      if (!silent) toast.error("Error al eliminar el registro.");
      throw error;
    }
  }
};

import type { Ticket, Client, InventoryItem, Expense, Sale, CatalogItem } from '../types';

export const dataAdapter = {
  // CLIENTES
  getClients: (): Promise<Client[]> => secureApi.get('/clients'),
  createClient: (data: any): Promise<Client> => secureApi.post('/clients', data),
  updateClient: (id: string, data: any): Promise<Client> => secureApi.put(`/clients/${id}`, data),
  deleteClient: (id: string) => secureApi.delete(`/clients/${id}`),

  // INVENTARIO
  getInventory: (): Promise<InventoryItem[]> => secureApi.get('/inventory'),
  createInventoryItem: (data: any): Promise<InventoryItem> => secureApi.post('/inventory', data),
  updateInventoryItem: (id: string, data: any): Promise<InventoryItem> => secureApi.put(`/inventory/${id}`, data),
  deleteInventoryItem: (id: string) => secureApi.delete(`/inventory/${id}`),

  // CATALOGO
  getCatalog: (): Promise<CatalogItem[]> => secureApi.get('/catalog'),
  createCatalogItem: (data: any): Promise<CatalogItem> => secureApi.post('/catalog', data),
  deleteCatalogItem: (id: any) => secureApi.delete(`/catalog/${id}`),

  // GASTOS
  getExpenses: (): Promise<Expense[]> => secureApi.get('/expenses'),
  createExpense: (data: any): Promise<Expense> => secureApi.post('/expenses', data),
  deleteExpense: (id: string) => secureApi.delete(`/expenses/${id}`),
  clearExpensesByMonth: (month: string) => secureApi.post('/expenses/clear', { month }),

  // VENTAS
  getSales: (): Promise<Sale[]> => secureApi.get('/sales'),
  createSale: (data: any): Promise<Sale> => secureApi.post('/sales', data),
  clearSalesByMonth: (month: string) => secureApi.post('/sales/clear', { month }),

  // TICKETS / SERVICIOS ACTIVOS
  getTickets: (limit = 20, offset = 0, search = ''): Promise<{ rows: Ticket[], count: number }> => {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (search) params.append('search', search);
    return secureApi.get(`/tickets?${params.toString()}`);
  },
  createTicket: (data: any, silent = false): Promise<Ticket> => secureApi.post('/tickets', data, silent),
  updateTicket: (id: string, data: any, silent = false): Promise<Ticket> => secureApi.put(`/tickets/${id}`, data, silent),
  deleteTicket: (id: string) => secureApi.delete(`/tickets/${id}`),
  archiveTickets: (date: string) => secureApi.post('/tickets/archive-by-date', { date }),
  clearTickets: () => secureApi.delete('/tickets/clear'),

  // HISTORIAL GLOBAL (tabla separada)
  getHistorial: async (page = 1, limit = 20, search = '', dateFrom = '', dateTo = '', clientId = ''): Promise<{ rows: Ticket[], count: number }> => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (clientId) params.append('clientId', clientId);
    return secureApi.get(`/historial?${params.toString()}`);
  },
  deleteHistorialTicket: (id: string) => secureApi.delete(`/historial/${id}`),
  clearHistorial: () => secureApi.delete('/historial'),

  // RESPALDOS Y SEGURIDAD
  exportDatabase: () => secureApi.get('/backup/export'),
  importDatabase: (data: any) => secureApi.post('/backup/import', data),
  createCloudBackup: () => secureApi.post('/backup/cloud', {}),

  // PAPELERA DE RECICLAJE (SOFT DELETES)
  getTrash: () => secureApi.get('/trash'),
  recoverTrashItem: (type: 'ticket' | 'sale', id: string) => secureApi.post(`/trash/recover/${type}/${id}`, {}),
  forceDeleteTrashItem: (type: 'ticket' | 'sale', id: string) => secureApi.delete(`/trash/force/${type}/${id}`),

  // FINANCIAL AGGREGATIONS
  getFinanceSummary: (monthYYYYMM: string) => secureApi.get(`/finance/summary?month=${monthYYYYMM}`),
  getFinanceChart: () => secureApi.get('/finance/chart'),

  // ADMIN MONITORING
  getSystemStats: () => secureApi.get('/admin/stats'),
  getLogs: () => secureApi.get('/admin/logs'),
  clearLogs: () => secureApi.post('/admin/logs/clear', {})
};


