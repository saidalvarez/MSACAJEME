import { useState } from 'react';
import { Package, Search, PlusCircle, Trash2, Edit2, Save, X, Image as ImageIcon, Eye, DollarSign, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory, type InventoryItem, type CatalogItem } from '../context/InventoryContext';
import { useExpenses } from '../context/ExpenseContext';
import { DangerModal } from '../components/DangerModal';
import { formatCurrency } from '../utils/format';

export const Inventory = () => {
  const { 
    items, addItem, updateItem, removeItem,
    catalogItems, addCatalogItem, removeCatalogItem 
  } = useInventory();
  const { addExpense } = useExpenses();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab System
  const [activeTab, setActiveTab] = useState<'inventory' | 'catalog'>('inventory');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // States for adding a new inventory item
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    brand: '',
    viscosity: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    initialStock: 0,
    currentStock: 0,
    purchaseNumber: '',
    image: '',
    marketPrice: 0,
    wholesalePrice: 0
  });

  // State for adding a new catalog item
  const [showAddCatalogForm, setShowAddCatalogForm] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState<Omit<CatalogItem, 'id'>>({
    brand: '',
    viscosity: '',
    type: '',
    image: '',
    marketPrice: 0,
    wholesalePrice: 0
  });

  // State for Deletions
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [catalogItemToDelete, setCatalogItemToDelete] = useState<string | null>(null);

  // State for editing an item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InventoryItem>>({});

  // State for Selling an item
  const [saleModal, setSaleModal] = useState<{isOpen: boolean, item: InventoryItem | null, quantity: number, price: number}>({
    isOpen: false,
    item: null,
    quantity: 1,
    price: 0
  });

  const handleSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (saleModal.item && saleModal.quantity > 0 && saleModal.price >= 0) {
      if (saleModal.quantity > saleModal.item.currentStock) {
        alert("No hay suficiente stock para esta venta.");
        return;
      }
      
      // Update inventory string
      updateItem(saleModal.item.id, { currentStock: saleModal.item.currentStock - saleModal.quantity });
      
      // Register income
      addExpense({
        description: `Venta de aceite: ${saleModal.item.brand} ${saleModal.item.viscosity}`,
        amount: saleModal.quantity * saleModal.price,
        date: new Date().toISOString(),
        type: 'income'
      });
      
      setSaleModal({ isOpen: false, item: null, quantity: 1, price: 0 });
    }
  };

  const filteredItems = items.filter(item => 
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCatalog = catalogItems.filter(item => 
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.viscosity.toLowerCase().includes(searchTerm.toLowerCase())
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
            wholesalePrice: catalogItem.wholesalePrice || 0
        });
    } else {
        setNewItem({
            ...newItem,
            brand: '', viscosity: '', type: '', image: ''
        });
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newItem);
    toast.success('Lote registrado exitosamente');
    setNewItem({
      brand: '',
      viscosity: '',
      type: '',
      date: new Date().toISOString().split('T')[0],
      initialStock: 0,
      currentStock: 0,
      purchaseNumber: '',
      image: '',
      marketPrice: 0,
      wholesalePrice: 0
    });
    setSelectedCatalogId('');
    setShowAddForm(false);
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatalogItem.image) {
      toast.error('La foto es obligatoria para el catálogo maestro.');
      return;
    }
    addCatalogItem(newCatalogItem);
    toast.success('Producto agregado al catálogo base');
    setNewCatalogItem({ brand: '', viscosity: '', type: '', image: '', marketPrice: 0, wholesalePrice: 0 });
    setShowAddCatalogForm(false);
  };

  const confirmDeleteInventory = () => {
    if (itemToDelete) {
      removeItem(itemToDelete);
      toast.success('Lote eliminado del inventario', { icon: '🗑️' });
      setItemToDelete(null);
    }
  };

  const confirmDeleteCatalog = () => {
    if (catalogItemToDelete) {
      removeCatalogItem(catalogItemToDelete);
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
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

  const handleImageUploadInventory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file, (data) => setNewItem({ ...newItem, image: data }));
  };

  const handleImageUploadCatalog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file, (data) => setNewCatalogItem({ ...newCatalogItem, image: data }));
  };

  const startEditing = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditData(item);
  };

  const saveEdit = () => {
    if (editingId) {
      updateItem(editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in cursor-default">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Package className="text-blue-600" /> Información de Venta
          </h1>
          <p className="text-gray-500 text-sm">Registro y catálogo de productos para venta directa</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm shrink-0">
            <button 
              onClick={() => setActiveTab('inventory')} 
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Lotes e Inventario
            </button>
            <button 
              onClick={() => setActiveTab('catalog')} 
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'catalog' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Catálogo Base
            </button>
          </div>
        
          <button 
            onClick={() => activeTab === 'inventory' ? setShowAddForm(!showAddForm) : setShowAddCatalogForm(!showAddCatalogForm)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors shadow-sm shrink-0"
          >
            {(activeTab === 'inventory' ? showAddForm : showAddCatalogForm) ? <X size={18} /> : <PlusCircle size={18} />}
            <span>{(activeTab === 'inventory' ? showAddForm : showAddCatalogForm) ? 'Cancelar' : (activeTab === 'inventory' ? 'Nuevo Lote' : 'Crear Producto')}</span>
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bajo Stock</p>
            <p className="text-2xl font-black text-slate-900">{items.filter(i => i.currentStock <= 5).length} <span className="text-sm font-medium text-gray-400">productos</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Productos Totales</p>
            <p className="text-2xl font-black text-slate-900">{items.reduce((acc, i) => acc + i.currentStock, 0)} <span className="text-sm font-medium text-gray-400">unidades</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Valor Inventario (Mercado)</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(items.reduce((acc, i) => acc + (i.currentStock * (i.marketPrice || 0)), 0))}</p>
          </div>
        </div>
      </div>

      {activeTab === 'inventory' && showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 animate-in slide-in-from-top-2">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><PlusCircle className="text-blue-600" size={20}/> Registrar Nuevo Lote</h2>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="md:col-span-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                <label className="block text-sm text-slate-700 mb-2 font-bold flex items-center gap-2">
                    <Search size={16}/> SELECCIONAR DEL CATÁLOGO (Recomendado)
                </label>
                <select 
                    className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-blue-500 text-sm bg-white font-medium" 
                    value={selectedCatalogId} 
                    onChange={e => handleCatalogSelect(e.target.value)}
                >
                    <option value="">-- Llenado Manual --</option>
                    {catalogItems.map(c => (
                        <option key={c.id} value={c.id}>{c.brand} - {c.viscosity} ({c.type})</option>
                    ))}
                </select>
                {selectedCatalogId === '' && <p className="text-xs text-gray-500 mt-2">* Si no encuentras el producto, escríbelo en los campos de abajo o agrégalo primero en la pestaña "Catálogo Base".</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">FECHA</label>
              <input type="date" required className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">NO. COMPRA</label>
              <input type="text" required placeholder="Ej. FAC-1029" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.purchaseNumber} onChange={e => setNewItem({...newItem, purchaseNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">MARCA</label>
              <input type="text" required placeholder="Ej. Castrol" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.brand} onChange={e => setNewItem({...newItem, brand: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">VISCOSIDAD</label>
              <input type="text" required placeholder="Ej. 10W-30" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.viscosity} onChange={e => setNewItem({...newItem, viscosity: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">TIPO</label>
              <input type="text" required placeholder="Ej. Sintético" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">CANT. INICIAL</label>
              <input type="number" required min="1" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.initialStock || ''} onChange={e => setNewItem({...newItem, initialStock: parseInt(e.target.value), currentStock: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">PRECIO MERCADO</label>
              <input type="number" required min="0" step="0.01" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.marketPrice || ''} onChange={e => setNewItem({...newItem, marketPrice: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">PRECIO MAYOREO</label>
              <input type="number" min="0" step="0.01" className="w-full border p-2 rounded outline-none focus:border-slate-800 text-sm" value={newItem.wholesalePrice || ''} onChange={e => setNewItem({...newItem, wholesalePrice: parseFloat(e.target.value)})} />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1 font-bold flex items-center gap-1"><ImageIcon size={14}/> FOTO DEL PRODUCTO (Opcional si viene del catálogo)</label>
              <input type="file" accept="image/*" onChange={handleImageUploadInventory} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
                <Save size={18} /> Guardar Lote
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'catalog' && showAddCatalogForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 border-l-4 mb-6 animate-in slide-in-from-top-2">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><PlusCircle className="text-emerald-600" size={20}/> Crear Producto Base</h2>
          <form onSubmit={handleAddCatalogItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">MARCA</label>
              <input type="text" required placeholder="Ej. Mobil 1" className="w-full border p-2 rounded outline-none focus:border-emerald-500 text-sm bg-gray-50" value={newCatalogItem.brand} onChange={e => setNewCatalogItem({...newCatalogItem, brand: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">VISCOSIDAD</label>
              <input type="text" required placeholder="Ej. 15W-40" className="w-full border p-2 rounded outline-none focus:border-emerald-500 text-sm bg-gray-50" value={newCatalogItem.viscosity} onChange={e => setNewCatalogItem({...newCatalogItem, viscosity: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">TIPO</label>
              <input type="text" required placeholder="Ej. Multigrado" className="w-full border p-2 rounded outline-none focus:border-emerald-500 text-sm bg-gray-50" value={newCatalogItem.type} onChange={e => setNewCatalogItem({...newCatalogItem, type: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">PRECIO MERCADO (EST.)</label>
              <input type="number" min="0" step="0.01" className="w-full border p-2 rounded outline-none focus:border-emerald-500 text-sm bg-gray-50" value={newCatalogItem.marketPrice || ''} onChange={e => setNewCatalogItem({...newCatalogItem, marketPrice: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-bold">PRECIO MAYOREO (EST.)</label>
              <input type="number" min="0" step="0.01" className="w-full border p-2 rounded outline-none focus:border-emerald-500 text-sm bg-gray-50" value={newCatalogItem.wholesalePrice || ''} onChange={e => setNewCatalogItem({...newCatalogItem, wholesalePrice: parseFloat(e.target.value)})} />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1 font-bold flex items-center gap-1"><ImageIcon size={14}/> FOTO PREDETERMINADA</label>
              <input type="file" required accept="image/*" onChange={handleImageUploadCatalog} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
                <Save size={18} /> Guardar al Catálogo
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative">
         <Search className="absolute left-7 top-7 text-gray-400" size={18} />
         <input 
            type="text" 
            placeholder={`Buscar por marca${activeTab === 'inventory' ? ' o no. de compra' : ''}...`} 
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 outline-none transition-all ${activeTab === 'inventory' ? 'focus:ring-blue-100' : 'focus:ring-emerald-100'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {activeTab === 'inventory' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-bold">Fecha / Compra</th>
                  <th className="p-4 font-bold">Detalle Producto</th>
                   <th className="p-4 font-bold text-center">Stock e Historial</th>
                  <th className="p-4 font-bold text-center">Precios (M / May)</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">No se encontraron registros de inventario.</td>
                </tr>
              ) : (
                filteredItems.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => {
                  const sold = item.initialStock - item.currentStock;
                  const isEditing = editingId === item.id;

                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 relative transition-colors ${item.currentStock <= 0 ? 'bg-red-50/20' : ''}`}>
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-800">{item.purchaseNumber}</div>
                        <div className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 relative">
                        <div className={`flex flex-col md:flex-row items-center md:items-start gap-4 ${item.currentStock <= 0 ? 'opacity-60 grayscale' : ''}`}>
                            {item.image ? (
                               <div 
                                 className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden shadow-sm relative group cursor-pointer"
                                 onClick={() => setPreviewImage(item.image!)}
                               >
                                  <img src={item.image} alt={item.brand} className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                    <Eye className="text-white drop-shadow-md" size={24} />
                                  </div>
                               </div>
                            ) : (
                               <div className="w-24 h-24 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 border border-slate-200 shadow-sm">
                                  <Package size={40} />
                               </div>
                            )}
                            <div className="text-center md:text-left pt-2">
                              <div className="text-base font-black text-slate-800">{item.brand}</div>
                              <div className="text-sm text-blue-600 font-bold mt-1">{item.viscosity} <span className="text-slate-500 font-medium">· {item.type}</span></div>
                            </div>
                        </div>
                        {item.currentStock <= 0 && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-red-700 bg-red-50/95 backdrop-blur-md px-3 py-1 border border-red-200 rounded-full shadow-sm z-10 w-max text-xs tracking-wide">
                            SIN STOCK
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-slate-400">Inicial: {item.initialStock}</span>
                            {isEditing ? (
                              <input 
                                type="number" 
                                className="w-20 border border-blue-300 rounded p-1 text-center font-bold text-blue-700 outline-none focus:ring-2 my-1"
                                value={editData.currentStock}
                                onChange={(e) => setEditData({...editData, currentStock: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`inline-block px-2 py-1 rounded-md font-bold text-lg my-1 ${item.currentStock <= 5 ? 'bg-red-100 text-red-700 font-black animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                                {item.currentStock}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Vendidos: {sold}</span>
                        </div>
                      </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(item.marketPrice || 0)}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">May: {formatCurrency(item.wholesalePrice || 0)}</span>
                    </div>
                  </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded" title="Guardar cambios"><Save size={16} /></button>
                              <button onClick={cancelEdit} className="text-gray-400 hover:bg-gray-100 p-2 rounded" title="Cancelar"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditing(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded" title="Ajustar Stock Actual"><Edit2 size={16} /></button>
                              <button onClick={() => setItemToDelete(item.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded" title="Eliminar Lote"><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50 text-emerald-800 text-xs uppercase tracking-wider border-b border-emerald-100">
                  <th className="p-4 font-bold">Foto</th>
                  <th className="p-4 font-bold">Marca</th>
                  <th className="p-4 font-bold">Viscosidad</th>
                   <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold">Precios Sugeridos</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-medium border border-dashed border-emerald-100 m-4 rounded hover:bg-emerald-50 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <Package size={32} className="text-emerald-200" />
                        <div>No hay productos en el catálogo.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map(item => (
                    <tr key={item.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="p-4 w-32">
                        {item.image ? (
                           <div 
                             className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden shadow-sm relative group cursor-pointer"
                             onClick={() => setPreviewImage(item.image!)}
                           >
                              <img src={item.image} alt={item.brand} className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                <Eye className="text-white drop-shadow-md" size={24} />
                              </div>
                           </div>
                        ) : (
                           <div className="w-24 h-24 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 border border-slate-200 shadow-sm">
                              <ImageIcon size={40} />
                           </div>
                        )}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-800">{item.brand}</td>
                      <td className="p-4 text-sm font-bold text-emerald-700">{item.viscosity}</td>
                       <td className="p-4 text-sm font-medium text-slate-600">{item.type}</td>
                      <td className="p-4">
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-emerald-700">M: {formatCurrency(item.marketPrice || 0)}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">May: {formatCurrency(item.wholesalePrice || 0)}</span>
                         </div>
                      </td>
                      <td className="p-4 text-right">
                         <button onClick={() => setCatalogItemToDelete(item.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded" title="Eliminar del catálogo"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Ventas */}
      {saleModal.isOpen && saleModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Registrar Venta</h2>
            <p className="text-sm text-gray-500 mb-6">Vendiendo: {saleModal.item?.brand} {saleModal.item?.viscosity}</p>

            <form onSubmit={handleSale} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">CANTIDAD A VENDER (Stock: {saleModal.item?.currentStock})</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  max={saleModal.item?.currentStock}
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-slate-800"
                  value={saleModal.quantity}
                  onChange={e => setSaleModal({...saleModal, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">PRECIO DE VENTA (UNIDAD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-lg p-2.5 pl-8 outline-none focus:border-slate-800"
                    value={saleModal.price || ''}
                    onChange={e => setSaleModal({...saleModal, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg text-emerald-800 font-medium text-sm text-center mb-4 border border-emerald-100">
                Total Ingresos: ${(saleModal.quantity * saleModal.price).toFixed(2)}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setSaleModal({...saleModal, isOpen: false})} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors">
                  Confirmar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN DE IMAGEN */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center pt-10 pb-4">
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-red-500 hover:scale-110 text-white p-3 rounded-full transition-all border border-white/20 hover:border-red-500 z-10"
              title="Cerrar (O haz clic afuera)"
            >
              <X size={24} />
            </button>
            <div className="relative w-full h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img 
                src={previewImage} 
                alt="Vista previa" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl ring-1 ring-white/20 mx-auto"
                style={{ filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.5))' }}
              />
            </div>
            <p className="text-white/70 mt-4 text-sm font-medium">Haz clic en cualquier lugar fuera de la imagen para cerrar</p>
          </div>
        </div>
      )}

      {/* Danger Modals */}
      <DangerModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDeleteInventory}
        title="Eliminar Lote"
        message="¿Estás completamente seguro de borrar este lote de inventario? Perderás su registro y stock actual irreversiblemente."
      />

      <DangerModal
        isOpen={!!catalogItemToDelete}
        onClose={() => setCatalogItemToDelete(null)}
        onConfirm={confirmDeleteCatalog}
        title="Eliminar Producto Base"
        message="¿Estás completamente seguro de borrar este producto del catálogo base? No afectará lotes ya creados, pero no podrás usarlo como plantilla nuevamente."
      />

    </div>
  );
};
