import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Search, PlusCircle, Trash2, Edit2, Save, X, Upload, Calendar, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { DangerModal } from '../components/DangerModal';
import { formatCurrency } from '../utils/format';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import type { InventoryItem, CatalogItem } from '../types';

export const Inventario = () => {
  const { 
    inventory: items, addInventoryItem: addItem, updateInventoryItem: updateItem, deleteInventoryItem: removeItem, 
    catalog: catalogItems, addCatalogItem, deleteCatalogItem: removeCatalogItem
  } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'refacciones' | 'catalog'>('inventory');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // States for adding
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    brand: '', viscosity: '', type: '',
    date: new Date().toISOString().split('T')[0],
    initialStock: 1, currentStock: 1, purchaseNumber: '',
    image: '', marketPrice: 0, purchasePrice: 0, category: 'Aceite', barcode: ''
  });

  const [showAddCatalogForm, setShowAddCatalogForm] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState<Omit<CatalogItem, 'id'>>({
    brand: '', viscosity: '', type: '', image: '', marketPrice: 0, category: 'Aceite', barcode: ''
  });

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [catalogItemToDelete, setCatalogItemToDelete] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InventoryItem>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filteredInventory = items.filter(item => 
    (!item.category || item.category === 'Aceite') &&
    ((item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.purchaseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRefacciones = items.filter(item => 
    item.category === 'Refaccion' &&
    ((item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.purchaseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayItems = activeTab === 'inventory' ? filteredInventory : filteredRefacciones;
  const totalPages = Math.ceil(displayItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = displayItems
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filteredCatalog = catalogItems.filter(item => 
    (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.viscosity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCatalogSelect = (id: string) => {
    setSelectedCatalogId(id);
    const catalogItem = catalogItems.find(c => c.id === id);
    if (catalogItem) {
        setNewItem({
            ...newItem,
            brand: catalogItem.brand,
            viscosity: catalogItem.viscosity,
            type: catalogItem.type,
            image: catalogItem.image || '',
            marketPrice: catalogItem.marketPrice || 0,
            barcode: catalogItem.barcode || ''
        });
    } else {
        setNewItem({ ...newItem, brand: '', viscosity: '', type: '', image: '', marketPrice: 0, barcode: '' });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.initialStock <= 0) {
      toast.error('El stock debe ser mayor a 0');
      return;
    }
    
    // Ensure numbers are properly casted before dispatch
    const payload = {
      ...newItem,
      initialStock: Number(newItem.initialStock),
      currentStock: Number(newItem.initialStock), // sync initial dynamically
      marketPrice: Number(newItem.marketPrice),
      purchasePrice: Number(newItem.purchasePrice)
    };

    try {
      await addItem(payload);
      toast.success('Lote registrado exitosamente');
      setNewItem({
        brand: '', viscosity: '', type: '',
        date: new Date().toISOString().split('T')[0],
        initialStock: 1, currentStock: 1, purchaseNumber: '',
        image: '', marketPrice: 0, purchasePrice: 0, category: activeTab === 'inventory' ? 'Aceite' : 'Refaccion', barcode: ''
      });
      setSelectedCatalogId('');
      setShowAddForm(false);
    } catch {
      toast.error('Hubo un error al registrar el lote');
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatalogItem.image) {
      toast.error('La foto es obligatoria para el catálogo maestro.');
      return;
    }
    await addCatalogItem({
      ...newCatalogItem,
      marketPrice: Number(newCatalogItem.marketPrice)
    });
    toast.success('Producto agregado al catálogo base');
    setNewCatalogItem({ brand: '', viscosity: '', type: '', image: '', marketPrice: 0, category: 'Aceite', barcode: '' });
    setShowAddCatalogForm(false);
  };

  const confirmDeleteInventory = async () => {
    if (itemToDelete) {
      try {
        await removeItem(itemToDelete);
        toast.success('Lote eliminado del inventario', { icon: '🗑️' });
      } catch {
        toast.error('Error al intentar eliminar refacción. Verifica que no esté en uso.');
      } finally {
        setItemToDelete(null);
      }
    }
  };

  const confirmDeleteCatalog = async () => {
    if (catalogItemToDelete) {
      await removeCatalogItem(catalogItemToDelete);
      toast.success('Producto eliminado del catálogo base', { icon: '🗑️' });
      setCatalogItemToDelete(null);
    }
  };

  const processImage = (file: File, callback: (compressedDataUrl: string) => void) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          callback(compressedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
  };

  const saveEdit = async () => {
    if (editingId) {
      const originalItem = items.find(i => i.id === editingId);
      if (!originalItem) return;
      
      const newCurrent = Number(editData.currentStock || 0);
      const oldCurrent = Number(originalItem.current_stock ?? originalItem.currentStock ?? 0);
      const stockDelta = newCurrent - oldCurrent;
      
      const oldInitial = Number(originalItem.initial_stock ?? originalItem.initialStock ?? 0);
      const newInitial = oldInitial + stockDelta;

      // Actualizar ambos valores para que `initial - current` mantenga la misma diferencia
      // Esto previene que las utilidades e ingresos "desaparezcan" o cambien bruscamente
      await updateItem(editingId, {
        currentStock: newCurrent,
        initialStock: Math.max(0, newInitial)
      });
      setEditingId(null);
      setEditData({});
      toast.success('Stock y lote actualizados (métricas financieras protegidas)');
    }
  };

  const metrics = useMemo(() => {
    let totalSoldUnits = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let inventoryValue = 0;
    let lowStockCount = 0;
    
    items.forEach(item => {
      const initial = item.initial_stock ?? item.initialStock ?? 0;
      const current = item.current_stock ?? item.currentStock ?? 0;
      const pPrice = item.purchasePrice || item.purchase_price || 0;
      const mPrice = item.marketPrice || item.market_price || 0;
      const minStock = item.min_stock ?? 5;

      inventoryValue += current * pPrice;
      if (current <= minStock && current > 0) lowStockCount++;
      
      if (initial > current) {
        const sold = initial - current;
        totalSoldUnits += sold;
        const revenue = sold * mPrice;
        const cost = sold * pPrice;
        totalRevenue += revenue;
        totalProfit += (revenue - cost);
      }
    });
    
    return { totalSoldUnits, totalRevenue, totalProfit, inventoryValue, lowStockCount };
  }, [items]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 font-sans relative pb-20">
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm border border-slate-200">
              <Package size={20} strokeWidth={2} />
            </div> 
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Inventario</h1>
              <p className="text-xs text-slate-500 font-medium tracking-tight uppercase tracking-widest">Almacén Central de Refacciones</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'inventory' 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Aceites
              </button>
              <button
                onClick={() => setActiveTab('refacciones')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'refacciones' 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Refacciones
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'catalog' 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Catálogo Base
              </button>
            </div>

            <button 
              onClick={() => {
                if (activeTab === 'inventory') {
                    setNewItem({...newItem, category: 'Aceite', type: '', viscosity: ''});
                    setShowAddForm(!showAddForm);
                    setShowAddCatalogForm(false);
                } else if (activeTab === 'refacciones') {
                    setNewItem({...newItem, category: 'Refaccion', viscosity: 'N/A', type: 'REFACCION'});
                    setShowAddForm(!showAddForm);
                    setShowAddCatalogForm(false);
                } else {
                    setNewCatalogItem({...newCatalogItem, category: 'Aceite'});
                    setShowAddCatalogForm(!showAddCatalogForm);
                    setShowAddForm(false);
                }
              }}
              className="h-10 px-4 bg-slate-900 border border-slate-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
              {(showAddForm || showAddCatalogForm) ? <X size={18} strokeWidth={2} /> : <PlusCircle size={18} strokeWidth={2} />}
              <span>{(showAddForm || showAddCatalogForm) ? 'Cancelar' : (activeTab === 'catalog' ? 'Crear Plantilla' : 'Añadir al Almacén')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ANALYTICS DASHBOARD */}
      {activeTab !== 'catalog' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
            <div className="relative z-10">
              <div className="flex items-center gap-1 mb-2">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Unidades Vendidas</p>
                 <InfoTooltip content="Número total de piezas despachadas históricamente contabilizando todos los lotes." />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{metrics.totalSoldUnits} <span className="text-sm text-slate-400 font-bold">pzs</span></h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
            <div className="relative z-10">
               <div className="flex items-center gap-1 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Retorno Histórico</p>
                  <InfoTooltip content="Dinero Bruto que ha ingresado a la caja por la venta de estas piezas antes de descontar costos." />
               </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(metrics.totalRevenue)}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm relative group bg-gradient-to-br from-white to-emerald-50">
            <div className="relative z-10">
              <div className="flex items-center gap-1 mb-2">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Utilidad Neta <TrendingUp size={10} className="inline ml-1" /></p>
                 <InfoTooltip content="Ganancia limpia. (Ingresos de Venta menos el costo orginal de las piezas facturadas al proveedor)." />
              </div>
              <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(metrics.totalProfit)}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
            <div className="relative z-10">
               <div className="flex items-center gap-1 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Costo Almacenado</p>
                  <InfoTooltip content="Suma del valor estático actual congelado en el almacén basado en su costo de proveedor original." />
               </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(metrics.inventoryValue)}</h3>
            </div>
          </div>
        </div>
      )}

      {/* LOW STOCK BANNER */}
      {activeTab !== 'catalog' && metrics.lowStockCount > 0 && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-500">
          <div className="w-10 h-10 bg-danger-100 rounded-full flex items-center justify-center text-danger-600 shrink-0 animate-pulse">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-danger-800">⚠️ {metrics.lowStockCount} producto{metrics.lowStockCount > 1 ? 's' : ''} con stock bajo</p>
            <p className="text-[10px] text-danger-600 font-medium uppercase tracking-wider">Acaban pronto, ve y resúrtelos.</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative group">
         <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
         <input 
            type="text" 
            placeholder={`Buscar en ${activeTab === 'catalog' ? 'el catálogo' : 'almacén (marca o lote)'}...`} 
            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/10 focus:bg-white transition-all placeholder:text-slate-400 uppercase tracking-wider"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {(activeTab === 'inventory' || activeTab === 'refacciones') && showAddForm && (
        <div className="bg-white p-8 rounded-xl border-2 border-primary-500 shadow-xl mb-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 text-xl font-black">
              <PlusCircle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">INGRESAR A ALMACÉN</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">Registra un nuevo lote de {activeTab === 'inventory' ? 'Aceite' : 'Refacción'}</p>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="space-y-6">
            <div className="bg-primary-50/50 p-6 rounded-xl border border-primary-100">
                <label className="text-xs font-black text-primary-700 uppercase tracking-widest block mb-3 flex items-center gap-2">
                    <Search size={16} strokeWidth={3}/> Rellenar automático desde Plantilla
                </label>
                <select 
                    className="w-full h-12 bg-white border border-primary-200 px-4 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 text-sm font-bold transition-all cursor-pointer uppercase tracking-wider shadow-sm text-primary-900" 
                    value={selectedCatalogId} 
                    onChange={e => handleCatalogSelect(e.target.value)}
                >
                    <option value="">-- Escribir Todo Manualmente --</option>
                    {catalogItems.map(c => (
                        <option key={c.id} value={c.id}>{c.brand} - {c.viscosity} ({c.type})</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Marca / Fabricante</label>
                <input type="text" required placeholder="CASTROL, LTH..." className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newItem.brand} onChange={e => setNewItem({...newItem, brand: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo / Categoría</label>
                <input type="text" required placeholder={activeTab === 'refacciones' ? "BALATAS, BATERÍA" : "SINTÉTICO"} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Especificación (Ej. 5W-30 o N/A)</label>
                <input type="text" placeholder="5W-30" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newItem.viscosity} disabled={activeTab === 'refacciones' && newItem.viscosity === 'N/A'} onChange={e => setNewItem({...newItem, viscosity: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-primary-600">Stock Inicial (Piezas)</label>
                <input type="number" required min="1" className="w-full h-12 bg-primary-50 border-2 border-primary-200 text-primary-800 rounded-xl px-4 text-xl font-black outline-none text-center" value={newItem.initialStock || ''} onChange={e => setNewItem({...newItem, initialStock: parseInt(e.target.value)})} />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">No. Factura (Opcional)</label>
                <input type="text" placeholder="F-1234" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase tracking-widest" value={newItem.purchaseNumber} onChange={e => setNewItem({...newItem, purchaseNumber: e.target.value})} />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2"># Código de Barras (Opcional)</label>
                <div className="relative">
                  <input type="text" placeholder="Escanea o escribe" className="w-full h-12 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-xl px-4 text-sm font-black outline-none tracking-widest uppercase" value={newItem.barcode || ''} onChange={e => setNewItem({...newItem, barcode: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Foto / Visual</label>
                <div className="relative group/photo h-12">
                  <input type="file" accept="image/*" onChange={(e) => {
                    if(e.target.files?.[0]) processImage(e.target.files[0], (d) => setNewItem({...newItem, image: d}))
                  }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="h-full bg-white border border-slate-200 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors hover:border-primary-500 shadow-sm">
                    <Upload size={18} className="text-slate-400" />
                    <span className="text-xs font-black text-slate-500 uppercase">Subir Foto</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 grid grid-cols-2 gap-6 bg-slate-100 p-6 rounded-xl border border-slate-200">
                 <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">¿Cuánto costó en Total? (Tu Costo)</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                     <input type="number" min="0" step="0.01" className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-lg font-bold outline-none" value={newItem.purchasePrice || ''} onChange={e => setNewItem({...newItem, purchasePrice: parseFloat(e.target.value)})} />
                   </div>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Precio de Venta (Público)</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                     <input type="number" required min="0" step="0.01" className="w-full h-12 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl pl-10 pr-4 text-xl font-black outline-none" value={newItem.marketPrice || ''} onChange={e => setNewItem({...newItem, marketPrice: parseFloat(e.target.value)})} />
                   </div>
                 </div>
              </div>
            </div>

            <button type="submit" className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex justify-center items-center gap-3">
              <Save size={24} /> Guardar al Almacén
            </button>
          </form>
        </div>
      )}

      {/* CATALOG MASTER FORM */}
      {activeTab === 'catalog' && showAddCatalogForm && (
        <div className="bg-white p-8 rounded-xl border-2 border-primary-500 shadow-xl mb-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 text-xl font-black">
              <PlusCircle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">NUEVA PLANTILLA BASE</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">Agrega un modelo para agilizar tu almacén</p>
            </div>
          </div>

          <form onSubmit={handleAddCatalogItem} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Marca / Fabricante</label>
                <input type="text" required placeholder="CASTROL, LTH..." className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newCatalogItem.brand} onChange={e => setNewCatalogItem({...newCatalogItem, brand: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo / Categoría</label>
                <input type="text" required placeholder="SINTÉTICO, BALATAS" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newCatalogItem.type} onChange={e => setNewCatalogItem({...newCatalogItem, type: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Especificación (Ej. 5W-30)</label>
                <input type="text" placeholder="5W-30" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newCatalogItem.viscosity} onChange={e => setNewCatalogItem({...newCatalogItem, viscosity: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Grupo del Sistema</label>
                <select className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none uppercase" value={newCatalogItem.category || 'Aceite'} onChange={e => setNewCatalogItem({...newCatalogItem, category: e.target.value})}>
                  <option value="Aceite">ALMACÉN DE ACEITES</option>
                  <option value="Refaccion">REFACCIONES GENERALES</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">FOTO DE CATÁLOGO (OBLIGATORIO)</label>
                <div className="relative group/photo h-12">
                  <input type="file" required accept="image/*" onChange={(e) => {
                    if(e.target.files?.[0]) processImage(e.target.files[0], (d) => setNewCatalogItem({...newCatalogItem, image: d}))
                  }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`h-full bg-white border ${newCatalogItem.image ? 'border-primary-500 bg-primary-50' : 'border-slate-200'} px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm`}>
                    <Upload size={18} className={newCatalogItem.image ? "text-primary-500" : "text-slate-400"} />
                    <span className={`text-xs font-black uppercase ${newCatalogItem.image ? "text-primary-700" : "text-slate-500"}`}>{newCatalogItem.image ? '¡Foto Cargada!' : 'Subir Foto'}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Precio Sugerido (Venta)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                  <input type="number" required min="0" step="0.01" className="w-full h-12 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl pl-10 pr-4 text-xl font-black outline-none" value={newCatalogItem.marketPrice || ''} onChange={e => setNewCatalogItem({...newCatalogItem, marketPrice: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2"># Código de Barras Global</label>
                <div className="relative">
                  <input type="text" placeholder="Escanear con pistola" className="w-full h-12 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-xl px-4 text-sm font-black outline-none tracking-widest uppercase" value={newCatalogItem.barcode || ''} onChange={e => setNewCatalogItem({...newCatalogItem, barcode: e.target.value})} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full h-16 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex justify-center items-center gap-3">
              <Save size={24} /> Registrar en Catálogo Maestro
            </button>
          </form>
        </div>
      )}

      {/* ITEMS LIST (PAGINATED) */}
      {(activeTab === 'inventory' || activeTab === 'refacciones') ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedItems.length === 0 ? (
              <div className="col-span-full bg-white p-20 rounded-2xl border border-dashed border-slate-300 text-center">
                <Package size={48} className="mx-auto text-slate-200 mb-6" />
                <h3 className="text-xl font-black text-slate-900 uppercase">Sin resultados</h3>
              </div>
            ) : (
              paginatedItems.map(item => {
                const current = item.current_stock ?? item.currentStock ?? 0;
                const min = item.min_stock ?? 5;
                const isOut = current <= 0;
                const isLow = current <= min && !isOut;
                const isEditing = editingId === item.id;

                return (
                  <div key={item.id} className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden relative group transition-all ${isOut ? 'border-danger-200 opacity-75' : isLow ? 'border-warning-300' : 'border-slate-200 hover:shadow-xl'}`}>
                    
                    {/* Visual Status Header */}
                    <div className={`h-1.5 w-full ${isOut ? 'bg-danger-500' : isLow ? 'bg-warning-400' : 'bg-success-500'}`} />

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div 
                             className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden relative cursor-zoom-in"
                             onClick={() => setPreviewImage(item.image || null)}
                           >
                             {item.image ? (
                               <img loading="lazy" src={item.image} alt={item.brand} className="w-full h-full object-contain p-1" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-slate-300"/></div>
                             )}
                           </div>
                           <div>
                             <h3 className="font-black text-slate-900 text-lg uppercase leading-tight line-clamp-1">{item.brand}</h3>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.type} {item.viscosity && `• ${item.viscosity}`}</p>
                             <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                               <Calendar size={10} /> {new Date(item.date).toLocaleDateString('es-MX')}
                             </div>
                           </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm whitespace-nowrap">
                              {formatCurrency(item.marketPrice || item.market_price || 0)}
                            </span>
                            {item.purchaseNumber && (
                              <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">#{item.purchaseNumber}</span>
                            )}
                         </div>
                      </div>

                      {/* Stock Info */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-auto">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Stock Físico</span>
                           {isEditing ? (
                             <div className="flex gap-2">
                               <input type="number" autoFocus className="w-16 h-8 text-center bg-white border-2 border-primary-500 rounded font-black outline-none" value={editData.currentStock} onChange={e => setEditData({currentStock: parseInt(e.target.value)||0})} />
                               <button onClick={saveEdit} className="px-3 bg-primary-600 text-white rounded text-[10px] font-black uppercase"><Save size={12}/> OK</button>
                             </div>
                           ) : (
                             <div className="flex gap-2 items-center">
                               {isOut ? (
                                 <span className="text-xs font-black text-white bg-danger-500 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">AGOTADO</span>
                               ) : (
                                  <span className={`text-xl font-black ${isLow ? 'text-warning-600' : 'text-slate-900'}`}>{current}</span>
                               )}
                               <button onClick={() => { setEditingId(item.id); setEditData({currentStock: current}); }} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-primary-600 hover:border-primary-200 rounded transition-all">
                                 <Edit2 size={10} />
                               </button>
                             </div>
                           )}
                         </div>
                      </div>
                    </div>

                    {/* Delete Action (Hover) */}
                    <button 
                      onClick={() => setItemToDelete(item.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-white border border-danger-200 text-danger-500 hover:bg-danger-50 hover:text-danger-600 p-2 rounded-lg transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-sm mx-auto">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
             {filteredCatalog.map(item => (
                <div key={item.id} className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden group">
                  
                  {/* Imagen del Catálogo */}
                  <div 
                    className="w-full h-40 bg-slate-50 relative cursor-zoom-in border-b border-slate-100 flex items-center justify-center overflow-hidden"
                    onClick={() => setPreviewImage(item.image || null)}
                  >
                    {item.image ? (
                      <img loading="lazy" src={item.image} alt={item.brand} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Package size={40} className="text-slate-200" />
                    )}
                    <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg">
                       {item.category === 'Refaccion' ? 'REFACCIÓN' : 'ACEITE'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-black text-slate-900 text-lg uppercase leading-tight line-clamp-2 mb-1">{item.brand}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{item.type} {item.viscosity && `• ${item.viscosity}`}</p>
                    {item.barcode && <p className="text-[9px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded w-max mb-2 uppercase flex items-center gap-1">#{item.barcode}</p>}

                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-end mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio Sugerido</span>
                        <span className="text-base font-black text-emerald-600">{formatCurrency(item.marketPrice || item.market_price || 0)}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setActiveTab('inventory');
                            handleCatalogSelect(item.id.toString());
                            setShowAddForm(true);
                          }}
                          className="flex-1 bg-primary-600 hover:bg-primary-500 text-white p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                        >
                          <PlusCircle size={14} /> Usar Plantilla
                        </button>
                        <button 
                          onClick={() => setCatalogItemToDelete(item.id)} 
                          className="w-10 h-10 flex items-center justify-center bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-xl transition-colors shrink-0"
                          title="Eliminar del catálogo"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
             ))}
             {filteredCatalog.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                   <Package size={48} className="mb-4 opacity-50" />
                   <p className="font-bold text-lg">Tu catálogo base está vacío.</p>
                   <p className="text-sm">Comienza a agregar plantillas maestras para agilizar la entrada de lotes.</p>
                </div>
             )}
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN DE IMAGEN */}
      {previewImage && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
           <div className="fixed inset-0 bg-slate-900/90" onClick={() => setPreviewImage(null)} />
          <div className="relative w-full h-full flex flex-col items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute top-0 right-0 md:-top-6 md:-right-6 bg-slate-800 text-white p-3 rounded-full shadow-xl">
              <X size={24} />
            </button>
            <img src={previewImage} alt="Ficha Técnica" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>,
        document.body
      )}

      {/* Danger Modals */}
      <DangerModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDeleteInventory}
        title="Eliminar Lote"
        message="¿Estás completamente seguro de borrar este lote de inventario? Perderás su registro irreversiblemente."
      />
      <DangerModal
        isOpen={!!catalogItemToDelete}
        onClose={() => setCatalogItemToDelete(null)}
        onConfirm={confirmDeleteCatalog}
        title="Eliminar Producto Base"
        message="¿Estás completamente seguro de borrar este producto del catálogo base?"
      />
    </div>
  );
};
