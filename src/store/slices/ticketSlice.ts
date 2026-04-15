import type { AppStateCreator } from '../storeTypes';
import { dataAdapter } from '../../services/dataAdapter';
import toast from 'react-hot-toast';

// Helper: Genera fecha local Arizona (MST) en formato ISO para la DB
const getArizonaDate = () => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Phoenix' }).replace(' ', 'T');
};

export const createTicketSlice: AppStateCreator<Pick<import('../storeTypes').TicketSlice, keyof import('../storeTypes').TicketSlice>> = (set, get) => ({
  tickets: [],
  totalTickets: 0,
  hasMoreTickets: true,
  currentPage: 1,

  loadTickets: async (page = 1, search = '') => {
    try {
      const limit = 20;
      const offset = (page - 1) * limit;
      const res = await dataAdapter.getTickets(limit, offset, search) as any;
      
      const newTickets = res.rows || [];
      const totalCount = res.count || 0;

      set(state => ({
        tickets: page === 1 ? newTickets : [...state.tickets, ...newTickets],
        totalTickets: totalCount,
        hasMoreTickets: state.tickets.length + newTickets.length < totalCount,
        currentPage: page
      }));
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast.error("Error al cargar servicios");
    }
  },

  addTicket: async (data: any) => {
    const ticketId = crypto.randomUUID();
    const finalData = { 
      id: ticketId,
      client_id: data.client_id || data.clientId,
      date: getArizonaDate(),
      ...data 
    };
    
     try {
       const res = await dataAdapter.createTicket({
         ...finalData,
         client_name: finalData.clientName || finalData.client_name,
         client_phone: finalData.clientPhone || finalData.client_phone || '',
         client_email: finalData.clientEmail || finalData.client_email || '',
         format_type: finalData.formatType || finalData.format_type || 'payment_info',
         service_photo: finalData.servicePhoto || finalData.service_photo || '',
         service_category: finalData.serviceCategory || finalData.service_category || 'general'
       });
       
       set(state => ({ 
         tickets: [res, ...state.tickets],
         totalTickets: state.totalTickets + 1
       }));
       
       const inventoryRes = await dataAdapter.getInventory() as any;
       set({ inventory: inventoryRes.rows || inventoryRes || [] });
       
       return res;
     } catch (error) {
      console.error("Error saving ticket (Offline Mode):", error);
      const offlineTicket = { ...finalData, _isOffline: true } as any;
      set((state: any) => {
        const newPending = [...(state.pendingTickets || []), offlineTicket];
        localStorage.setItem('msa_pending_tickets', JSON.stringify(newPending));
        return { 
          tickets: [offlineTicket, ...state.tickets],
          pendingTickets: newPending
        };
      });
      return offlineTicket;
    }
  },
  
  updateTicketStatus: async (id: string, status: string) => {
    try {
      const payload: any = { status };
      // Don't overwrite the original `date` — it's the creation/service date.
      // The `archived_at` field is used for archival timestamps instead.

      set(state => ({
        tickets: state.tickets.map(t => t.id === id ? { ...t, ...payload } : t)
      }));
      await dataAdapter.updateTicket(id, payload, true);
    } catch (e) {
      console.error("Failed to update ticket status online", e);
    }
  },

  editTicket: async (id: string, data: any) => {
    const payload = {
      ...data,
      format_type: data.formatType || data.format_type,
      service_photo: data.servicePhoto || data.service_photo,
      items: data.items?.map((item: any) => {
         const { id, ...rest } = item;
         return rest;
      })
    };
    
    try {
      const updatedTicket = await dataAdapter.updateTicket(id, payload);
      
      set(state => ({
        tickets: state.tickets.map(t => t.id === id ? { ...t, ...updatedTicket } : t)
      }));
    } catch (error) {
      console.error("Error updating ticket store:", error);
      // Fallback update in case of sync issues
      set(state => ({
        tickets: state.tickets.map(t => t.id === id ? { ...t, ...data } : t)
      }));
    }
  },

  deleteTicket: async (id: string) => {
    const prevTickets = get().tickets;
    const prevTotal = get().totalTickets;
    set(state => ({ 
      tickets: state.tickets.filter(t => t.id !== id),
      totalTickets: Math.max(0, state.totalTickets - 1)
    }));
    try {
      await dataAdapter.deleteTicket(id);
    } catch (error) {
      console.error("Error deleting ticket, restoring state:", error);
      set({ tickets: prevTickets, totalTickets: prevTotal });
      toast.error("Error al eliminar el servicio");
    }
  },

  removeTicketGlobal: async (id: string) => {
    const { tickets } = get();
    const isActive = tickets.some(t => t.id === id);
    if (isActive) {
       await dataAdapter.deleteTicket(id);
       set({ 
         tickets: tickets.filter(t => t.id !== id),
         totalTickets: Math.max(0, get().totalTickets - 1)
       });
    } else {
       await dataAdapter.deleteHistorialTicket(id);
    }
  },

  archiveTicketsByDate: async (date: string) => {
    const prevState = {
      tickets: get().tickets,
      sales: get().sales,
      expenses: get().expenses
    };

    try {
      const res: any = await dataAdapter.archiveTickets(date);
      toast.success(`${res.count || 0} servicios archivados correctamente`);
      
      // Refresh current page
      await get().loadTickets(1);
      
      // Mark local sales/expenses as archived for the UI
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      
      set(state => ({
        sales: Array.isArray(state.sales) ? state.sales.map(s => new Date(s.date) >= startOfDay && new Date(s.date) <= endOfDay ? { ...s, is_archived: true } : s) : [],
        expenses: Array.isArray(state.expenses) ? state.expenses.map(e => new Date(e.date) >= startOfDay && new Date(e.date) <= endOfDay ? { ...e, is_archived: true } : e) : []
      }));

    } catch (error) {
      console.error('Error archiving tickets:', error);
      set(prevState);
      toast.error('Error al hacer el corte de día');
      throw error;
    }
  },

  clearTickets: async () => {
    set({ tickets: [], totalTickets: 0 });
    await dataAdapter.clearTickets();
  }
});
