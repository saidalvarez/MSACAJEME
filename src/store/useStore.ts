import { create } from 'zustand';
import type { AppState } from './storeTypes';
import { createTicketSlice } from './slices/ticketSlice';
import { createClientSlice } from './slices/clientSlice';
import { createInventorySlice } from './slices/inventorySlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createCoreSlice } from './slices/coreSlice';

export const useStore = create<AppState>((...a) => ({
  ...createCoreSlice(...a),
  ...createTicketSlice(...a),
  ...createClientSlice(...a),
  ...createInventorySlice(...a),
  ...createFinanceSlice(...a),
}));
