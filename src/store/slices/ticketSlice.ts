import type { AppStateCreator } from '../storeTypes';
import { dataAdapter } from '../../services/dataAdapter';
import toast from 'react-hot-toast';

// Helper: Genera fecha local Arizona (MST) en formato ISO para la DB
const getArizonaDate = () => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Phoenix' }).replace(' ', 'T');
};

export const createTicketSlice: AppStateCreator<Pick<import('../storeTypes').TicketSlice, keyof import('../storeTypes').TicketSlice>> = (set, get) => ({
  tickets: [],
  pendingTickets: JSON.parse(localStorage.getItem('msa_pending_tickets') || '[]'),

  addTicket: async (data: any) => {
    const ticketId = crypto.randomUUID();
    
    const finalData = { 
      id: ticketId,
      client_id: data.client_id || data.clientId,
      date: getArizonaDate(),
      ...data 
    };
    
     try {
       // Normalize camelCase → snake_case for backend compatibility
       const ticketToSend = {
         ...finalData,
         client_name: finalData.clientName || finalData.client_name,
         client_phone: finalData.clientPhone || finalData.client_phone || '',
         client_email: finalData.clientEmail || finalData.client_email || '',
         format_type: finalData.formatType || finalData.format_type || 'payment_info',
         service_photo: finalData.servicePhoto || finalData.service_photo || '',
         service_category: finalData.serviceCategory || finalData.service_category || 'general',
         items: finalData.items?.map((item: any) => {
           const { id, ...rest } = item;
           return rest;
         })
       };
       const res = await dataAdapter.createTicket(ticketToSend);
       set(state => ({ tickets: [res, ...state.tickets] }));
       
       const inventoryRes = await dataAdapter.getInventory() as any;
       set({ inventory: inventoryRes.rows || inventoryRes || [] });
       
       return res;
     } catch (error) {
      console.error("Error saving ticket (Offline Mode):", error);
      
      const offlineTicket = { ...finalData, _isOffline: true } as any;
      set((state: any) => {
        const newPending = [...state.pendingTickets, offlineTicket];
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
      if (status === 'completed') payload.date = getArizonaDate(); 

      set(state => ({
        tickets: state.tickets.map(t => t.id === id ? { ...t, ...payload } : t)
      }));
      await dataAdapter.updateTicket(id, payload, true);
    } catch (e) {
      console.error("Failed to update ticket status online", e);
    }
  },

  editTicket: async (id: string, data: any) => {
     set(state => ({
      tickets: state.tickets.map(t => t.id === id ? { ...t, ...data } : t)
    }));
    
    const payload = {
      ...data,
      format_type: data.formatType || data.format_type,
      service_photo: data.servicePhoto || data.service_photo,
      items: data.items?.map((item: any) => {
         const { id, ...rest } = item;
         return rest;
      })
    };
    
    await dataAdapter.updateTicket(id, payload);
    const tickets = await dataAdapter.getTickets() as any;
    set({ tickets: tickets.rows || tickets || [] });
  },

  deleteTicket: async (id: string) => {
    set(state => ({ tickets: state.tickets.filter(t => t.id !== id) }));
    await dataAdapter.deleteTicket(id);
  },

  removeTicketGlobal: async (id: string) => {
    const { tickets } = get();
    const isActive = tickets.some(t => t.id === id);
    if (isActive) {
       await dataAdapter.deleteTicket(id);
       set({ tickets: tickets.filter(t => t.id !== id) });
    } else {
       // Is a historial ticket, API handles it, local UI will refresh
       await dataAdapter.deleteHistorialTicket(id);
    }
  },

  archiveTicketsByDate: async (date: string) => {
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    // Save snapshot for rollback
    const prevState = {
      tickets: get().tickets,
      sales: get().sales,
      expenses: get().expenses
    };

    set(state => {
        const toKeep = state.tickets.filter(t => {
            const tDate = new Date(t.date);
            return !(t.status === 'completed' && tDate >= startOfDay && tDate <= endOfDay);
        });

        const updatedSales = state.sales.map(s => {
            const sDate = new Date(s.date);
            if (sDate >= startOfDay && sDate <= endOfDay) return { ...s, is_archived: true };
            return s;
        });

        const updatedExpenses = state.expenses.map(e => {
            const eDate = new Date(e.date);
            if (eDate >= startOfDay && eDate <= endOfDay) return { ...e, is_archived: true };
            return e;
        });

        return {
            tickets: toKeep,
            sales: updatedSales,
            expenses: updatedExpenses
        };
    });

    try {
      await dataAdapter.archiveTickets(date);
    } catch (error) {
      console.error('Error archiving tickets:', error);
      // Rollback optimistic update on failure
      set(prevState);
      toast.error('Error al hacer el corte de día. Intenta de nuevo.');
      throw error;
    }
  },

  clearTickets: async () => {
    set({ tickets: [] });
    await dataAdapter.clearTickets();
  }
});
