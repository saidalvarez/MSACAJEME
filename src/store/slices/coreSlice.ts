import { io, Socket } from 'socket.io-client';
import { dataAdapter } from '../../services/dataAdapter';
import { syncData } from '../../utils/sync';
import type { AppStateCreator } from '../storeTypes';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace('/api', '');

export const createCoreSlice: AppStateCreator<import('../storeTypes').CoreSlice> = (set, get) => ({
  isLoading: false,
  isOnline: navigator.onLine,
  error: null,
  pendingTickets: JSON.parse(localStorage.getItem('msa_pending_tickets') || '[]'),
  socket: null as Socket | null,

  loadAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      // Parallel fetch for speed
      const [tickets, clients, inventory, catalog] = await Promise.all([
        dataAdapter.getTickets(20, 0),
        dataAdapter.getClients(),
        dataAdapter.getInventory(),
        dataAdapter.getCatalog()
      ]);

      // Nested stores also need to load their specific data
      await Promise.all([
        get().loadExpenses(),
        get().loadSales()
      ]);

      set({ 
        tickets: (tickets as any).rows || tickets || [],
        totalTickets: (tickets as any).count || 0,
        clients: (clients as any).rows || clients || [],
        inventory: (inventory as any).rows || inventory || [],
        catalog: (catalog as any).rows || catalog || []
      });
    } catch (e: any) {
      console.error("Error loading initial data:", e);
      set({ error: e.message || "Error al cargar datos" });
    } finally {
      set({ isLoading: false });
    }
  },

  initWebSockets: () => {
    const { socket } = get();
    if (socket) return;

    const newSocket = io(API_BASE, {
      transports: ['websocket'],
      autoConnect: true
    });

    set({ socket: newSocket });

    newSocket.on('ticket_updated', () => get().loadTickets(1));
    newSocket.on('inventory_updated', () => {
      dataAdapter.getInventory().then(res => {
         set({ inventory: (res as any).rows || res || [] });
      });
    });

    newSocket.on('connect', () => console.log('WebSocket Connected'));
  },

  removePendingTicket: (id: string) => {
    const { pendingTickets } = get();
    const next = pendingTickets.filter(t => t.id !== id);
    set({ pendingTickets: next });
    localStorage.setItem('msa_pending_tickets', JSON.stringify(next));
  },

  syncOfflineData: async () => {
     try {
       await syncData();
     } catch (e) {
       console.error("Sincronización general fallida:", e);
     }

     const { pendingTickets, loadTickets } = get();
     if (!pendingTickets || pendingTickets.length === 0) return;
 
     console.log(`[SYNC] Procesando ${pendingTickets.length} tickets pendientes...`);
     const remaining: any[] = [];
     let wasUpdated = false;
     
     // Current Arizona Time for fallback
     const nowArizona = new Date().toLocaleString('sv-SE', { timeZone: 'America/Phoenix' }).replace(' ', 'T');

     for (const ticket of pendingTickets) {
       try {
         // ROBUST MAPPING: Ensure data meets backend requirements (avoid 400 Bad Request)
         const ticketToSync = {
           ...ticket,
           client_name: ticket.client_name || ticket.clientName || 'Sin Nombre (Offline)',
           client_phone: String(ticket.client_phone || ticket.clientPhone || ''),
           client_email: String(ticket.client_email || ticket.clientEmail || ''),
           date: ticket.date || (ticket as any).Date || nowArizona,
           format_type: ticket.format_type || ticket.formatType || 'payment_info',
           items: Array.isArray(ticket.items) ? ticket.items.map((item: any) => {
             if (!item) return null;
             const { id, ...rest } = item;
             return {
               ...rest,
               name: item.name || item.brand || item.description || item.label || 'Producto/Servicio',
               price: Number(item.price || 0),
               quantity: Number(item.quantity || 1)
             };
           }).filter(Boolean) : []
         };

         await dataAdapter.createTicket(ticketToSync, true);
         wasUpdated = true;
       } catch (err: any) {
         const errorMessage = err?.message || String(err);
         
         // 1. Detect duplicates/already exists
         if (errorMessage.toLowerCase().includes('unique') || 
             errorMessage.toLowerCase().includes('already exists')) {
           console.log(`[SYNC] Ticket ${ticket.id} ya existe. Limpiando.`);
           wasUpdated = true;
           continue; 
         }

         // 2. Store specific error in the ticket object for UI feedback
         console.error(`[SYNC] Fallo crítico para ticket ${ticket.id}:`, errorMessage);
         remaining.push({ ...ticket, lastError: errorMessage });
       }
     }
 
     set({ pendingTickets: remaining });
     localStorage.setItem('msa_pending_tickets', JSON.stringify(remaining));
     
     if (wasUpdated) {
       await loadTickets(1);
     }
  }
});
