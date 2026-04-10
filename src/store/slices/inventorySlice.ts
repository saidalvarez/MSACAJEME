import type { AppStateCreator } from '../storeTypes';
import { dataAdapter } from '../../services/dataAdapter';

export const createInventorySlice: AppStateCreator<Pick<import('../storeTypes').InventorySlice, keyof import('../storeTypes').InventorySlice>> = (set) => ({
  inventory: [],
  catalog: [],

  addInventoryItem: async (data: any) => {
     const finalData = { 
       id: crypto.randomUUID(), 
       created_at: new Date().toISOString(),
       ...data 
     };
     try {
       const res = await dataAdapter.createInventoryItem(finalData);
       set(state => ({ inventory: [res, ...state.inventory] }));
       return res;
     } catch (error) {
       console.error("Error saving inventory (Offline Mode):", error);
       const { addToSyncQueue } = await import('../../utils/sync');
       addToSyncQueue({
         method: 'API',
         apiPath: '/inventory',
         apiBody: finalData
       });
       const offlineItem = { ...finalData, _isOffline: true } as any;
       set(state => ({ inventory: [offlineItem, ...state.inventory] }));
       return offlineItem;
     }
  },

  updateInventoryItem: async (id: string, data: any) => {
    const res = await dataAdapter.updateInventoryItem(id, data);
    set(state => ({
      inventory: state.inventory.map(i => i.id === id ? res : i)
    }));
  },

  deleteInventoryItem: async (id: string) => {
    await dataAdapter.deleteInventoryItem(id);
    set(state => ({ inventory: state.inventory.filter(i => i.id !== id) }));
  },

  addCatalogItem: async (data: any) => {
     const finalData = { 
       id: crypto.randomUUID(), 
       created_at: new Date().toISOString(),
       ...data 
     };
     try {
       const res = await dataAdapter.createCatalogItem(finalData);
       set(state => ({ catalog: [...state.catalog, res] }));
       return res;
     } catch (error) {
       console.error("Error saving catalog item (Offline Mode):", error);
       const { addToSyncQueue } = await import('../../utils/sync');
       addToSyncQueue({
         method: 'API',
         apiPath: '/catalog',
         apiBody: finalData
       });
       const offlineItem = { ...finalData, _isOffline: true } as any;
       set(state => ({ catalog: [...state.catalog, offlineItem] }));
       return offlineItem;
     }
  },

  deleteCatalogItem: async (id: string | number) => {
    await dataAdapter.deleteCatalogItem(id);
    set(state => ({ catalog: state.catalog.filter(c => c.id !== id) }));
  }
});
