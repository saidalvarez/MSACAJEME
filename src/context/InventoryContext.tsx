import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface CatalogItem {
  id: string;
  brand: string;      
  viscosity: string;  
  type: string;       
  image?: string; 
  marketPrice?: number;
  wholesalePrice?: number;
}

export interface InventoryItem {
  id: string;
  brand: string;      // Marca
  viscosity: string;  // Viscosidad
  type: string;       // Tipo (Sintético, Mineral, etc.)
  date: string;       // Fecha
  initialStock: number; // Inicial
  currentStock: number; // Final (cantidad actual)
  purchaseNumber: string; // Número de compra
  image?: string; // Imagen en Base64
  marketPrice?: number;
  wholesalePrice?: number;
}

interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  removeItem: (id: string) => void;
  
  // --- Catálogo Base ---
  catalogItems: CatalogItem[];
  addCatalogItem: (item: Omit<CatalogItem, 'id'>) => void;
  removeCatalogItem: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('inventory');
    return saved ? JSON.parse(saved) : [];
  });

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('inventory_catalog');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('inventory', JSON.stringify(items));
      localStorage.setItem('inventory_catalog', JSON.stringify(catalogItems));
    } catch (error) {
      console.error("Error de almacenamiento (Posible límite excedido):", error);
      alert("Error Crítico: Límite de memoria alcanzado. No se pudieron guardar los cambios. Elimina fotos o items antiguos.");
    }
  }, [items, catalogItems]);

  const addItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem = { ...itemData, id: crypto.randomUUID() };
    setItems([newItem, ...items]);
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeItem = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto del inventario?')) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const addCatalogItem = (itemData: Omit<CatalogItem, 'id'>) => {
    const newItem = { ...itemData, id: crypto.randomUUID() };
    setCatalogItems([newItem, ...catalogItems]);
  };

  const removeCatalogItem = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto base del catálogo?')) {
      setCatalogItems(catalogItems.filter(i => i.id !== id));
    }
  };

  return (
    <InventoryContext.Provider value={{ 
        items, addItem, updateItem, removeItem,
        catalogItems, addCatalogItem, removeCatalogItem 
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory debe usarse dentro de InventoryProvider');
  return context;
};
