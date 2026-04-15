import { useState, useEffect, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, Save, Image as ImageIcon, CheckCircle, 
  ArrowLeft, User, Phone, Mail, RefreshCw, AlertTriangle, FileText, ChevronRight, X,
  ShoppingCart, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { type QuoteFormatType } from '../components/QuotePDF'; 
import { useStore } from '../store/useStore';
import { InfoModal } from '../components/InfoModal';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Skeleton } from '../components/ui/Skeleton';
import { createTicketSchema } from '../schemas/ticket';

export interface TicketItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  inventory_id?: string;
  purchase_price?: number;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  ticket_number?: number;
  clientName: string;
  client_name?: string;
  clientPhone?: string;
  client_phone?: string;
  clientEmail?: string;
  client_email?: string;
  vehicle?: string;
  total: number;
  items: TicketItem[];
  status: 'pending' | 'completed' | 'cancelled';
  formatType?: 'basic' | 'payment_info' | 'payment_no_retention';
  format_type?: 'basic' | 'payment_info' | 'payment_no_retention';
  discount?: number;
  envio?: number;
  date: string;
  isArchived?: boolean;
  is_archived?: boolean;
  servicePhoto?: string;
  service_photo?: string;
  notes?: string;
}

export const EditarTicket = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, editTicket, inventory } = useStore();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Estados del Formulario ---
  const [items, setItems] = useState<TicketItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [servicePhoto, setServicePhoto] = useState<string>('');

  // --- Estado de Errores Visuales ---
  const [errors, setErrors] = useState<string[]>([]);

  // --- Estado de Éxito y Cancelación ---
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // --- Sugerencias Rápidas ---
  const quickServices = ["Cambio de Aceite", "Balatas", "Afinación Mayor", "Revisión General", "Batería"];

  // --- Estado para Modal de Inventario ---
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const filteredInventory = inventorySearch.trim() === '' 
    ? inventory.filter(i => (i.current_stock ?? i.currentStock) > 0) 
    : inventory.filter(i => 
        ((i.current_stock ?? i.currentStock) > 0) &&
        (i.brand.toLowerCase().includes(inventorySearch.toLowerCase()) || 
         i.type.toLowerCase().includes(inventorySearch.toLowerCase()))
      );

  // --- Estado de Formato de Salida ---
  const [outputFormat, setOutputFormat] = useState<QuoteFormatType>('payment_info');

  // --- Cargar datos del Ticket ---
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      const ticketToEdit = (tickets as Ticket[]).find(t => t.id === id);
      if (ticketToEdit) {
        setTicket(ticketToEdit);
        setItems(ticketToEdit.items || []);
        setServicePhoto(ticketToEdit.service_photo || ticketToEdit.servicePhoto || '');
      
        const isUrg = (ticketToEdit.notes || '').includes('⚠️ URGENTE');
        setIsUrgent(!!isUrg);
        setNotes((ticketToEdit.notes || '').replace('⚠️ URGENTE', '').trim());

        if (ticketToEdit.format_type || ticketToEdit.formatType) {
          setOutputFormat((ticketToEdit.format_type || ticketToEdit.formatType) as QuoteFormatType);
        }

        if (ticketToEdit.discount) {
          setDiscountPercent(ticketToEdit.discount);
        }
      }
      // Simular delay para mostrar esqueletos y mejorar UX feel
      setTimeout(() => setIsLoading(false), 600);
    }
  }, [id, tickets]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const baseTotal = subtotal - discountAmount;
  
  const hasIVA = outputFormat !== 'basic';
  const hasRetencion = outputFormat === 'payment_info';

  const iva = hasIVA ? baseTotal * 0.16 : 0;
  const retencion = hasRetencion ? baseTotal * 0.0125 : 0;
  const grandTotal = baseTotal + iva - retencion;

  const addItem = (name: string = '') => {
    setItems([...items, { id: Date.now(), name, price: 0, quantity: 1 }]);
  };
  
  const removeItem = (itemId: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: number, field: keyof TicketItem, value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const handleImageUpload = (itemId: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateItem(itemId, 'image', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleServicePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setServicePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!id || !ticket) return;

    const ticketData = {
      client_name: ticket.client_name || ticket.clientName,
      client_phone: ticket.client_phone || ticket.clientPhone,
      client_email: ticket.client_email || ticket.clientEmail,
      vehicle: ticket.vehicle,
      format_type: outputFormat,
      items: items.map(({ id, ...rest }) => rest),
      discount: discountPercent,
      service_photo: servicePhoto,
      notes: `${notes} ${isUrgent ? '⚠️ URGENTE' : ''}`.trim()
    };

    const validation = createTicketSchema.safeParse(ticketData);

    if (!validation.success) {
      const fieldErrors = validation.error.issues.map(err => err.path.join('.'));
      setErrors(fieldErrors);
      toast.error(validation.error.issues[0].message);
      return;
    }
    
    setErrors([]);
    const loadingToast = toast.loading('Guardando cambios...');
    
    try {
      await editTicket(id, {
        ...ticketData,
        total: grandTotal
      });

      toast.success('Servicio actualizado con éxito', { id: loadingToast });
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error('Error al guardar los cambios', { id: loadingToast });
    }
  };


  if (isLoading) {
    return (
       <div className="p-4 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
          <Breadcrumbs />
          <div className="flex items-center gap-6 mb-12">
             <Skeleton className="w-12 h-12" />
             <div className="space-y-2">
                <Skeleton className="w-64 h-8" />
                <Skeleton className="w-32 h-4" />
             </div>
          </div>
          <Skeleton className="w-full h-32 rounded-xl" />
          <div className="space-y-4">
             <Skeleton className="w-full h-24 rounded-xl" />
             <Skeleton className="w-full h-24 rounded-xl" />
          </div>
       </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-12 text-center animate-in zoom-in duration-500">
         <div className="w-24 h-24 bg-secondary-900/50 rounded-3xl mx-auto mb-8 flex items-center justify-center text-danger-500 border border-danger-500/20 shadow-2xl">
            <AlertTriangle size={48} strokeWidth={1} />
         </div>
         <h2 className="text-3xl font-bold mb-2 uppercase">Servicio no encontrado</h2>
         <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-10">El folio solicitado no existe o fue eliminado.</p>
         <Link to="/" className="inline-flex items-center gap-3 bg-primary-600 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-primary-500 transition-all">
            <ArrowLeft size={16} /> Volver al Panel
         </Link>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans relative">
        <Breadcrumbs />

        {/* MODAL ÉXITO */}
        {showSuccess && createPortal(
          <div className="fixed inset-0 bg-slate-900/80 z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
                <div className="p-10 text-center">
                   
                   <div className="w-20 h-20 bg-success-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-success-600/20">
                        <CheckCircle size={40} className="text-white" />
                   </div>
                   
                   <h2 className="text-3xl font-bold mb-2 uppercase text-slate-900">¡Actualizado!</h2>
                   <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">Servicio #{ticket.ticket_number || ticket.ticketNumber}</p>
 
                    <div className="space-y-3">
                        <button 
                            onClick={() => navigate('/')}
                            className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:bg-primary-500 text-xs uppercase tracking-wider"
                        >
                            Ir al Dashboard
                        </button>
                        <button 
                            onClick={() => setShowSuccess(false)}
                            className="w-full text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary-600 transition-colors py-2"
                        >
                             Seguir editando
                        </button>
                    </div>
                </div>
            </div>
          </div>, document.body
        )}

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-8 px-2">
            <div className="flex items-center gap-6">
                <Link to="/" className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-all shadow-sm">
                  <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-4 flex-wrap uppercase">
                        Edición Folio #{ticket.ticket_number || ticket.ticketNumber}
                        <button 
                            onClick={() => setIsUrgent(!isUrgent)}
                            className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all ${
                                isUrgent 
                                ? 'bg-danger-600 text-white border-danger-700 shadow-md' 
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                        >
                            {isUrgent ? '⚠️ URGENTE' : 'Prioridad Normal'}
                        </button>
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold mt-1.5 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={12} />
                        Creado el {new Date(ticket.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(ticket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                </div>
            </div>
        </header>

        {/* FOTO DEL SERVICIO */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group mb-6 transition-all">
            <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                <div className="w-full md:w-40 aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative group/photo transition-all hover:bg-slate-100">
                    {servicePhoto ? (
                        <>
                            <img src={servicePhoto} alt="Registro de entrada" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center gap-4 transition-all">
                                <label htmlFor="service-photo" className="w-12 h-12 bg-white text-primary-600 rounded-lg cursor-pointer hover:scale-110 transition-transform shadow-lg flex items-center justify-center">
                                    <RefreshCw size={20} />
                                </label>
                                <button 
                                    onClick={() => setServicePhoto('')}
                                    className="w-12 h-12 bg-white text-danger-600 rounded-lg hover:scale-110 transition-transform shadow-lg flex items-center justify-center"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <label htmlFor="service-photo" className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 cursor-pointer group-hover:text-primary-500 transition-all">
                            <ImageIcon size={40} className="mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Foto del Vehículo</span>
                        </label>
                    )}
                    <input 
                        type="file" 
                        id="service-photo" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleServicePhotoUpload} 
                    />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                    <h3 className="font-bold text-lg tracking-tight mb-2 flex items-center justify-center md:justify-start gap-3">
                        <span className="w-8 h-8 bg-primary-600/10 rounded-lg flex items-center justify-center">
                            <ImageIcon size={16} className="text-primary-500" />
                        </span>
                        Registro de Entrada
                    </h3>
                    <p className="opacity-40 text-xs font-normal leading-relaxed max-w-lg">
                        Captura el estado físico inicial del vehículo para transparencia total con el cliente. Esta imagen aparecerá en el dashboard principal como referencia visual del servicio.
                    </p>
                </div>
            </div>
        </div>

         {/* INFO DEL CLIENTE */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex items-center gap-8 relative overflow-hidden group">
            <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-3xl font-bold flex-shrink-0 shadow-sm border border-primary-100 transition-transform group-hover:scale-105">
                {(ticket.client_name || ticket.clientName || '').charAt(0).toUpperCase() || <User size={30} />}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xl uppercase mb-2 text-slate-800">{ticket.client_name || ticket.clientName}</h3>
                <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {(ticket.client_phone || ticket.clientPhone) && <span className="flex items-center gap-2"><Phone size={14} className="text-primary-600/60" /> {ticket.client_phone || ticket.clientPhone}</span>}
                    {(ticket.client_email || ticket.clientEmail) && <span className="flex items-center gap-2"><Mail size={14} className="text-primary-600/60" /> {ticket.client_email || ticket.clientEmail}</span>}
                    {ticket.vehicle && <span className="text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" /> {ticket.vehicle}</span>}
                </div>
            </div>
        </div>

        {/* CONCEPTOS DE SERVICIO */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative z-10">
             
             <div className="flex justify-between items-center mb-8">
                 <h3 className="font-bold text-xl flex items-center gap-3 text-slate-800 uppercase">
                    <span className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-100">
                         <RefreshCw size={18} className="text-primary-600" />
                    </span>
                    Conceptos del Folio
                    {errors.includes('global_items') && <span className="text-[10px] font-bold text-danger-500 bg-danger-50 px-3 py-1.5 rounded-lg border border-danger-100 uppercase tracking-wider animate-pulse ml-4">Mínimo 1 concepto</span>}
                 </h3>
                 <div className="hidden lg:flex gap-2">
                     {quickServices.map(service => (
                         <button 
                            key={service}
                            onClick={() => addItem(service)}
                            className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 hover:bg-primary-600 hover:text-white px-4 py-2 rounded-lg transition-all shadow-sm"
                         >
                             + {service}
                         </button>
                     ))}
                 </div>
             </div>

             <div className="space-y-6">
                {items.map((item) => (
                      <div key={item.id} className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-8 items-center group transition-colors relative">
                          {/* Imagen Concepto */}
                          <div className="w-20 h-20 bg-white rounded-xl relative flex-shrink-0 overflow-hidden border border-slate-200 shadow-sm">
                             {item.image ? (
                                 <>
                                     <img src={item.image} alt="Preview" className="w-full h-full object-cover" />
                                     <label htmlFor={`edit-file-${item.id}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                                         <RefreshCw size={20} />
                                     </label>
                                 </>
                             ) : (
                                 <label htmlFor={`edit-file-${item.id}`} className="w-full h-full flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:text-primary-600 transition-all">
                                     <ImageIcon size={24} className="mb-1" />
                                     <span className="text-[9px] font-bold uppercase tracking-widest">FOTO</span>
                                 </label>
                             )}
                             <input type="file" id={`edit-file-${item.id}`} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(item.id, e)} />
                         </div>

                         <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-end w-full">
                            <div className="md:col-span-6">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">
                                    Descripción del Concepto {errors.includes(`item_name_${item.id}`) && <span className="text-danger-500 font-bold">*</span>}
                                </label>
                                <input 
                                   className={`w-full h-11 bg-white border border-slate-200 rounded-lg px-4 text-sm font-bold outline-none transition-all ${errors.includes(`item_name_${item.id}`) ? 'border-danger-300 bg-danger-50' : ''}`}
                                   placeholder="Ej. Cambio de Aceite Sintético..."
                                   value={item.name} 
                                   onChange={(e) => {
                                       updateItem(item.id, 'name', e.target.value);
                                       if (errors.includes(`item_name_${item.id}`)) setErrors(errors.filter(err => err !== `item_name_${item.id}`));
                                   }} 
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Precio Unitario</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                    <input 
                                       type="number" 
                                       className={`w-full h-11 bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-sm font-bold outline-none transition-all ${errors.includes(`item_price_${item.id}`) ? 'border-danger-300 bg-danger-50' : ''}`}
                                        value={item.price ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            updateItem(item.id, 'price', isNaN(val) ? 0 : val);
                                            if (errors.includes(`item_price_${item.id}`)) setErrors(errors.filter(err => err !== `item_price_${item.id}`));
                                        }} 
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Cantidad</label>
                                <input type="number" className="w-full h-11 bg-white border border-slate-200 rounded-lg px-4 text-sm font-bold outline-none" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                            </div>
                            <div className="md:col-span-1 flex justify-center">
                                <button onClick={() => removeItem(item.id)} className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-all border border-slate-200"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
             <div className="flex flex-col sm:flex-row gap-4 mt-8">
                 <button 
                    onClick={() => addItem()} 
                    className="flex-1 py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-all flex justify-center gap-3 items-center text-xs font-bold uppercase tracking-wider group"
                 >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                    Concepto Abierto
                 </button>
                 <button 
                    onClick={() => setShowInventoryModal(true)} 
                    className="flex-1 py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex justify-center gap-3 items-center text-xs font-bold uppercase tracking-wider group"
                 >
                    <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" /> 
                    Catálogo / Refacciones
                 </button>
             </div>
        </div>

         {/* NOTAS Y TOTALES */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-40 relative z-10">
               <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="mb-8">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-4 px-1 flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary-500" /> Notas de Edición
                      </label>
                      <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm font-bold outline-none h-40 resize-none transition-all placeholder:text-slate-300" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agrega aquí observaciones adicionales sobre la edición..." />
                  </div>
                  
                  <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-4 px-1">Formato de Documento</label>
                      <div className="relative">
                          <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" />
                          <select 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pr-12 text-[10px] font-bold uppercase tracking-wider outline-none appearance-none cursor-pointer"
                              value={outputFormat}
                              onChange={(e) => setOutputFormat(e.target.value as QuoteFormatType)}
                          >
                              <option value="basic" className="bg-white text-slate-900">📄 Formato Simple (Conceptos Netos)</option>
                              <option value="payment_info" className="bg-white text-slate-900">📄 Formato Fiscal (+ IVA + Isr)</option>
                              <option value="payment_no_retention" className="bg-white text-slate-900">📄 Formato Ejecutivo (+ IVA)</option>
                          </select>
                      </div>
                  </div>
               </div>

               <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg relative group">
                  <div className="space-y-6 relative z-10">
                     <div className="flex justify-between items-center px-2">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtotal de Conceptos</span>
                         <span className="font-bold text-xl text-slate-400">{formatCurrency(subtotal)}</span>
                     </div>
                     <div className="flex justify-between items-center p-5 bg-slate-50 border border-slate-100 rounded-xl">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Descuento Aplicado</span>
                         <div className="flex items-center gap-4">
                             <span className="text-xs font-bold text-danger-600">-{formatCurrency(discountAmount)}</span>
                             <input type="number" className="w-20 h-9 bg-white border border-slate-200 rounded-lg px-2 text-center text-sm font-bold outline-none shadow-sm" value={discountPercent} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
                         </div>
                     </div>
                     
                     <div className="flex justify-between items-center px-2 pt-4 border-t border-slate-200">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base Imponible</span>
                         <span className="font-bold text-2xl text-slate-900">{formatCurrency(baseTotal)}</span>
                     </div>
                     
                     <div className="space-y-3 pt-4 text-slate-400">
                        {hasIVA && (
                             <div className="flex justify-between items-center px-2 text-[10px] font-bold uppercase tracking-wider leading-none">
                                 <span>Impuesto IVA (16%)</span>
                                 <span className="text-slate-600">+{formatCurrency(iva)}</span>
                             </div>
                        )}
                        {hasRetencion && (
                             <div className="flex justify-between items-center px-2 text-[10px] font-bold uppercase tracking-wider leading-none">
                                 <span>Retención Fiscal (1.25%)</span>
                                 <span className="text-danger-600">-{formatCurrency(retencion)}</span>
                             </div>
                        )}
                     </div>
 
                     <div className="flex justify-between items-end mt-10 pt-6 border-t border-slate-200 px-2 relative">
                         <div className="flex flex-col relative z-10">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 leading-none">Inversión Final Actualizada</span>
                             <span className="font-bold text-4xl text-success-600 leading-none">{formatCurrency(grandTotal)}</span>
                         </div>
                         <div className="w-14 h-14 bg-success-50 rounded-xl flex items-center justify-center text-success-600 border border-success-100 shadow-sm">
                              <CheckCircle size={28} />
                         </div>
                     </div>
                  </div>
               </div>
         </div>

         {/* ACCIONES - STICKY FOOTER */}
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-4rem)] max-w-5xl bg-white shadow-2xl p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-8">
             <button 
                onClick={() => setShowCancelModal(true)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-danger-600 transition-all flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-lg border border-slate-200"
             >
                <X size={16} /> Descartar
             </button>
             
             <button 
               onClick={handleSave} 
               disabled={items.length === 0 || grandTotal <= 0}
               className="flex-1 md:flex-none md:w-[400px] bg-primary-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-4 hover:bg-primary-500 shadow-lg shadow-primary-900/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider group"
             >
               <Save size={24} /> 
               Sincronizar Cambios
             </button>
         </div>

         {/* MODAL CANCELAR */}
         <InfoModal 
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={() => navigate('/')}
            title="¿Descartar Cambios?"
            message="Si sales ahora, todos los cambios realizados en este folio se perderán permanentemente."
            confirmText="Sí, Descartar"
            cancelText="Continuar Editando"
            type="warning"
         />

         {showInventoryModal && createPortal(
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowInventoryModal(false)} />
                  <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <ShoppingCart className="text-emerald-600" size={18} />
                              Añadir del Inventario
                          </h3>
                          <button onClick={() => setShowInventoryModal(false)} className="text-slate-400 hover:text-slate-600">
                              <X size={20} />
                          </button>
                      </div>
                      
                      <div className="p-4 border-b border-slate-100">
                          <div className="relative">
                              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                              <input 
                                  type="text" 
                                  placeholder="Buscar por marca, tipo o categoría..." 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-500 transition-all font-medium"
                                  value={inventorySearch}
                                  onChange={(e) => setInventorySearch(e.target.value)}
                              />
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4">
                          {filteredInventory.length === 0 ? (
                              <div className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-xs">
                                  No se encontraron artículos
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {filteredInventory.map(item => (
                                      <div 
                                          key={item.id}
                                          className="p-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl flex items-center gap-3 cursor-pointer group transition-all hover:shadow-md"
                                          onClick={() => {
                                              const itemName = item.category === 'Refaccion' ? `${item.brand} ${item.type}` : `${item.brand} ${item.viscosity} ${item.type}`;
                                              const newItem = {
                                                  id: Date.now() + Math.random(),
                                                  name: itemName.trim(),
                                                  price: item.marketPrice || 0,
                                                  quantity: 1,
                                                  inventory_id: item.id,
                                                  purchase_price: item.purchasePrice || 0
                                              };
                                              
                                              const lastItem = items[items.length - 1];
                                              if (lastItem && !lastItem.name && lastItem.price === 0 && lastItem.quantity === 1) {
                                                  setItems(items.map(i => i.id === lastItem.id ? newItem : i));
                                              } else {
                                                  setItems([...items, newItem]);
                                              }
                                              
                                              toast.success(`${itemName} añadido`);
                                              setShowInventoryModal(false);
                                          }}
                                      >
                                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden px-1 border border-slate-100">
                                              {item.image ? (
                                                  <img src={item.image} alt={item.brand} className="w-full h-full object-cover" />
                                              ) : (
                                                  <ImageIcon size={18} className="text-slate-300" />
                                              )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <p className="font-bold text-xs text-slate-800 truncate mb-0.5">{item.brand}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                                  {item.category === 'Refaccion' ? item.type : `${item.viscosity} · ${item.type}`}
                                              </p>
                                          </div>
                                          <div className="text-right">
                                              <p className="font-bold text-sm text-emerald-600">{formatCurrency(item.marketPrice || 0)}</p>
                                              <p className="text-[9px] text-slate-400 font-bold uppercase">Desc: <span className={item.currentStock <= 5 ? "text-danger-500" : "text-emerald-500"}>{item.currentStock}</span></p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>, document.body
          )}
    </div>
  );
};