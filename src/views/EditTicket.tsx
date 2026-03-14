import { useState, useEffect, type ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, Save, Image as ImageIcon, CheckCircle,
  AlertTriangle, ArrowLeft, User
} from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useTickets, type TicketItem, type Ticket } from '../context/TicketContext';
import { type QuoteFormatType } from '../components/QuotePDF'; 

export const EditTicket = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, editTicket } = useTickets();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  
  // --- Estados del Formulario ---
  const [items, setItems] = useState<TicketItem[]>([
    { id: Date.now(), name: '', price: 0, quantity: 1 }
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // --- Estado de Errores Visuales ---
  const [errors, setErrors] = useState<string[]>([]);

  // --- Estado de Éxito ---
  const [showSuccess, setShowSuccess] = useState(false);

  // --- Sugerencias Rápidas ---
  const quickServices = ["Cambio de Aceite", "Balatas", "Afinación Mayor", "Revisión General", "Batería"];

  // --- Estado de Formato de Salida ---
  const [outputFormat, setOutputFormat] = useState<QuoteFormatType>('payment_info');

  // --- Cargar datos del Ticket ---
  useEffect(() => {
    if (id) {
      const ticketToEdit = tickets.find(t => t.id === id);
      if (ticketToEdit) {
        setTicket(ticketToEdit);
        setItems(ticketToEdit.items);
      
        const isUrg = ticketToEdit.notes?.includes('⚠️ URGENTE');
        setIsUrgent(!!isUrg);
        setNotes(ticketToEdit.notes?.replace('⚠️ URGENTE', '').trim() || '');

        if (ticketToEdit.formatType) {
          setOutputFormat(ticketToEdit.formatType);
        }

        if (ticketToEdit.discount) {
          setDiscountPercent(ticketToEdit.discount);
        }
      }
    }
  }, [id, tickets]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const baseTotal = subtotal - discountAmount;
  
  const envio = 0; 
  const baseGravable = baseTotal + envio;

  const hasIVA = outputFormat !== 'basic';
  const hasRetencion = outputFormat === 'payment_info';

  const iva = hasIVA ? baseGravable * 0.16 : 0;
  const retencion = hasRetencion ? baseGravable * 0.0125 : 0;
  
  const grandTotal = baseGravable + iva - retencion;

  const addItem = (name: string = '') => setItems([...items, { id: Date.now(), name, price: 0, quantity: 1 }]);
  
  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof TicketItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleImageUpload = (id: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateItem(id, 'image', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // --- Validaciones Visuales ---
    const newErrors: string[] = [];
    if (items.length === 0) newErrors.push('global_items');
    
    items.forEach(item => {
        if (!item.name.trim()) newErrors.push(`item_name_${item.id}`);
        if (item.price === undefined || item.price === null || item.price < 0 || isNaN(item.price)) newErrors.push(`item_price_${item.id}`);
    });

    if (newErrors.length > 0) {
        setErrors(newErrors);
        return; 
    }
    
    setErrors([]);

    if (!id || !ticket) return;
    
    editTicket(id, {
      total: grandTotal,
      items,
      formatType: outputFormat,
      discount: discountPercent,
      envio: 0,
      notes: `${notes} ${isUrgent ? '⚠️ URGENTE' : ''}`.trim()
    });

    setShowSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!ticket) {
    return (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-bold mb-2">Ticket no encontrado</h2>
        <Link to="/" className="text-blue-500 hover:underline">Volver al Dashboard</Link>
      </div>
    );
  }

  // =========================================
  // UI PRINCIPAL
  // =========================================
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">

        {/* MODAL ÉXITO */}
        {showSuccess && (
          <div className="fixed -inset-20 bg-slate-900/95 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                
                <div className="bg-blue-500 p-6 text-center">
                   <CheckCircle size={48} className="text-white mx-auto mb-3" />
                   <h2 className="text-2xl font-black text-white">Servicio Actualizado</h2>
                   <p className="text-blue-100 font-medium mt-1">Ticket #{ticket.ticketNumber} guardado correctamente</p>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Ir al Dashboard
                    </button>
                    <button 
                        onClick={() => setShowSuccess(false)}
                        className="w-full text-slate-500 hover:text-slate-800 font-medium py-2 text-sm transition-colors"
                    >
                        Seguir editando
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center gap-4">
            <Link to="/" className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    Editar Servicio #{ticket.ticketNumber}
                    <button 
                        onClick={() => setIsUrgent(!isUrgent)}
                        className={`text-sm px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                            isUrgent 
                            ? 'bg-red-50 border-red-200 text-red-600' 
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        <AlertTriangle size={14} /> {isUrgent ? 'Urgente' : 'Normal'}
                    </button>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Creado el {new Date(ticket.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} a las {new Date(ticket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
            </div>
        </div>

        {/* INFO DEL CLIENTE (Solo lectura) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                {ticket.clientName?.charAt(0).toUpperCase() || <User size={20} />}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-lg truncate">{ticket.clientName}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                    {ticket.clientPhone && <span>{ticket.clientPhone}</span>}
                    {ticket.clientEmail && <span>{ticket.clientEmail}</span>}
                    {ticket.vehicle && <span className="text-blue-600 font-medium">{ticket.vehicle}</span>}
                </div>
            </div>
            <div className="text-right flex-shrink-0">
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-100">
                    Cliente asignado
                </span>
            </div>
        </div>

        {/* PRODUCTOS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative z-10">
             
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     Productos / Servicios
                     {errors.includes('global_items') && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1"><AlertTriangle size={12}/> Agrega al menos 1 producto</span>}
                 </h3>
                 {/* Quick Services Toggles */}
                 <div className="hidden md:flex gap-2">
                     {quickServices.map(service => (
                         <button 
                            key={service}
                            onClick={() => addItem(service)}
                            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                         >
                             + {service}
                         </button>
                     ))}
                 </div>
             </div>

             <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex gap-4 items-start group">
                        {/* INPUT IMAGEN */}
                         <div className="w-20 h-20 bg-gray-200 rounded-lg relative flex-shrink-0 overflow-hidden border border-gray-300 hover:border-slate-400 transition-colors group/img">
                            {item.image ? (
                                <>
                                    <img src={item.image} alt="Preview" className="w-full h-full object-cover" />
                                    <label htmlFor={`file-${item.id}`} className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                                        <ImageIcon size={20} />
                                    </label>
                                </>
                            ) : (
                                <label htmlFor={`file-${item.id}`} className="w-full h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-slate-600 hover:bg-gray-200 transition-colors">
                                    <ImageIcon size={24} className="mb-1" />
                                    <span className="text-[10px] font-medium">FOTO</span>
                                </label>
                            )}
                            <input type="file" id={`file-${item.id}`} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(item.id, e)} />
                        </div>
                        {/* INPUTS TEXTO */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-7">
                                <label className="text-xs text-gray-500 mb-1 block">Descripción {errors.includes(`item_name_${item.id}`) && <span className="text-red-500 font-bold">*</span>}</label>
                                <input 
                                   className={`w-full border ${errors.includes(`item_name_${item.id}`) ? 'border-red-400 bg-red-50/30' : 'border-gray-300'} bg-white p-2 rounded text-sm outline-none focus:border-slate-800 transition-colors`}
                                   value={item.name} 
                                   onChange={(e) => {
                                       updateItem(item.id, 'name', e.target.value);
                                       if (errors.includes(`item_name_${item.id}`)) setErrors(errors.filter(err => err !== `item_name_${item.id}`));
                                   }} 
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-xs text-gray-500 mb-1 block">Precio {errors.includes(`item_price_${item.id}`) && <span className="text-red-500 font-bold">*</span>}</label>
                                <input 
                                   type="number" 
                                   className={`w-full border ${errors.includes(`item_price_${item.id}`) ? 'border-red-400 bg-red-50/30' : 'border-gray-300'} bg-white p-2 rounded text-sm outline-none focus:border-slate-800 transition-colors`}
                                   value={item.price ?? ''} 
                                   onChange={(e) => {
                                       updateItem(item.id, 'price', parseFloat(e.target.value));
                                       if (errors.includes(`item_price_${item.id}`)) setErrors(errors.filter(err => err !== `item_price_${item.id}`));
                                   }} 
                                />
                            </div>
                            <div className="md:col-span-2 flex items-end gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Cant.</label>
                                    <input type="number" className="w-full border border-gray-300 bg-white p-2 rounded text-sm outline-none focus:border-slate-800" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                                </div>
                                <button onClick={() => removeItem(item.id)} className="p-2 h-[38px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
             <button onClick={() => addItem()} className="mt-4 w-full py-3 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-slate-800 hover:bg-gray-50 transition-all flex justify-center gap-2 items-center text-sm font-medium"><Plus size={16} /> Añadir línea</button>
        </div>

         {/* TIPO DE DOCUMENTO Y TOTALES */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                 <div className="mb-4">
                     <label className="font-bold text-slate-800 block mb-2">Notas internas</label>
                     <textarea className="w-full border border-gray-300 bg-white rounded-lg p-3 text-sm outline-none h-24 resize-none focus:border-slate-800" value={notes} onChange={(e) => setNotes(e.target.value)} />
                 </div>
                 
                 <div>
                     <label className="block text-sm font-bold text-slate-800 mb-1">Tipo de Formato</label>
                     <select 
                         className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-slate-800 bg-white"
                         value={outputFormat}
                         onChange={(e) => setOutputFormat(e.target.value as QuoteFormatType)}
                     >
                         <option value="basic">Formato Simple (Neto sin Impuestos)</option>
                         <option value="payment_info">Formato Completo (+ IVA y Retención)</option>
                         <option value="payment_no_retention">Formato sin Retención (+ IVA solo)</option>
                     </select>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-end">
                 <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-sm text-gray-500">Descuento (%)</span>
                     <div className="flex items-center justify-end gap-2">
                         <span className="text-sm text-red-500 font-medium">-{formatCurrency(discountAmount)}</span>
                         <input type="number" className="w-16 border border-gray-300 bg-white rounded p-1 text-right text-sm outline-none focus:border-slate-800" value={discountPercent} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
                     </div>
                 </div>
                 <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100"><span className="text-sm font-bold text-slate-800">Base Gravable</span><span className="font-bold">{formatCurrency(baseGravable)}</span></div>
                 
                 {hasIVA && (
                     <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                         <span>IVA (16%)</span>
                         <span className="text-emerald-600 font-medium">+{formatCurrency(iva)}</span>
                     </div>
                 )}
                 {hasRetencion && (
                     <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                         <span>Retención (1.25%)</span>
                         <span className="text-red-500 font-medium">-{formatCurrency(retencion)}</span>
                     </div>
                 )}

                 <div className="flex justify-between items-end mt-2 pt-4 border-t border-gray-200">
                     <span className="font-bold text-xl text-slate-800">Total a Pagar</span>
                     <span className="font-bold text-3xl text-slate-900">{formatCurrency(grandTotal)}</span>
                 </div>
              </div>
         </div>

         {/* BOTON GUARDAR */}
         <div className="sticky bottom-4 z-0 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex items-center justify-between gap-4">
             <Link to="/" className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors flex items-center gap-2">
                <ArrowLeft size={16} /> Cancelar
             </Link>
             <button 
               onClick={handleSave} 
               className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md transition-transform active:scale-[0.99]"
             >
               <Save size={20} /> Guardar Cambios
             </button>
         </div>
    </div>
  );
};