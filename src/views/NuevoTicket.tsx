import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, Plus, Trash2, Save, X, Phone, Image as ImageIcon, 
  CheckCircle, MessageCircle, FileText, Mail, RefreshCw, AlertTriangle, ShoppingCart, DollarSign, ChevronRight, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { formatCurrency, formatPdfFileName } from '../utils/format';
import { QuotePDF, type QuoteFormatType } from '../components/QuotePDF'; 
import { EmailModal } from '../components/EmailModal'; 
import { useStore } from '../store/useStore';
import { InfoModal } from '../components/InfoModal';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { PhoneInput } from '../components/ui/PhoneInput';
import { sendWhatsAppNotification, formatTicketMessage } from '../utils/notifications';

import type { Ticket, TicketItem, Client } from '../types';

export const NuevoTicket = () => {
  const { addTicket, clients, addClient, inventory } = useStore();
  
  // --- Estados del Formulario ---
  const [items, setItems] = useState<TicketItem[]>([
    { id: Date.now(), name: '', price: 0, quantity: 1 }
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [servicePhoto, setServicePhoto] = useState<string>('');

  // --- Estado de Errores Visuales ---
  const [errors, setErrors] = useState<string[]>([]);

  // --- Sugerencias Rápidas ---
  const quickServices = ["Cambio de Aceite", "Balatas", "Afinación Mayor", "Revisión General", "Batería"];

  // --- Estados del Buscador ---
  const [clientSearch, setClientSearch] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientVehicle, setClientVehicle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // --- Quick Client Add State ---
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [qcName, setQcName] = useState('');
  const [qcPhone, setQcPhone] = useState('');
  const [qcEmail, setQcEmail] = useState('');

  // --- Estado de Éxito ---
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // --- Estado para Modal Email y Reset ---
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
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

  const [outputFormat, setOutputFormat] = useState<QuoteFormatType>('payment_info');

  const [searchParams] = useSearchParams();

  // Lógica de filtrado
  const filteredClients = clientSearch.trim() === '' ? [] : clients.filter((c: Client) => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)
  );

  useEffect(() => {
    const cName = searchParams.get('clientName');
    const cPhone = searchParams.get('clientPhone');
    if (cName) setClientSearch(cName);
    if (cPhone) setClientPhone(cPhone);
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const baseTotal = subtotal - discountAmount;

  const hasIVA = outputFormat === 'payment_info' || outputFormat === 'payment_no_retention';
  const hasRetencion = outputFormat === 'payment_info';

  const iva = hasIVA ? baseTotal * 0.16 : 0;
  const retencion = hasRetencion ? baseTotal * 0.0125 : 0;
  const grandTotal = baseTotal + iva - retencion;

  const addItem = (name: string = '') => {
    const lastItem = items[items.length - 1];
    if (name && !lastItem.name && lastItem.price === 0) {
      updateItem(lastItem.id || 0, 'name', name);
    } else {
      setItems([...items, { id: Date.now(), name, price: 0, quantity: 1 }]);
    }
  };
  
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
  
  const handleServicePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setServicePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectClient = (client: Client) => {
    setClientSearch(client.name);
    setClientPhone(client.phone || '');
    setClientEmail(client.email || '');
    setClientVehicle(''); 
    setSelectedClient(client);
    setShowSuggestions(false);
  };

  const handleClearClient = () => {
    setClientSearch('');
    setClientPhone('');
    setClientEmail('');
    setClientVehicle('');
    setSelectedClient(null);
  };

  const handleSave = async () => {
    const finalClientName = selectedClient ? selectedClient.name : clientSearch;
    
    const newErrors: string[] = [];
    if (!finalClientName.trim()) newErrors.push('client');
    if (items.length === 0) newErrors.push('global_items');
    
    if (clientPhone) {
      const cleanPhone = clientPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        toast.error("El teléfono debe tener 10 dígitos (ej: 6442039334)");
        newErrors.push('phone');
      }
    }
    
    items.forEach(item => {
        if (!item.name.trim()) newErrors.push(`item_name_${item.id}`);
        if (item.price === undefined || item.price === null || item.price < 0 || isNaN(item.price)) newErrors.push(`item_price_${item.id}`);
    });

    if (newErrors.length > 0) {
        setErrors(newErrors);
        if (newErrors.includes('client')) {
           window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return; 
    }
    
    setErrors([]); 
    
    const newTicketData = await addTicket({
      client_id: selectedClient?.id,
      clientName: selectedClient ? selectedClient.name : clientSearch,
      clientPhone: clientPhone,
      clientEmail: clientEmail,
      vehicle: clientVehicle,
      total: grandTotal,
      items,
      status: 'pending',
      formatType: outputFormat,
      discount: discountPercent,
      envio: 0,
      servicePhoto: servicePhoto,
      notes: `${notes} ${isUrgent ? '⚠️ URGENTE' : ''}`.trim()
    });

    setCreatedTicket(newTicketData);
    toast.dismiss(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setItems([{ id: Date.now(), name: '', price: 0, quantity: 1 }]);
    setClientSearch('');
    setClientPhone('');
    setClientEmail('');
    setClientVehicle('');
    setSelectedClient(null);
    setDiscountPercent(0);
    setNotes('');
    setErrors([]);
    setIsUrgent(false);
    setServicePhoto('');
    setShowResetModal(false);
  };

  const handleWhatsAppSuccess = () => {
    if (!createdTicket) return;
    const phone = (selectedClient?.phone || clientPhone || '').replace(/\D/g,'');
    const message = formatTicketMessage(
      createdTicket.client_name || createdTicket.clientName || 'Cliente',
      createdTicket.ticket_number || createdTicket.ticketNumber || 0,
      createdTicket.status,
      createdTicket.total,
      createdTicket.items || []
    );
    sendWhatsAppNotification(phone, message);
  };

  const handleCreateQuickClient = (e: React.FormEvent) => {
     e.preventDefault();
     if(!qcName.trim()) {
        toast.error('El nombre del cliente es requerido.');
        return;
     }

     const cleanPhone = qcPhone.replace(/\D/g, '');
     if (cleanPhone.length !== 10) {
        toast.error("El teléfono debe tener 10 dígitos (ej: 6442039334)");
        return;
     }
     const newClient = { name: qcName, phone: qcPhone, email: qcEmail, registrationDate: new Date().toISOString() };
     addClient(newClient);
     
     setClientSearch(qcName);
     setClientPhone(qcPhone);
     setClientEmail(qcEmail);
     const newClientFull = { id: Date.now().toString(), ...newClient, created_at: new Date().toISOString() };
     setSelectedClient(newClientFull as Client); 
     toast.success('Cliente agregado correctamente');
     setShowQuickClient(false);
     
     setQcName('');
     setQcPhone('');
     setQcEmail('');
  };

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 font-sans relative">
        <Breadcrumbs />
        
        {/* MODAL ÉXITO */}
        {createdTicket && createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0a1428]/80" />
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 relative z-10">
                
                <div className="p-8 text-center relative">
                   <button 
                     onClick={handleReset}
                     className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors z-10"
                   >
                     <X size={24} />
                   </button>
                   
                   <div className="w-16 h-16 bg-success-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-success-500/20">
                        <CheckCircle size={32} className="text-white" />
                   </div>
                   
                   <h2 className="text-2xl font-bold mb-2">¡Servicio Registrado!</h2>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-8">Folio #{createdTicket.ticket_number || createdTicket.ticketNumber}</p>
                   
                    <div className="bg-slate-50 p-6 rounded-xl text-left border border-slate-100 mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Beneficiario</p>
                                <p className="font-bold text-lg text-slate-900">{createdTicket.client_name || createdTicket.clientName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inversión Final</p>
                                <p className="font-bold text-lg text-success-600">{formatCurrency(createdTicket.total)}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200 flex gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success-500" /> {outputFormat === 'basic' ? 'Simple' : 'Completo'}</span>
                             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary-500" /> {new Date().toLocaleDateString('es-MX', {day:'numeric', month:'short'})}</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <PDFDownloadLink 
                            document={<QuotePDF quote={createdTicket} formatType={outputFormat} />} 
                            fileName={formatPdfFileName(createdTicket.client_name || createdTicket.clientName, 'Cotizacion', createdTicket.ticket_number || createdTicket.ticketNumber || 0)}
                            className="h-16 bg-slate-50 hover:bg-primary-600 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"
                        >
                            {() => (
                                <>
                                    <FileText size={18} className="text-primary-600 group-hover:text-white transition-colors" /> 
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-white">PDF</span>
                                </>
                            )}
                        </PDFDownloadLink>

                        <button 
                          onClick={() => {
                              if (!selectedClient?.phone && !clientPhone) return alert("No hay teléfono guardado para WhatsApp");
                              handleWhatsAppSuccess();
                          }}
                          className="h-16 bg-slate-50 hover:bg-success-600 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"
                        >
                             <MessageCircle size={18} className="text-success-600 group-hover:text-white" /> 
                             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-white">WHA</span>
                        </button>

                        <button 
                          onClick={() => setShowEmailModal(true)}
                          className="h-16 bg-slate-50 hover:bg-warning-600 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"
                        >
                             <Mail size={18} className="text-warning-600 group-hover:text-white" /> 
                             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-white">Email</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={handleReset}
                            className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] text-sm uppercase tracking-wider"
                        >
                            Crear Siguiente Servicio
                        </button>
                        <Link to="/" onClick={handleReset} className="block text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors py-2">
                             Finalizar proceso y salir
                        </Link>
                    </div>
                </div>

            </div>
            
            <EmailModal 
              isOpen={showEmailModal} 
              onClose={() => setShowEmailModal(false)}
              defaultEmail={selectedClient?.email || clientEmail || ''}
              ticketNumber={createdTicket.ticket_number || createdTicket.ticketNumber || 0}
            />
          </div>, document.body
        )}

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 px-2">
            <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-100 shadow-sm">
                    <Plus size={20} className="text-primary-600" />
                </span>
                <div>
                   <h1 className="text-xl font-bold text-slate-900">Nuevo Servicio</h1>
                   <p className="text-slate-500 text-xs font-medium mt-0.5">Registro técnico de entrada</p>
                </div>
            </div>

            <button 
                onClick={() => setIsUrgent(!isUrgent)}
                className={`h-9 px-4 rounded-lg border-2 font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-wider ${
                    isUrgent 
                    ? 'bg-danger-600 text-white shadow-md shadow-danger-900/10 border-danger-500' 
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
            >
                {isUrgent ? <AlertTriangle size={14} /> : null}
                {isUrgent ? 'Urgente' : 'Normal'}
            </button>
        </header>

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

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative z-20 mb-6">
            
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                    <span className="w-8 h-8 bg-success-50 rounded-lg flex items-center justify-center">
                         <CheckCircle size={16} className="text-success-600" />
                    </span>
                    Información del Cliente
                    {errors.includes('client') && (
                        <span className="text-[10px] font-bold text-danger-500 bg-danger-50 px-2 py-1 rounded border border-danger-100 uppercase tracking-wider animate-pulse leading-none">
                            Campo Requerido
                        </span>
                    )}
                </h3>
        
                {!showQuickClient && !selectedClient && (
                   <button 
                     onClick={() => setShowQuickClient(true)} 
                     className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:bg-primary-50 transition-all rounded-lg border border-primary-200 flex items-center gap-2"
                   >
                      <Plus size={14} /> Nuevo Cliente
                   </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 relative z-10">
                <div className="flex-1 relative" ref={searchWrapperRef}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Escribe nombre del beneficiario..." 
                        className={`w-full h-10 bg-slate-50 border border-slate-200 rounded-lg p-3 pl-12 text-sm font-bold outline-none transition-all ${
                            errors.includes('client') 
                            ? 'ring-2 ring-danger-500/10 border-danger-300' 
                            : selectedClient 
                                ? 'ring-2 ring-success-500/10 pt-6 pb-2 border-success-300' 
                                : ''
                        }`}
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowSuggestions(true);
                          setSelectedClient(null);
                          if (errors.includes('client')) setErrors(errors.filter(err => err !== 'client'));
                        }}
                        onFocus={() => setShowSuggestions(true)}
                      />
                    {clientSearch && (
                        <button 
                            onClick={handleClearClient} 
                            className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors ${selectedClient ? 'mt-1' : ''}`}
                        >
                            <X size={18} />
                        </button>
                    )}
                    
                    {selectedClient && (
                      <div className="absolute top-1.5 left-12 flex items-center gap-2 text-[9px] font-bold text-success-600 uppercase tracking-widest leading-none">
                         <CheckCircle size={9} /> Cliente Verificado
                      </div>
                    )}

                    {showSuggestions && filteredClients.length > 0 && (
                        <div className="absolute w-full bg-white mt-2 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 border border-slate-200">
                             {filteredClients.map((client: Client) => (
                                <div key={client.id} onClick={() => handleSelectClient(client)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors group">
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">{client.name}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-bold uppercase tracking-wider mt-1">
                                            <Phone size={10} /> {client.phone}
                                        </div>
                                    </div>
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus size={14} className="text-primary-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-[26rem] flex flex-col gap-3 shrink-0 text-slate-900">
                     <PhoneInput
                       value={clientPhone}
                       onChange={setClientPhone}
                       error={errors.includes('phone')}
                     />
                     <div className="grid grid-cols-12 gap-3">
                        <div className="relative col-span-5">
                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                               type="text" 
                               placeholder="Email" 
                               value={clientEmail}
                               onChange={(e) => setClientEmail(e.target.value)}
                               className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-4 pl-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/10" 
                            />
                        </div>
                        <div className="relative col-span-7">
                            <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                               type="text" 
                               placeholder="Modelo y Placas" 
                               value={clientVehicle}
                               onChange={(e) => setClientVehicle(e.target.value)}
                               className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-4 pl-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/10" 
                            />
                        </div>
                     </div>
                </div>
            </div>

            {showQuickClient && !selectedClient && (
               <form onSubmit={handleCreateQuickClient} className="mt-6 p-5 bg-slate-900 text-white rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="md:col-span-4 flex justify-between items-center mb-1 relative z-10">
                     <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest flex items-center gap-2"><UserPlus size={14} /> Alta Rápida de Cliente</span>
                     <button type="button" onClick={() => setShowQuickClient(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 w-6 h-6 rounded-full flex items-center justify-center">
                        <X size={12} />
                     </button>
                  </div>
                  <input required placeholder="Nombre Completo" value={qcName} onChange={e=>setQcName(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 px-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/50 text-white placeholder:text-slate-500 relative z-10 transition-all focus:bg-white/10" />
                  <PhoneInput value={qcPhone} onChange={setQcPhone} placeholder="(644) 203-9334" dark />
                  <input type="email" placeholder="Correo (Opcional)" value={qcEmail} onChange={e=>setQcEmail(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 px-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/50 text-white placeholder:text-slate-500 relative z-10 transition-all focus:bg-white/10" />
                  <button type="submit" className="w-full h-11 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all relative z-10 active:scale-95 shadow-lg shadow-primary-900/50">
                    Guardar y Usar
                  </button>
               </form>
            )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative z-10 mb-6">
             
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                 <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                    <span className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                         <ShoppingCart size={16} className="text-primary-600" />
                    </span>
                     Servicios Realizados
                     {errors.includes('global_items') && (
                        <span className="text-[10px] font-bold text-danger-500 bg-danger-50 px-2 py-1 rounded border border-danger-100 uppercase tracking-wider animate-pulse flex items-center gap-2">
                            <AlertTriangle size={12}/> Agrega Conceptos
                        </span>
                     )}
                 </h3>
                 <div className="flex flex-wrap gap-2">
                     {quickServices.map(service => (
                         <button 
                            key={service}
                            onClick={() => addItem(service)}
                            className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-lg hover:bg-primary-600 hover:text-white transition-all"
                         >
                             + {service}
                         </button>
                     ))}
                 </div>
             </div>

             <div className="space-y-3">
                {items.map((item) => (
                     <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-lg flex flex-col md:flex-row gap-4 items-start group relative overflow-hidden">
                        <div className="w-16 h-16 bg-white rounded-lg relative flex-shrink-0 overflow-hidden border border-slate-200 group/img flex items-center justify-center shadow-sm">
                            {item.image ? (
                                <>
                                    <img src={item.image} alt="Preview" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                                    <label htmlFor={`file-${item.id}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white cursor-pointer transition-all">
                                        <RefreshCw size={20} />
                                    </label>
                                </>
                            ) : (
                                <label htmlFor={`file-${item.id}`} className="w-full h-full flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:text-primary-500 transition-all">
                                    <Plus size={24} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest mt-1">FOTO</span>
                                </label>
                            )}
                            <input type="file" id={`file-${item.id}`} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(item.id, e)} />
                        </div>
                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-7">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                                    Descripción del Concepto {errors.includes(`item_name_${item.id}`) && <span className="text-danger-500">*</span>}
                                </label>
                                <input 
                                   className={`w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-medium outline-none transition-all ${errors.includes(`item_name_${item.id}`) ? 'border-danger-300 bg-danger-50' : ''}`}
                                   placeholder="Ej. Cambio de Aceite Sintético..."
                                   value={item.name} 
                                   onChange={(e) => {
                                       updateItem(item.id, 'name', e.target.value);
                                       if (errors.includes(`item_name_${item.id}`)) setErrors(errors.filter(err => err !== `item_name_${item.id}`));
                                   }} 
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                                    Precio Unitario {errors.includes(`item_price_${item.id}`) && <span className="text-danger-500">*</span>}
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" size={14} />
                                    <input 
                                       type="number" 
                                       className={`w-full h-10 bg-white border border-slate-200 rounded-lg pl-9 pr-3 text-sm font-medium outline-none transition-all ${errors.includes(`item_price_${item.id}`) ? 'border-danger-300 bg-danger-50' : ''}`}
                                        value={item.price || ''} 
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            updateItem(item.id, 'price', isNaN(val) ? 0 : val);
                                            if (errors.includes(`item_price_${item.id}`)) setErrors(errors.filter(err => err !== `item_price_${item.id}`));
                                         }} 
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Cant.</label>
                                    <input 
                                        type="number" 
                                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-center text-sm font-medium outline-none" 
                                        value={item.quantity} 
                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} 
                                    />
                                </div>
                                <button 
                                    onClick={() => removeItem(item.id)} 
                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-all"
                                    title="Eliminar concepto"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
             <div className="flex flex-col sm:flex-row gap-4 mt-4">
                 <button 
                    onClick={() => addItem()} 
                    className="flex-1 h-10 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-all flex justify-center gap-2 items-center text-xs font-bold uppercase tracking-wider group"
                 >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Concepto Abierto
                 </button>
                 <button 
                    onClick={() => setShowInventoryModal(true)} 
                    className="flex-1 h-10 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex justify-center gap-2 items-center text-xs font-bold uppercase tracking-wider group"
                 >
                    <ShoppingCart size={18} className="group-hover:scale-110 transition-transform" /> Catálogo / Refacciones
                 </button>
             </div>
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24 relative z-10">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                 
                 <div className="mb-6">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">Notas Internas / Instrucciones Técnicas</label>
                     <textarea 
                        className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-medium outline-none resize-none transition-all text-slate-700 placeholder:text-slate-300" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="Agrega aquí detalles específicos del servicio, diagnósticos previos o advertencias técnicas..." 
                     />
                 </div>
                 
                 <div>
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">Formato de Cotización / Salida</label>
                     <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select 
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-10 text-[10px] font-bold uppercase tracking-wider outline-none appearance-none cursor-pointer text-slate-700"
                            value={outputFormat}
                            onChange={(e) => setOutputFormat(e.target.value as QuoteFormatType)}
                        >
                            <option value="basic" className="bg-white text-slate-900">📄 Formato Simple (Valor Neto)</option>
                            <option value="payment_info" className="bg-white text-slate-900">📄 Formato Fiscal (+ IVA + Retención)</option>
                            <option value="payment_no_retention" className="bg-white text-slate-900">📄 Formato Comercial (+ IVA No Ret)</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={16} />
                     </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                 
                 <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtotal Neto</span>
                        <span className="font-bold text-lg text-slate-400">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Descuento (%)</span>
                        <input 
                            type="number" 
                            className="w-16 h-8 bg-white border border-slate-200 rounded-md px-2 text-center text-sm font-bold outline-none" 
                            value={discountPercent} 
                            onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} 
                        />
                    </div>
                    
                    <div className="h-px bg-slate-200 mx-1" />

                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base Imponible</span>
                        <span className="font-bold text-xl text-slate-900">{formatCurrency(baseTotal)}</span>
                    </div>
                    
                    <div className="space-y-2 pt-1">
                        {hasIVA && (
                            <div className="flex justify-between items-center px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Impuesto IVA (16%)</span>
                                <span className="text-slate-600">+{formatCurrency(iva)}</span>
                            </div>
                        )}
                        {hasRetencion && (
                            <div className="flex justify-between items-center px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Retención ISR/IVA (1.25%)</span>
                                <span className="text-danger-600">-{formatCurrency(retencion)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-end mt-6 pt-4 border-t border-slate-200 px-1 relative">
                        <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Inversión Final</span>
                            <span className="font-bold text-3xl text-success-600">{formatCurrency(grandTotal)}</span>
                        </div>
                        <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center text-success-600 border border-success-100">
                             <CheckCircle size={20} />
                        </div>
                    </div>
                 </div>
              </div>
         </div>

         <div className="mt-6 flex flex-col items-center justify-center gap-4 pb-16">
             <button 
               onClick={handleSave} 
               disabled={items.length === 0 || !items[0].name.trim() || grandTotal <= 0}
               className="w-full md:w-[360px] h-12 bg-primary-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-primary-500 shadow-lg shadow-primary-900/20 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
             >
                <Save size={20} /> Guardar Servicio
             </button>

             <button 
                onClick={() => setShowResetModal(true)}
                className="h-10 px-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-all border border-slate-200 rounded-lg"
             >
                <RefreshCw size={16} /> Reiniciar Formulario
             </button>
         </div>

         <InfoModal 
            isOpen={showResetModal}
            onClose={() => setShowResetModal(false)}
            onConfirm={handleReset}
            title="¿Reiniciar Formulario?"
            message="Se borrarán todos los datos ingresados en esta orden de servicio. Esta acción no se puede deshacer."
            confirmText="Sí, Reiniciar"
            cancelText="Cancelar"
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