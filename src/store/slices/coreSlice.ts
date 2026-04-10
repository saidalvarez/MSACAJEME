import type { AppStateCreator } from '../storeTypes';
import { dataAdapter } from '../../services/dataAdapter';
import { io } from 'socket.io-client';
import { syncData } from '../../utils/sync';

export const createCoreSlice: AppStateCreator<Pick<import('../storeTypes').CoreSlice, keyof import('../storeTypes').CoreSlice>> = (set, get) => ({
  isLoading: false,
  error: null,

  loadAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [tickets, clients, inventory, expenses, sales, catalog] = (await Promise.all([
        dataAdapter.getTickets(),
        dataAdapter.getClients(),
        dataAdapter.getInventory(),
        dataAdapter.getExpenses(),
        dataAdapter.getSales(),
        dataAdapter.getCatalog()
      ])) as any[];
      
      set({
        tickets: tickets?.rows || tickets || [],
        clients: clients?.rows || clients || [],
        inventory: inventory?.rows || inventory || [],
        expenses: expenses?.rows || expenses || [],
        sales: sales?.rows || sales || [],
        catalog: catalog?.rows || catalog || [],
        isLoading: false
      });
    } catch (error: any) {
      console.error("Failed to load initial data:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  initWebSockets: () => {
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001');
    socket.on('ticket_updated', async () => {
      try {
        const tickets = await dataAdapter.getTickets() as any;
        set({ tickets: tickets.rows || tickets || [] });
      } catch(e) { console.error("Socket fetch fail", e) }
    });
  },

  syncOfflineData: async () => {
     try {
       await syncData();
     } catch (e) {
       console.error("General sync failed:", e);
     }

     const { pendingTickets } = get();
     if (pendingTickets.length === 0) return;
 
     console.log(`Attempting to sync ${pendingTickets.length} offline tickets...`);
     const remaining: any[] = [];
     
     for (const ticket of pendingTickets) {
       try {
         const ticketToSync = {
           ...ticket,
           client_name: ticket.client_name || ticket.clientName || 'Sin Nombre (Recuperado)',
           client_phone: String(ticket.client_phone || ticket.clientPhone || ''),
           client_email: String(ticket.client_email || ticket.clientEmail || ''),
           format_type: ticket.format_type || ticket.formatType || 'payment_info',
           ticket_number: Number(ticket.ticket_number || ticket.ticketNumber || 0),
           items: ticket.items?.map((item: any) => {
             const { id, ...rest } = item;
             return rest;
           }) || []
         };
         await dataAdapter.createTicket(ticketToSync, true);
         console.log(`Successfully synced ticket: ${ticket.id}`);
       } catch (err) {
         console.error(`Failed to sync ticket ${ticket.id}, keeping in queue.`);
         remaining.push(ticket);
       }
     }
 
     set({ pendingTickets: remaining });
     localStorage.setItem('msa_pending_tickets', JSON.stringify(remaining));
  }
});
