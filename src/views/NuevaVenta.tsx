import { useState, useRef, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, DollarSign, Search, Plus, Minus, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { useStore } from '../store/useStore';
import type { InventoryItem, Client } from '../types';

export const NuevaVenta = () => {
    const { inventory: items, clients, addSale } = useStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<{item: InventoryItem, quantity: number, price: number}[]>([]);

    // --- Client Selection State ---
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    // --- Payment Method State ---
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

    const filteredClients = useMemo(() => {
        const search = clientSearch.trim().toLowerCase();
        if (search.length < 2) return [];

        return clients
            .filter(c => {
                const name = c.name.toLowerCase();
                const phone = c.phone.toLowerCase();
                // Búsqueda más estricta: debe contener el término
                return name.includes(search) || phone.includes(search);
            })
            .sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                
                // Prioridad 1: Coincidencia EXACTA
                if (aName === search) return -1;
                if (bName === search) return 1;
                
                // Prioridad 2: Empieza con el término
                const aStarts = aName.startsWith(search);
                const bStarts = bName.startsWith(search);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                
                // Prioridad 3: Alfabético
                return aName.localeCompare(bName);
            })
            .slice(0, 5);
    }, [clientSearch, clients]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectClient = (client: Client) => {
        setClientSearch(client.name);
        setSelectedClient(client);
        setShowSuggestions(false);
    };

    const handleClearClient = () => {
        setClientSearch('');
        setSelectedClient(null);
    };

    const filteredItems = items.filter(item => 
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (item: InventoryItem) => {
        const existing = cart.find(c => c.item.id === item.id);
        const currentStock = item.current_stock ?? item.currentStock;
        if (existing) {
            if (existing.quantity >= currentStock) {
                toast.error(`Solo hay ${currentStock} unidades disponibles en inventario.`);
                return;
            }
            setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            if (currentStock <= 0) {
                toast.error('Producto agotado');
                return;
            }
            setCart([...cart, { item, quantity: 1, price: item.marketPrice || 0 }]);
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.item.id === id) {
                const newQuantity = c.quantity + delta;
                const currentStock = c.item.current_stock ?? c.item.currentStock;
                if (newQuantity > currentStock) {
                    toast.error('Stock insuficiente');
                    return c;
                }
                return newQuantity > 0 ? { ...c, quantity: newQuantity } : c;
            }
            return c;
        }));
    };

    const handleQuantityInput = (id: string, value: string) => {
        const newQuantity = parseInt(value) || 0;
        setCart(cart.map(c => {
            if (c.item.id === id) {
                const currentStock = c.item.current_stock ?? c.item.currentStock;
                if (newQuantity > currentStock) {
                    toast.error(`Stock máximo: ${currentStock}`);
                    return { ...c, quantity: currentStock };
                }
                return { ...c, quantity: newQuantity };
            }
            return c;
        }));
    };

    const updatePrice = (id: string, newPrice: number) => {
        setCart(cart.map(c => c.item.id === id ? { ...c, price: newPrice } : c));
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(c => c.item.id !== id));
    };

    const totalSale = cart.reduce((acc, c) => acc + (c.price * c.quantity), 0);
    const totalCost = cart.reduce((acc, c) => acc + ((c.item.purchasePrice || 0) * c.quantity), 0);
    const totalProfit = totalSale - totalCost;

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        // Verify prices
        for (const c of cart) {
            if (c.price <= 0) {
                toast.error(`Por favor, asigne un precio de venta para ${c.item.brand}`);
                return;
            }
        }

        // Registrar venta (ÚNICA fuente de verdad para ingresos e inventario)
        await addSale({
            client_id: selectedClient?.id,
            clientName: selectedClient ? selectedClient.name : 'Público General',
            total: totalSale,
            paymentMethod: paymentMethod,
            items: cart.map(c => ({
                id: c.item.id,
                brand: c.item.brand,
                viscosity: c.item.viscosity,
                type: c.item.type,
                quantity: c.quantity,
                price: c.price,
                purchase_price: c.item.purchasePrice || 0
            }))
        });

        toast.success('¡Venta registrada con éxito!');
        setCart([]);
        handleClearClient();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in cursor-default">
            <div className="mb-4">
                <h1 className="text-xl font-black flex items-center gap-2 text-slate-800 uppercase tracking-tight">
                    <ShoppingCart className="text-emerald-600" size={20} /> Punto de Venta
                </h1>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-1">Gestión de Mostrador • Inventario</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SELECTOR DE PRODUCTOS */}
                <div className="lg:col-span-2 space-y-4">
                    {/* BUSCADOR DE CLIENTES */}
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 relative z-30" ref={searchWrapperRef}>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Cliente (Opcional)</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Público General / Buscar..." 
                                className={`w-full pl-9 pr-9 py-1.5 border rounded-lg text-xs outline-none transition-all ${selectedClient ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold' : 'border-gray-200 focus:border-emerald-500'}`}
                                value={clientSearch}
                                onChange={(e) => {
                                    setClientSearch(e.target.value);
                                    setShowSuggestions(true);
                                    setSelectedClient(null);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            {clientSearch && <button onClick={handleClearClient} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>}
                            
                            {showSuggestions && filteredClients.length > 0 && (
                                <div className="absolute w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                    {filteredClients.map(client => (
                                        <div key={client.id} onClick={() => handleSelectClient(client)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm">{client.name}</div>
                                                <div className="text-xs text-gray-500">{client.phone}</div>
                                            </div>
                                            <CheckCircle size={16} className="text-emerald-500 opacity-0 hover:opacity-100" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar en inventario..." 
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold uppercase tracking-wider outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 max-h-[600px]">
                            {filteredItems.filter(item => (item.current_stock ?? item.currentStock) > 0).length === 0 ? (
                                <div className="col-span-full py-10 text-center text-gray-400 font-medium">
                                    No hay productos disponibles en el inventario.
                                </div>
                            ) : (
                                filteredItems.filter(item => (item.current_stock ?? item.currentStock) > 0).map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => addToCart(item)}
                                        className="bg-white border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded-bl-md border-b border-l border-emerald-100">
                                            {item.current_stock ?? item.currentStock}
                                        </div>
                                        
                                        <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 mb-2 overflow-hidden group-hover:scale-105 transition-transform">
                                            {item.image ? (
                                                <img src={item.image} alt={item.brand} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="text-slate-300" size={18} />
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-slate-800 text-[10px] uppercase tracking-tight line-clamp-1">{item.brand}</h3>
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">{item.category === 'Refaccion' ? item.type : `${item.viscosity} · ${item.type}`}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* CARRITO Y COBRO */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full sticky top-6">
                        <div className="p-3 border-b border-gray-100 bg-emerald-50/50 rounded-t-xl">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800 flex items-center gap-2">
                                <DollarSign size={14} /> Resumen de Venta
                            </h2>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[500px]">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <ShoppingCart size={40} className="mb-2 opacity-50" />
                                    <p className="text-sm font-medium">El carrito está vacío</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((c) => (
                                        <div key={c.item.id} className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800 text-[11px] uppercase tracking-tight">{c.item.brand}</h4>
                                                    <p className="text-[9px] font-semibold text-slate-400 uppercase">{c.item.category === 'Refaccion' ? c.item.type : c.item.viscosity}</p>
                                                </div>
                                                <button onClick={() => removeFromCart(c.item.id)} className="text-red-400 hover:text-red-500 text-[9px] font-bold uppercase tracking-widest">Remover</button>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 justify-between mt-3">
                                                <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                                                    <button onClick={() => updateQuantity(c.item.id, -1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-slate-600"><Minus size={14} /></button>
                                                    <input 
                                                        type="number" 
                                                        className="w-12 text-center font-semibold text-sm text-slate-800 outline-none border-x border-gray-200 py-1"
                                                        value={c.quantity}
                                                        onChange={(e) => handleQuantityInput(c.item.id, e.target.value)}
                                                    />
                                                    <button onClick={() => updateQuantity(c.item.id, 1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-slate-600"><Plus size={14} /></button>
                                                </div>
                                                
                                                <div className="relative w-24">
                                                    <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        value={c.price || ''}
                                                        onChange={(e) => updatePrice(c.item.id, parseFloat(e.target.value) || 0)}
                                                        placeholder="Precio"
                                                        className="w-full border border-gray-200 rounded-md py-1 pl-5 pr-2 text-sm font-semibold text-right outline-none focus:border-emerald-500 shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                                      <div className="p-3 border-t border-gray-100 bg-gray-50/80 rounded-b-xl space-y-3">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    <button onClick={() => setPaymentMethod('cash')} className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'}`}>Efectivo</button>
                                    <button onClick={() => setPaymentMethod('card')} className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${paymentMethod === 'card' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'}`}>Tarjeta</button>
                                    <button onClick={() => setPaymentMethod('transfer')} className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${paymentMethod === 'transfer' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'}`}>Transf.</button>
                                </div>
                            </div>
             </div>

                            <div className="pt-1">
                                <div className="flex justify-between items-center mb-1 text-slate-800 px-1">
                                    <span className="font-semibold text-xs uppercase tracking-tight text-slate-400">Total a Cobrar</span>
                                    <span className="font-bold text-xl text-emerald-600">{formatCurrency(totalSale)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-3 text-emerald-800 px-1 bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
                                    <span className="font-bold text-[9px] uppercase tracking-widest">Utilidad Proyectada</span>
                                    <span className="font-black text-sm">{formatCurrency(totalProfit)}</span>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0 || totalSale <= 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-[0.2em] py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} /> Finalizar Venta
                                </button>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};
