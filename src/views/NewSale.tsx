import { useState } from 'react';
import { useInventory, type InventoryItem } from '../context/InventoryContext';
import { useExpenses } from '../context/ExpenseContext';
import { ShoppingCart, Package, DollarSign, Search, Plus, Minus, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { useClients, type Client } from '../context/ClientContext';
import { useSales } from '../context/SalesContext';
import { useRef, useEffect } from 'react';

export const NewSale = () => {
    const { items, updateItem } = useInventory();
    const { addExpense } = useExpenses();
    const { clients } = useClients();
    const { addSale } = useSales();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<{item: InventoryItem, quantity: number, price: number}[]>([]);

    // --- Client Selection State ---
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    // --- Payment Method State ---
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

    const filteredClients = clientSearch.trim() === '' ? [] : clients.filter(c => 
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)
    );

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
        if (existing) {
            if (existing.quantity >= item.currentStock) {
                toast.error(`Solo hay ${item.currentStock} unidades disponibles en inventario.`);
                return;
            }
            setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            if (item.currentStock <= 0) {
                toast.error('Producto agotado');
                return;
            }
            setCart([...cart, { item, quantity: 1, price: 0 }]);
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.item.id === id) {
                const newQuantity = c.quantity + delta;
                if (newQuantity > c.item.currentStock) {
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
                if (newQuantity > c.item.currentStock) {
                    toast.error(`Stock máximo: ${c.item.currentStock}`);
                    return { ...c, quantity: c.item.currentStock };
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

    const handleCheckout = () => {
        if (cart.length === 0) return;

        // Verify prices
        for (const c of cart) {
            if (c.price <= 0) {
                toast.error(`Por favor, asigne un precio de venta para ${c.item.brand}`);
                return;
            }
        }

        // Restar inventario
        cart.forEach(c => {
            updateItem(c.item.id, { currentStock: c.item.currentStock - c.quantity });
        });

        // Registrar ingreso financiero
        addExpense({
            description: `Venta Directa: ${cart.map(c => `${c.quantity}x ${c.item.brand}`).join(', ')} ${selectedClient ? `(Cliente: ${selectedClient.name})` : '(Público General)'} - Pago: ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}`,
            amount: totalSale,
            date: new Date().toISOString(),
            type: 'income' // Ingreso
        });

        // Registrar en el historial de ventas si hay cliente
        addSale({
            clientName: selectedClient ? selectedClient.name : 'Público General',
            total: totalSale,
            paymentMethod: paymentMethod,
            items: cart.map(c => ({
                id: c.item.id,
                brand: c.item.brand,
                viscosity: c.item.viscosity,
                type: c.item.type,
                quantity: c.quantity,
                price: c.price
            }))
        });

        toast.success('¡Venta registrada con éxito!');
        setCart([]);
        handleClearClient();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in cursor-default">
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <ShoppingCart className="text-emerald-600" /> Nueva Venta Directa
                </h1>
                <p className="text-gray-500 text-sm">Punto de venta rápido para productos en inventario.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SELECTOR DE PRODUCTOS */}
                <div className="lg:col-span-2 space-y-4">
                    {/* BUSCADOR DE CLIENTES */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-30" ref={searchWrapperRef}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Cliente (Opcional)</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Publico General / Buscar cliente..." 
                                className={`w-full pl-10 pr-10 py-2 border rounded-lg text-sm outline-none transition-all ${selectedClient ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold' : 'border-gray-200 focus:border-emerald-500'}`}
                                value={clientSearch}
                                onChange={(e) => {
                                    setClientSearch(e.target.value);
                                    setShowSuggestions(true);
                                    setSelectedClient(null);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            {clientSearch && <button onClick={handleClearClient} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>}
                            
                            {showSuggestions && filteredClients.length > 0 && (
                                <div className="absolute w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                    {filteredClients.map(client => (
                                        <div key={client.id} onClick={() => handleSelectClient(client)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{client.name}</div>
                                                <div className="text-xs text-gray-500">{client.phone}</div>
                                            </div>
                                            <CheckCircle size={16} className="text-emerald-500 opacity-0 hover:opacity-100" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar producto en inventario..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 max-h-[600px]">
                            {filteredItems.filter(item => item.currentStock > 0).length === 0 ? (
                                <div className="col-span-full py-10 text-center text-gray-400 font-medium">
                                    No hay productos disponibles en el inventario.
                                </div>
                            ) : (
                                filteredItems.filter(item => item.currentStock > 0).map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => addToCart(item)}
                                        className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                            Stock: {item.currentStock}
                                        </div>
                                        
                                        <div className="w-16 h-16 rounded-md bg-gray-50 flex items-center justify-center border border-gray-100 mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                                            {item.image ? (
                                                <img src={item.image} alt={item.brand} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="text-gray-300" size={24} />
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{item.brand}</h3>
                                        <p className="text-xs text-gray-500">{item.viscosity} · {item.type}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* CARRITO Y COBRO */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full sticky top-6">
                        <div className="p-4 border-b border-gray-100 bg-emerald-50 rounded-t-xl">
                            <h2 className="font-bold text-emerald-900 flex items-center gap-2">
                                <DollarSign size={18} /> Resumen de Venta
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
                                        <div key={c.item.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{c.item.brand}</h4>
                                                    <p className="text-xs text-gray-500">{c.item.viscosity}</p>
                                                </div>
                                                <button onClick={() => removeFromCart(c.item.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">Quitar</button>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 justify-between mt-3">
                                                <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                                                    <button onClick={() => updateQuantity(c.item.id, -1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-slate-600"><Minus size={14} /></button>
                                                    <input 
                                                        type="number" 
                                                        className="w-12 text-center font-bold text-sm text-slate-800 outline-none border-x border-gray-200 py-1"
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
                                                        className="w-full border border-gray-200 rounded-md py-1 pl-5 pr-2 text-sm font-bold text-right outline-none focus:border-emerald-500 shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-lg text-xs font-bold border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-200 text-slate-600 hover:border-emerald-300'}`}>Efectivo</button>
                                    <button onClick={() => setPaymentMethod('card')} className={`py-2 rounded-lg text-xs font-bold border transition-all ${paymentMethod === 'card' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-200 text-slate-600 hover:border-emerald-300'}`}>Tarjeta</button>
                                    <button onClick={() => setPaymentMethod('transfer')} className={`py-2 rounded-lg text-xs font-bold border transition-all ${paymentMethod === 'transfer' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-200 text-slate-600 hover:border-emerald-300'}`}>Transf.</button>
                                </div>
                            </div>

                            <div className="pt-2">
                            <div className="flex justify-between items-center mb-4 text-slate-800">
                                <span className="font-bold text-lg">Total a Cobrar</span>
                                <span className="font-black text-2xl text-emerald-600">{formatCurrency(totalSale)}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={cart.length === 0 || totalSale <= 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} />
                                Confirmar y Cobrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};
