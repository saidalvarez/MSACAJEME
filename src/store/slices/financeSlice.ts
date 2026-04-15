import type { AppStateCreator } from '../storeTypes';
import { dataAdapter } from '../../services/dataAdapter';

export const createFinanceSlice: AppStateCreator<Pick<import('../storeTypes').FinanceSlice, keyof import('../storeTypes').FinanceSlice>> = (set) => ({
  expenses: [],
  sales: [],

  loadExpenses: async () => {
    try {
      const res = await dataAdapter.getExpenses() as any;
      set({ expenses: res.rows || res || [] });
    } catch (error) {
       console.error("Failed to load expenses:", error);
    }
  },

  loadSales: async () => {
    try {
      const res = await dataAdapter.getSales() as any;
      set({ sales: res.rows || res || [] });
    } catch (error) {
       console.error("Failed to load sales:", error);
    }
  },

  addExpense: async (data: any) => {
    const finalData = { 
      id: crypto.randomUUID(), 
      created_at: new Date().toISOString(),
      ...data 
    };
    try {
      const res = await dataAdapter.createExpense(finalData);
      set(state => ({ expenses: [res, ...state.expenses] }));
      return res;
    } catch (error) {
       console.error("Error saving expense (Offline Mode):", error);
       const { addToSyncQueue } = await import('../../utils/sync');
       addToSyncQueue({
         method: 'API',
         apiPath: '/expenses',
         apiBody: finalData
       });
       
       const offlineExpense = { ...finalData, _isOffline: true } as any;
       set(state => ({ expenses: [offlineExpense, ...state.expenses] }));
       return offlineExpense;
    }
  },

  deleteExpense: async (id: string) => {
    await dataAdapter.deleteExpense(id);
    set(state => ({ expenses: state.expenses.filter(e => e.id !== id) }));
  },

  clearExpensesByMonth: async (month: string) => {
    await dataAdapter.clearExpensesByMonth(month);
    const expenses = await dataAdapter.getExpenses() as any;
    set({ expenses: expenses.rows || expenses || [] });
  },

  addSale: async (data: any) => {
    const finalData = { 
      id: crypto.randomUUID(), 
      client_id: data.client_id || data.clientId,
      created_at: new Date().toISOString(),
      date: data.date || new Date().toISOString(),
      ...data 
    };
    try {
      const res = await dataAdapter.createSale(finalData);
      set(state => ({ sales: [res, ...state.sales] }));
      
      const inventory = await dataAdapter.getInventory() as any;
      set({ inventory: inventory.rows || inventory || [] });
      return res;
    } catch (error) {
       console.error("Error saving sale (Offline Mode):", error);
       const { addToSyncQueue } = await import('../../utils/sync');
       addToSyncQueue({
         method: 'API',
         apiPath: '/sales',
         apiBody: finalData
       });
       
       const offlineSale = { ...finalData, _isOffline: true } as any;
       set(state => ({ sales: [offlineSale, ...state.sales] }));
       return offlineSale;
    }
  },

  clearSalesByMonth: async (month: string) => {
    await dataAdapter.clearSalesByMonth(month);
    const sales = await dataAdapter.getSales() as any;
    set({ sales: sales.rows || sales || [] });
  }
});
