import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Plus, Trash2, Save, X, Phone, Image as ImageIcon, 
  CheckCircle, MessageCircle, FileText, Mail, RefreshCw, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer'; // Importar PDF
import { formatCurrency } from '../utils/format';
import { useTickets, type TicketItem, type Ticket } from '../context/TicketContext';
import { useClients, type Client } from '../context/ClientContext';
import { QuotePDF, type QuoteFormatType } from '../components/QuotePDF'; 
import { EmailModal } from '../components/EmailModal'; 

export const NewTicket = () => {
  const { addTicket } = useTickets();
  const { clients, addClient } = useClients();
  
  // --- Estados del Formulario ---
  const [items, setItems] = useState<TicketItem[]>([
    { id: Date.now(), name: '', price: 0, quantity: 1 }
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

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

  // --- Estado para Modal Email ---
  const [showEmailModal, setShowEmailModal] = useState(false);

  // --- Estado de Formato de Salida ---
  const [outputFormat, setOutputFormat] = useState<QuoteFormatType>('payment_info');

  // Lógica de filtrado
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

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const baseTotal = subtotal - discountAmount;

  const hasIVA = outputFormat === 'payment_info' || outputFormat === 'payment_no_retention';
  const hasRetencion = outputFormat === 'payment_info';

  const iva = hasIVA ? baseTotal * 0.16 : 0;
  const retencion = hasRetencion ? baseTotal * 0.0125 : 0;
  const grandTotal = baseTotal + iva - retencion;

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

  const handleSelectClient = (client: Client) => {
    setClientSearch(client.name);
    setClientPhone(client.phone || '');
    setClientEmail(client.email || '');
    setClientVehicle(''); // Los vehículos no se guardan permanentemente en el CRM actual
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

  const handleSave = () => {
    const finalClientName = selectedClient ? selectedClient.name : clientSearch;
    
    // --- Validaciones Visuales ---
    const newErrors: string[] = [];
    if (!finalClientName.trim()) newErrors.push('client');
    if (items.length === 0) newErrors.push('global_items');
    
    items.forEach(item => {
        if (!item.name.trim()) newErrors.push(`item_name_${item.id}`);
        if (item.price === undefined || item.price === null || item.price < 0 || isNaN(item.price)) newErrors.push(`item_price_${item.id}`);
    });

    if (newErrors.length > 0) {
        setErrors(newErrors);
        // Desplazarse hacia arriba si falta el cliente
        if (newErrors.includes('client')) {
           window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return; 
    }
    
    setErrors([]); // Limpiar errores si todo está bien
    
    const newTicketData = addTicket({
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
      notes: `${notes} ${isUrgent ? '⚠️ URGENTE' : ''}`.trim()
    });

    setCreatedTicket(newTicketData);
    toast.dismiss(); // Limpiar toasts para que no interfieran con el modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setItems([{ id: Date.now(), name: '', price: 0, quantity: 1 }]);
    setClientSearch('');
    setSelectedClient(null);
    setDiscountPercent(0);
    setNotes('');
    setErrors([]);
    setIsUrgent(false);
  };

  const getWhatsAppLink = () => {
    if (!createdTicket || !selectedClient?.phone) return '#';
    const phone = selectedClient.phone.replace(/\D/g,'');
    const message = `Hola ${createdTicket.clientName}, te compartimos el resumen de tu servicio #${createdTicket.ticketNumber} en AutoService.\n\nTotal a pagar: ${formatCurrency(createdTicket.total)}.\n\nGracias por tu preferencia.`;
    return `https://wa.me/521${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleCreateQuickClient = (e: React.FormEvent) => {
     e.preventDefault();
     if(!qcName.trim()) {
        toast.error('El nombre del cliente es requerido.');
        return;
     }
     const newClient = { name: qcName, phone: qcPhone, email: qcEmail, registrationDate: new Date().toISOString() };
     addClient(newClient);
     
     // Set it as selected right away
     setClientSearch(qcName);
     setClientPhone(qcPhone);
     setClientEmail(qcEmail);
     setSelectedClient({ id: Date.now().toString(), ...newClient }); // Autoseleccionar con un ID temporal
     toast.success('Cliente agregado correctamente');
     setShowQuickClient(false);
     
     // Limpiar
     setQcName('');
     setQcPhone('');
     setQcEmail('');
  };


  // =========================================
  // UI PRINCIPAL MODAL + TABLA
  // =========================================
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans relative">
        
        {/* MODAL ÉXITO */}
        {createdTicket && (
          <div className="fixed -inset-20 bg-slate-900/95 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
                
                <div className="bg-emerald-500 p-6 text-center relative">
                   <button 
                     onClick={handleReset}
                     className="absolute right-4 top-4 text-emerald-200 hover:text-white transition-colors"
                   >
                     <X size={24} />
                   </button>
                   <CheckCircle size={48} className="text-white mx-auto mb-3" />
                   <h2 className="text-2xl font-black text-white">¡Servicio #{createdTicket.ticketNumber} Creado!</h2>
                   <p className="text-emerald-100 font-medium mt-1 italic line-clamp-1">"{createdTicket.clientName}"</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Info Card Rápida */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                                {createdTicket.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Total del Servicio</p>
                                <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(createdTicket.total)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Formato</p>
                           <p className="text-xs font-bold text-slate-600 uppercase">
                              {outputFormat === 'basic' ? 'Simple' : 'Completo'}
                           </p>
                        </div>
                    </div>
                    
                    {/* Botones de Acción */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <PDFDownloadLink 
                            document={<QuotePDF quote={createdTicket} formatType={outputFormat} />} 
                            fileName={`Servicio-${createdTicket.ticketNumber}.pdf`}
                            className="bg-white hover:bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md font-bold group"
                        >
                            {({ loading }) => (
                                <>
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                       <FileText size={20} /> 
                                    </div>
                                    <span className="text-xs text-center leading-tight">{loading ? 'Cargando..' : 'Bajar PDF'}</span>
                                </>
                            )}
                        </PDFDownloadLink>

                        <button 
                          onClick={() => {
                              if (!selectedClient?.phone) return alert("Este cliente no tiene un teléfono guardado para WhatsApp");
                              window.open(getWhatsAppLink(), '_blank');
                          }}
                          className={`${selectedClient?.phone ? 'bg-white hover:bg-green-50 text-green-600 border border-green-100 shadow-sm' : 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed opacity-60'} p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md font-bold group`}
                        >
                            <div className={`w-10 h-10 ${selectedClient?.phone ? 'bg-green-100' : 'bg-gray-200'} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                               <MessageCircle size={20} /> 
                            </div>
                            <span className="text-xs text-center leading-tight">WhatsApp</span>
                        </button>

                        <button 
                          onClick={() => setShowEmailModal(true)}
                          className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md font-bold group"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Mail size={20} /> 
                            </div>
                            <span className="text-xs text-center leading-tight">Enviar Email</span>
                        </button>
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-2">
                        <button 
                            onClick={handleReset}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95"
                        >
                            Crear Nuevo Servicio
                        </button>
                        <Link to="/" className="w-full text-center py-2 text-sm text-slate-500 font-medium hover:text-slate-900 transition-colors">
                            Cerrar y ver el Dashboard
                        </Link>
                    </div>
                </div>

            </div>
            
            {/* Modal de Correo Encadenado */}
            <EmailModal 
              isOpen={showEmailModal} 
              onClose={() => setShowEmailModal(false)}
              defaultEmail={selectedClient?.email || ''}
              ticketNumber={createdTicket.ticketNumber}
            />
          </div>
        )}

        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            Nuevo Servicio
            <button 
                onClick={() => setIsUrgent(!isUrgent)}
                className={`text-sm px-4 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${
                    isUrgent 
                    ? 'bg-red-50 border-red-200 text-red-600 shadow-sm shadow-red-100' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-slate-700'
                }`}
            >
                <AlertTriangle size={14} /> {isUrgent ? 'Urgente' : 'Normal'}
            </button>
        </h1>
        
        {/* BUSCADOR Y REGISTRO RAPIDO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative z-20">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    Información del Cliente / Beneficiario
                    {errors.includes('client') && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1"><AlertTriangle size={12}/> Requerido</span>}
                </h3>
        
                {!showQuickClient && !selectedClient && (
                   <button onClick={() => setShowQuickClient(true)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                      <Plus size={12} /> Nuevo Cliente Rápido
                   </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative" ref={searchWrapperRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente existente o escribir uno nuevo..." 
                    className={`w-full border ${errors.includes('client') ? 'border-red-400 bg-red-50 text-red-900 focus:border-red-500' : selectedClient ? 'border-green-500 bg-green-50 text-green-900 font-medium pb-2 pt-6' : 'border-gray-300 focus:border-slate-800'} rounded-lg p-3 pl-10 text-sm outline-none transition-colors`}
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
                    <button onClick={handleClearClient} className={`absolute right-3 top-3 text-gray-400 hover:text-gray-600 ${selectedClient ? 'mt-2' : ''}`}><X size={16} /></button>
                )}
                
                {/* Confirmación Visual de Cliente Seleccionado */}
                {selectedClient && (
                  <div className="absolute top-1.5 left-10 flex items-center gap-1 text-[10px] font-bold text-green-700 uppercase tracking-widest bg-green-100/80 px-1.5 rounded-sm">
                     <CheckCircle size={10} className="text-green-600" /> Cliente Verificado
                  </div>
                )}
                {showSuggestions && filteredClients.length > 0 && (
                <div className="absolute w-full bg-white mt-2 border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                    {filteredClients.map(client => (
                    <div key={client.id} onClick={() => handleSelectClient(client)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-800">{client.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {client.phone}</div>
                        </div>
                    </div>
                    ))}
                </div>
                )}
              </div>
            </div>
            {/* Datos adicionales requeridos */}
            <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                 <input 
                   type="text" 
                   placeholder="Teléfono (Opcional)" 
                   value={clientPhone}
                   onChange={(e) => setClientPhone(e.target.value)}
                   className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-slate-800" 
                 />
                 <input 
                   type="text" 
                   placeholder="Email (Opcional)" 
                   value={clientEmail}
                   onChange={(e) => setClientEmail(e.target.value)}
                   className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-slate-800" 
                 />
                 <input 
                   type="text" 
                   placeholder="Vehículo (Ej. Aveo 2020 Rojo)" 
                   value={clientVehicle}
                   onChange={(e) => setClientVehicle(e.target.value)}
                   className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-slate-800" 
                 />
            </div>
            </div>

            {/* FORMULARIO QUICK CLIENT IN-PLACE */}
            {showQuickClient && !selectedClient && (
               <form onSubmit={handleCreateQuickClient} className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 animate-in slide-in-from-top-2">
                  <div className="md:col-span-4 flex justify-between items-center mb-1">
                     <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">Creación Rápida</span>
                     <button type="button" onClick={() => setShowQuickClient(false)} className="text-gray-400 hover:text-slate-700"><X size={14}/></button>
                  </div>
                  <input required placeholder="Nombre Completo" value={qcName} onChange={e=>setQcName(e.target.value)} className="w-full border p-2 rounded text-sm outline-none" />
                  <input required placeholder="Teléfono" value={qcPhone} onChange={e=>setQcPhone(e.target.value)} className="w-full border p-2 rounded text-sm outline-none" />
                  <input type="email" placeholder="Correo (Opcional)" value={qcEmail} onChange={e=>setQcEmail(e.target.value)} className="w-full border p-2 rounded text-sm outline-none" />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm">Guardar y Usar</button>
               </form>
            )}
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
                                        <RefreshCw size={20} />
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
                         className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-slate-800 bg-gray-50 bg-white"
                         value={outputFormat}
                         onChange={(e) => setOutputFormat(e.target.value as QuoteFormatType)}
                     >
                         <option value="basic">📄 Formato Simple (Neto sin Impuestos)</option>
                         <option value="payment_info">📄 Formato Completo (+ IVA y Retención)</option>
                         <option value="payment_no_retention">📄 Formato sin Retención (+ IVA solo)</option>
                     </select>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-end">
                 <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                 <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                     <span className="text-sm text-gray-500">Descuento (%)</span>
                     <input type="number" className="w-16 border border-gray-300 bg-white rounded p-1 text-right text-sm outline-none focus:border-slate-800" value={discountPercent} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
                 </div>
                 <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-800">Neto</span><span className="font-bold">{formatCurrency(baseTotal)}</span></div>
                 
                 {hasIVA && (
                     <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                         <span>IVA (16%)</span>
                         <span>{formatCurrency(iva)}</span>
                     </div>
                 )}
                 {hasRetencion && (
                     <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                         <span>Retención (1.25%)</span>
                         <span className="text-red-500">-{formatCurrency(retencion)}</span>
                     </div>
                 )}

                 <div className="flex justify-between items-end mt-2 pt-4 border-t border-gray-200">
                     <span className="font-bold text-xl text-slate-800">Total a Pagar</span>
                     <span className="font-bold text-3xl text-slate-900">{formatCurrency(grandTotal)}</span>
                 </div>
              </div>
         </div>

         {/* BOTON CREAR */}
         <div className="mt-12 flex flex-col items-center justify-center gap-6 pb-24">
             <button 
               onClick={handleSave} 
               disabled={items.length === 0 || !items[0].name.trim() || grandTotal <= 0}
               className="w-full md:w-80 bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
             >
               <Save size={22} /> Guardar Servicio
             </button>

             <button 
                onClick={handleReset}
                className="text-slate-400 hover:text-red-500 font-bold transition-colors text-sm flex items-center gap-2"
             >
                <RefreshCw size={14} /> Limpiar todo y empezar de nuevo
             </button>
         </div>
    </div>
  );
};