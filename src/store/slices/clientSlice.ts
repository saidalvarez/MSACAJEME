import type { AppStateCreator } from '../storeTypes';
import { dataAdapter } from '../../services/dataAdapter';

export const createClientSlice: AppStateCreator<Pick<import('../storeTypes').ClientSlice, keyof import('../storeTypes').ClientSlice>> = (set) => ({
  clients: [],
  addClient: async (data: any) => {
    // GENERATE OPTIMISTIC ID: [Initials] + [Last 4 Phone]
    const name = data.name || "";
    const phone = data.phone || "";
    const nameParts = name.trim().split(/\s+/);
    let initials = "";
    if (nameParts.length >= 2) {
      initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
      initials = nameParts[0].substring(0, 2).toUpperCase();
    } else if (nameParts.length === 1) {
      initials = (nameParts[0][0] + "X").toUpperCase();
    } else {
      initials = "CL";
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const last4 = cleanPhone.slice(-4).padStart(4, '0');
    const baseId = `${initials}${last4}`;
    
    const finalData = { 
      id: baseId, // Optimistic ID
      created_at: new Date().toISOString(),
      ...data 
    };
   try {
     const res = await dataAdapter.createClient(finalData);
     set(state => ({ clients: [res, ...state.clients] }));
     return res;
   } catch (error) {
     console.error("Error saving client (Offline Mode):", error);
     const { addToSyncQueue } = await import('../../utils/sync');
     addToSyncQueue({
       method: 'API',
       apiPath: '/clients',
       apiBody: finalData
     });
     const offlineClient = { ...finalData, _isOffline: true } as any;
     set(state => ({ clients: [offlineClient, ...state.clients] }));
     return offlineClient;
   }
  },
  updateClient: async (id: string, data: any) => {
    const res = await dataAdapter.updateClient(id, data);
    set((state: any) => {
      const oldClient = state.clients.find((c: any) => c.id === id);
      const nextClients = state.clients.map((c: any) => c.id === id ? res : c);
      
      if (!oldClient) return { clients: nextClients };

      const updateTicket = (t: any) => {
        // PRIORITY: Match by client_id
        const idMatch = t.client_id === id;
        
        // SECONDARY: Match by name (for legacy records missing client_id)
        const nameMatch = !t.client_id && (t.client_name === oldClient.name || t.clientName === oldClient.name);
        
        if (idMatch || nameMatch) {
          return {
            ...t,
            client_id: res.id, // Update to the new ID 
            client_name: res.name,
            clientName: res.name,
            client_phone: res.phone,
            clientPhone: res.phone,
            client_email: res.email || t.client_email,
            clientEmail: res.email || t.clientEmail
          };
        }
        return t;
      };

      return {
        clients: nextClients,
        tickets: state.tickets.map(updateTicket),
        sales: state.sales.map(updateTicket)
      };
    });
  },
  deleteClient: async (id: string) => {
    await dataAdapter.deleteClient(id);
    set(state => ({ clients: state.clients.filter(c => c.id !== id) }));
  }
});
