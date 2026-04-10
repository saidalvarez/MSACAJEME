import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Definición de la estructura de un Cliente
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  registrationDate: string;
  notes?: string;
}

interface ClientContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  removeClient: (id: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  // Cargar clientes guardados o iniciar con array vacío
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('clients');
    return saved ? JSON.parse(saved) : [];
  });

  // Guardar automáticamente en LocalStorage al haber cambios
  useEffect(() => {
    try {
      localStorage.setItem('clients', JSON.stringify(clients));
    } catch(e) {
      console.error("Error saving clients", e);
      alert("Error: Memoria llena. No se pudieron guardar los clientes.");
    }
  }, [clients]);

  const addClient = (clientData: Omit<Client, 'id'>) => {
    const newClient = { ...clientData, id: crypto.randomUUID() };
    setClients([newClient, ...clients]);
  };

  const removeClient = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  return (
    <ClientContext.Provider value={{ clients, addClient, removeClient }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error('useClients debe usarse dentro de ClientProvider');
  return context;
};
