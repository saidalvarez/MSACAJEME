import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// --- DEFINICIONES DE TIPOS ---

export interface TicketItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string; // <--- AGREGADO: Para guardar la foto en base64
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  ticket_number?: number;
  date: string;
  clientName: string;
  clientPhone?: string; 
  clientEmail?: string;
  vehicle?: string;
  total: number;
  items: TicketItem[];
  status: 'pending' | 'completed' | 'cancelled';
  formatType?: 'basic' | 'payment_info' | 'payment_no_retention';
  notes?: string;
  discount?: number; // Percentaje
  envio?: number;
}

interface TicketContextType {
  tickets: Ticket[];
  // Modificamos addTicket para que devuelva el Ticket creado
  addTicket: (ticket: Omit<Ticket, 'id' | 'ticketNumber' | 'date'>) => Ticket; 
  updateTicketStatus: (id: string, status: 'pending' | 'completed' | 'cancelled') => void;
  editTicket: (id: string, updatedData: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  clearTickets: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

// --- PROVIDER ---

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  // Cargar de localStorage
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('tickets');
    return saved ? JSON.parse(saved) : [];
  });

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tickets', JSON.stringify(tickets));
    } catch(e) {
      console.error("Error saving tickets", e);
      alert("Error: Memoria llena. El ticket no se guardó permanentemente.");
    }
  }, [tickets]);

  // Función para crear ticket
  const addTicket = (newTicketData: Omit<Ticket, 'id' | 'ticketNumber' | 'date'>) => {
    const newTicket: Ticket = {
      ...newTicketData, // Aquí se copiará el clientPhone automáticamente
      id: crypto.randomUUID(),
      ticketNumber: tickets.length + 1,
      date: new Date().toISOString(),
    };

    // Agregamos al inicio del array
    setTickets([newTicket, ...tickets]);
    
    // IMPORTANTE: Devolvemos el ticket para que NewTicket.tsx pueda usarlo
    return newTicket;
  };

  const updateTicketStatus = (id: string, status: 'pending' | 'completed' | 'cancelled') => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status } : t));
  };

  const editTicket = (id: string, updatedData: Partial<Ticket>) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, ...updatedData } : t));
  };

  const deleteTicket = (id: string) => {
    setTickets(tickets.filter(t => t.id !== id));
  };

  const clearTickets = () => {
    setTickets([]);
  };

  return (
    <TicketContext.Provider value={{ tickets, addTicket, updateTicketStatus, editTicket, deleteTicket, clearTickets }}>
      {children}
    </TicketContext.Provider>
  );
};

// --- HOOK ---

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) throw new Error('useTickets debe usarse dentro de TicketProvider');
  return context;
};
