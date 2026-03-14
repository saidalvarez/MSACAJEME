import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface SaleItem {
  id: string;
  brand: string;
  viscosity: string;
  type: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  clientName: string;
  total: number;
  items: SaleItem[];
  paymentMethod: 'cash' | 'card' | 'transfer';
}

interface SalesContextType {
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id' | 'saleNumber' | 'date'>) => void;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesProvider = ({ children }: { children: ReactNode }) => {
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales));
  }, [sales]);

  const addSale = (saleData: Omit<Sale, 'id' | 'saleNumber' | 'date'>) => {
    const newSale: Sale = {
      ...saleData,
      id: crypto.randomUUID(),
      saleNumber: `V-${(sales.length + 1).toString().padStart(4, '0')}`,
      date: new Date().toISOString(),
    };
    setSales([newSale, ...sales]);
  };

  return (
    <SalesContext.Provider value={{ sales, addSale }}>
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) throw new Error('useSales debe usarse dentro de SalesProvider');
  return context;
};
