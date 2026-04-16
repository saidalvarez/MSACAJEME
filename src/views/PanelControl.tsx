import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Search, Plus, FileText,
  CheckCircle, RefreshCw, Trash2, ChevronLeft, ChevronRight, Download, Edit2, Mail, Clock, X, DollarSign
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { formatCurrency, formatPdfFileName } from '../utils/format';
import { QuotePDF } from '../components/QuotePDF';
import { DangerModal } from '../components/DangerModal';
import { InfoModal } from '../components/InfoModal';
import { EmailModal } from '../components/EmailModal';
import { sendWhatsAppNotification, formatTicketMessage } from '../utils/notifications';
import { useStore } from '../store/useStore';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { VehicleHistoryModal } from '../components/VehicleHistoryModal';

const WhatsAppIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M11.994 2a10.026 10.026 0 0 0-8.544 15.26L2 22l4.872-1.278A10.022 10.022 0 1 0 11.994 2zM12 20.25c-1.487 0-2.923-.393-4.184-1.139l-.3-.178-3.111.815.832-3.033-.195-.31A8.254 8.254 0 1 1 12 20.25z"/>
  </svg>
);

// --- COMPONENTE DE TARJETA INDIVIDUAL ---
// @ts-ignore
const ServiceCard = memo(({ ticket, handleDelete, handleToggleStatus, handleZoom, removePendingTicket, isToday = true }: { ticket: any, handleDelete: (id: string) => void, handleToggleStatus: (id: string, currentStatus: string) => void, handleZoom: (img: string) => void, removePendingTicket: (id: string) => void, isToday?: boolean }) => {
    const format = ticket.format_type || ticket.formatType || 'payment_info';
    const [isGenerating, setIsGenerating] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    const handleWhatsApp = useCallback(async () => {
        // Descargar PDF automáticamente antes de abrir WhatsApp
        try {
            setIsGenerating(true);
            const document = <QuotePDF quote={ticket} formatType={format} />;
            const blob = await pdf(document).toBlob();
            const filename = formatPdfFileName(ticket.client_name || ticket.clientName, 'Cotizacion', ticket.ticket_number || ticket.ticketNumber || 0);
            
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const buffer = await blob.arrayBuffer();
                const bytes = Array.from(new Uint8Array(buffer));
                await invoke('save_pdf_to_desktop', { bytes, filename });
            } catch (e) {
                console.error("Fallo al guardar nativamente, usando fallback", e);
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
            toast.success("PDF descargado. Adjúntalo en el chat de WhatsApp.", { duration: 4000 });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar PDF.");
        } finally {
            setIsGenerating(false);
        }

        // Raphael: Surgical calculation for the Platinum WhatsApp message
        const items = ticket.items || [];
        const subtotalRaw = items.reduce((acc: number, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0);
        const discount = Number(ticket.discount || 0);
        const subtotal = subtotalRaw * (1 - (discount / 100));
        
        const hasIVA = format !== 'basic';
        const iva = hasIVA ? subtotal * 0.16 : 0;
        const retencion = (format === 'payment_info') ? subtotal * 0.0125 : 0;

        const message = formatTicketMessage(
            ticket.client_name || ticket.clientName,
            ticket.ticket_number || ticket.ticketNumber,
            ticket.status,
            ticket.total,
            items,
            subtotalRaw,
            iva,
            retencion,
            discount
        );
        // Pequeño delay para asegurar que el PDF comience a descargarse antes de cambiar de pestaña
        setTimeout(() => {
            sendWhatsAppNotification(ticket.client_phone || ticket.clientPhone || '', message);
        }, 1000);
    }, [ticket, format]);

    const handleEmail = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setShowEmailModal(true);
    }, []);

    const handleDownload = useCallback(async () => {
        try {
            setIsGenerating(true);
            const document = <QuotePDF quote={ticket} formatType={format} />;
            const blob = await pdf(document).toBlob();
            const filename = formatPdfFileName(ticket.client_name || ticket.clientName, 'Cotizacion', ticket.ticket_number || ticket.ticketNumber || 0);
            
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const buffer = await blob.arrayBuffer();
                const bytes = Array.from(new Uint8Array(buffer));
                const savedPath = await invoke('save_pdf_to_desktop', { bytes, filename });
                toast.success(`Ruta: ${savedPath}`, { duration: 5000 });
            } catch (e) {
                console.error("Fallo al guardar nativamente, usando fallback", e);
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al intentar generar la cotización.");
        } finally {
            setIsGenerating(false);
        }
    }, [ticket, format]);

    const formatLabels: Record<string, string> = {
        'payment_info': 'FISCAL (IVA+RET)',
        'payment_no_retention': 'COMERCIAL (IVA)',
        'basic': 'SIMPLE (NETO)'
    };

    if (!isToday) {
        const isArchived = ticket.is_archived || ticket.isArchived || ticket.status === 'archived';
        return (
            <div className={`bg-white p-3 md:p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 min-h-[4rem] group ${isArchived ? 'opacity-80' : ''}`}>
                <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
                    <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0">
                        #{ticket.ticket_number || ticket.ticketNumber}
                    </span>
                    <h4 className="font-bold text-sm text-slate-800 truncate pr-2 max-w-[200px] shrink-0">
                        {ticket.client_name || ticket.clientName}
                    </h4>
                    
                    <div className="hidden sm:flex items-center gap-2 overflow-hidden flex-1">
                        <span className="text-[11px] text-slate-400 shrink-0">📋</span>
                        <span className="text-[11px] font-medium text-slate-500 truncate">
                            {ticket.items?.map((item: any) => item.name).join(' • ')}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    <span className="text-sm font-black tracking-tight text-emerald-600 block">
                        {formatCurrency(ticket.total)}
                    </span>
                    {isArchived ? (
                         <span className="bg-slate-800 text-white border-slate-900 border text-[9px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1.5 leading-none tracking-widest">
                             📁 Bitácora
                         </span>
                    ) : (
                         <span className="bg-warning-50 text-warning-600 border-warning-200 border text-[9px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1.5 leading-none tracking-widest shadow-sm">
                             ⏳ Pendiente
                         </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${
          ticket.status === 'completed' ? 'opacity-[0.85]' : ''
        }`}>

            <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                
                {/* LEFT: Info & Photo */}
                <div className="flex-1 flex gap-5">
                    {(ticket.service_photo || ticket.servicePhoto) && (
                      <div 
                        onClick={() => handleZoom(ticket.service_photo || ticket.servicePhoto)}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative group/zoom cursor-zoom-in shrink-0 flex items-center justify-center transition-all"
                      >
                        <img 
                          src={ticket.service_photo || ticket.servicePhoto} 
                          alt="Registro" 
                          className="w-full h-full object-cover transition-all duration-700 group-hover/zoom:scale-110" 
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/zoom:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                            <Plus size={20} className="text-white" strokeWidth={2} />
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                             <span className="bg-primary-50 text-primary-600 text-[10px] font-bold px-2 py-0.5 rounded border border-primary-100 leading-none">
                                #{ticket.ticket_number || ticket.ticketNumber}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase text-slate-400 leading-none">
                                <Clock size={10} />
                                {new Date(ticket.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} • {new Date(ticket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>

                        <h4 className="font-bold text-lg text-slate-800 mb-3 truncate">
                            {ticket.client_name || ticket.clientName}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {ticket.status === 'completed' ? (
                                <span className="bg-success-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1.5 leading-none">
                                    <CheckCircle size={10} strokeWidth={2.5} /> COMPLETO
                                </span>
                            ) : (
                                <span className="bg-warning-50 text-warning-600 text-[10px] uppercase font-bold px-2 py-1 rounded border border-warning-200 shadow-sm flex items-center gap-1.5 leading-none">
                                    <RefreshCw size={10} className="animate-[spin_3s_linear_infinite]" strokeWidth={2.5} /> EN PROCESO
                                </span>
                            )}
                            
                            <span className="bg-indigo-50 text-indigo-500 border border-indigo-100 px-2 py-1 rounded text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm leading-none">
                                <FileText size={10} />
                                PDF: {formatLabels[format] || format}
                            </span>

                            {ticket._isOffline && (
                                <span 
                                  title={ticket.lastError || 'Sincronizando con el servidor...'}
                                  className="bg-orange-500 text-white text-[9px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1.5 leading-none animate-pulse cursor-help"
                                >
                                    <Clock size={10} /> {ticket.lastError ? 'REINTENTANDO' : 'SINCRONIZANDO'}
                                </span>
                            )}

                            {(ticket.client_phone || ticket.clientPhone) && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded leading-none">{ticket.client_phone || ticket.clientPhone}</span>
                            )}
                        </div>

                        <div className="text-xs font-semibold text-slate-600 mt-2 bg-slate-50 border border-slate-100/50 p-2 rounded-lg flex items-start gap-2 max-w-md">
                            <span className="text-slate-400 shrink-0">📋</span>
                            <span className="line-clamp-2 leading-relaxed">{ticket.items?.map((item: any) => item.name).join(' • ')}</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Price & Actions */}
                <div className="flex flex-col md:items-end justify-between self-stretch gap-4">
                    <div className="text-left md:text-right mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1 leading-none">Inversión Final</span>
                        
                        {/* Financial Breakdown (Surgical Detail) */}
                        {format !== 'basic' && (
                            <div className="flex flex-col mb-1.5 gap-0.5">
                                <span className="text-[9px] font-bold text-slate-400">NETO {formatCurrency(ticket.items?.reduce((acc: number, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0) * (1 - (Number(ticket.discount || 0) / 100)))}</span>
                                <span className="text-[9px] font-bold text-indigo-400">
                                    {format === 'payment_info' ? '+ IVA - RET' : '+ IVA'}
                                </span>
                            </div>
                        )}

                        <span className="text-2xl font-black tracking-tighter leading-none text-emerald-600">
                            {formatCurrency(ticket.total)}
                        </span>
                    </div>

                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden divide-x divide-slate-100">
                        <button onClick={handleDownload} disabled={isGenerating} className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-primary-600 transition-colors bg-slate-50/50" title="Descargar PDF">
                            {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                        <button onClick={handleWhatsApp} className="flex-1 px-3 py-2 text-slate-500 hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors flex justify-center items-center bg-slate-50/50" title="WhatsApp Business">
                            <WhatsAppIcon size={14} />
                        </button>
                        <button onClick={handleEmail} className="flex-1 px-3 py-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors flex justify-center items-center bg-slate-50/50" title="Email">
                            <Mail size={14} />
                        </button>
                        <Link to={`/editar/${ticket.id}`} className="px-3 py-2 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors flex justify-center items-center bg-slate-50/50" title="Editar">
                            <Edit2 size={14} />
                        </Link>
                        <button 
                            onClick={() => handleToggleStatus(ticket.id, ticket.status)} 
                            className={`px-3 py-2 transition-colors flex justify-center items-center ${ticket.status === 'completed' ? 'text-success-600 bg-success-50 hover:bg-success-100' : 'text-slate-500 hover:bg-slate-50 hover:text-success-600 bg-slate-50/50'}`} 
                            title="Cambiar Estado"
                        >
                            <CheckCircle size={14} />
                        </button>
                        <button 
                            onClick={() => ticket._isOffline ? removePendingTicket(ticket.id) : handleDelete(ticket.id)} 
                            className="px-3 py-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600 transition-colors flex justify-center items-center bg-slate-50/50" 
                            title={ticket._isOffline ? "Descartar Ticket Atorado" : "Eliminar Registro"}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {ticket.notes && (
                <div className="mt-8 pt-6 border-t border-slate-100 text-sm italic text-slate-500 flex items-start gap-4">
                    <span className="bg-warning-50 text-warning-600 px-2 py-0.5 rounded border border-warning-100 font-bold text-xs leading-none">Nota Interna</span>
                    "{ticket.notes}"
                </div>
            )}

            {ticket.lastError && (
                <div className="mt-4 p-3 bg-danger-50 border border-danger-100 rounded-lg flex items-start gap-3">
                    <div className="bg-danger-600 text-white rounded-full p-1 mt-0.5">
                        <X size={10} strokeWidth={3} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-danger-700 leading-none mb-1">Error de Sincronización</p>
                        <p className="text-[11px] text-danger-600 font-medium leading-tight">{ticket.lastError}</p>
                    </div>
                </div>
            )}

            <EmailModal 
              isOpen={showEmailModal} 
              onClose={() => setShowEmailModal(false)}
              defaultEmail={ticket.client_email || ticket.clientEmail}
              ticketNumber={ticket.ticket_number || ticket.ticketNumber}
              ticket={ticket}
              formatType={format}
            />
        </div>
    );
});

export const PanelControl = () => {
  const { tickets, expenses, sales, pendingTickets, loadExpenses, loadSales, deleteTicket, updateTicketStatus, archiveTicketsByDate, removePendingTicket } = useStore();
  
  const [pastTickets, setPastTickets] = useState<any[]>([]);
  const [pastSales, setPastSales] = useState<any[]>([]);
  const [pastExpenses, setPastExpenses] = useState<any[]>([]);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  const allTickets = useMemo(() => {
    // Combine synced and pending tickets so they all appear in the same dashboard
    const pendingWithStatus = (pendingTickets || []).map((t: any) => ({ ...t, status: 'pending', _isOffline: true }));
    const combined = [...pendingWithStatus, ...tickets, ...pastTickets];
    // Surgical duplicate removal by ID (fundamental for history/active overlap)
    return Array.from(new Map(combined.map(item => [item.id, item])).values());
  }, [tickets, pastTickets, pendingTickets]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed'>('pending');
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [ticketToToggle, setTicketToToggle] = useState<{id: string, currentStatus: string} | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [showCorteModal, setShowCorteModal] = useState(false);
  const [showExpedientModal, setShowExpedientModal] = useState(false);
  const [corteCount, setCorteCount] = useState(0);

  const [animationParent] = useAutoAnimate();

  // Local Timezone Day Logic (Arizona MST)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  // Carga inicial de métricas financieras
  useEffect(() => {
    loadExpenses();
    loadSales();
  }, [loadExpenses, loadSales]);

  const loadHistory = useCallback(async () => {
    setIsLoadingPast(true);
    try {
        const { dataAdapter } = await import('../services/dataAdapter');
        const [resTickets, resSales, resExp] = await Promise.all([
          dataAdapter.getHistorial(1, 100, '', selectedDate, selectedDate),
          dataAdapter.getSales({ date: selectedDate, includeArchived: true }),
          dataAdapter.getExpenses({ date: selectedDate, includeArchived: true })
        ]);
        
        setPastTickets(resTickets.rows || []);
        setPastSales(resSales || []);
        setPastExpenses(resExp || []);
    } catch (e) {
        console.error("Error loading historical data:", e);
    } finally {
        setIsLoadingPast(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Date bounds for a single day
  const getStartOfDay = (dateString: string) => new Date(`${dateString}T00:00:00`);
  const getEndOfDay = (dateString: string) => new Date(`${dateString}T23:59:59`);

  const changeDate = (days: number) => {
    const dateObj = new Date(selectedDate);
    dateObj.setDate(dateObj.getDate() + days);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const getDayLabel = () => {
    if (selectedDate === today) return "Tickets de hoy";
    
    const d = new Date(`${selectedDate}T12:00:00`);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return `Tickets del ${d.toLocaleDateString('es-MX', options)}`;
  };

  const filteredTickets = useMemo(() => {
    const source = allTickets;
    return source.filter((t: any) => {
      // 1. Date filter
      const ticketDate = new Date(t.date);
      const start = getStartOfDay(selectedDate);
      const end = getEndOfDay(selectedDate);
      
      // Today: ALL active (non-archived) tickets belong to today. Past days require strict date match.
      const isWithinDates = isToday 
        ? true
        : (ticketDate >= start && ticketDate <= end);

      // 2. Search term filter
      const searchLower = searchTerm.toLowerCase();
      const matchName = (t.client_name || t.clientName || '').toLowerCase().includes(searchLower);
      const matchPhone = (t.client_phone || t.clientPhone || '').toLowerCase().includes(searchLower);
      const matchNotes = (t.notes || '').toLowerCase().includes(searchLower);
      const matchServices = Array.isArray(t.items) && t.items.some((item: any) => item.name.toLowerCase().includes(searchLower));

      const matchesSearch = matchName || matchPhone || matchNotes || matchServices;
      
      // Today: filter by status tab; Past days: show all statuses
      const matchesStatus = isToday ? t.status === filterStatus : true;
      
      // 3. Archive filter (today: only unarchived. past days: both archived and unarchived)
      const isActuallyArchived = t.is_archived || t.isArchived || t.status === 'archived';
      const archiveCondition = isToday ? !isActuallyArchived : true;

      return isWithinDates && matchesSearch && matchesStatus && archiveCondition;
    });
  }, [allTickets, selectedDate, searchTerm, filterStatus, isToday]);


  // Financial Summaries based on selected date
  const dailyIncome = useMemo(() => {
    // Para el cálculo de ingresos, usamos tanto lo activo como lo archivado (historial) del día
    // Esto evita que el contador 'baje' al hacer el corte de día.
    const allEconomicActivity = [...sales, ...allTickets, ...pastSales];
    
    // Eliminamos duplicados por ID (por si acaso un ticket está en tickets y pastTickets al mismo tiempo)
    const uniqueActivity = Array.from(new Map(allEconomicActivity.map(item => [item.id, item])).values());

    return uniqueActivity.filter((t: any) => {
      const tDate = new Date(t.date || t.created_at || new Date());
      const start = getStartOfDay(selectedDate);
      const end = getEndOfDay(selectedDate);
      
      const isWithinSelectedDay = (tDate >= start && tDate <= end);
      if (!isWithinSelectedDay) return false;

      // Logic for Tickets (active or archived)
      if (t.ticket_number || t.ticketNumber) {
        return t.status === 'completed' || t.status === 'archived' || t.is_archived || t.isArchived;
      } 
      
      // Logic for Sales (assume all sales are income)
      return true;
    }).reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0);
  }, [sales, allTickets, pastSales, selectedDate]);

  const totalExpenses = useMemo(() => {
    const allExpPossible = [...expenses, ...pastExpenses];
    const uniqueExpenses = Array.from(new Map(allExpPossible.map(item => [item.id, item])).values());

    return uniqueExpenses
      .filter((exp: any) => {
        const expDate = new Date(exp.date);
        const start = getStartOfDay(selectedDate);
        const end = getEndOfDay(selectedDate);
        const isWithinSelectedDay = (expDate >= start && expDate <= end);
        return exp.type === 'expense' && isWithinSelectedDay;
      })
      .reduce((acc: number, exp: any) => acc + Number(exp.amount || 0), 0);
  }, [expenses, pastExpenses, selectedDate]);

  const completedCount = useMemo(() => {
    return allTickets.filter((t: any) => {
        const tDate = new Date(t.date || t.created_at || new Date());
        const start = getStartOfDay(selectedDate);
        const end = getEndOfDay(selectedDate);
        const isWithinSelectedDay = (tDate >= start && tDate <= end);
        const isClosed = t.status === 'completed' || t.status === 'archived' || t.is_archived || t.isArchived;
        
        return isClosed && isWithinSelectedDay;
    }).length;
  }, [allTickets, selectedDate]);

  const totalNet = dailyIncome - totalExpenses;

  const handleCorteDeDia = useCallback(() => {
    const completedLocalCount = tickets.filter((t: any) => {
      const tDate = new Date(t.date);
      const start = getStartOfDay(selectedDate);
      const end = getEndOfDay(selectedDate);
      const isActuallyArchived = t.is_archived || t.isArchived || t.status === 'archived';
      const isWithinSelectedDay = isToday ? !isActuallyArchived : (tDate >= start && tDate <= end);
      return t.status === 'completed' && isWithinSelectedDay;
    }).length;

    if (completedLocalCount === 0) {
      toast.error('No hay servicios completados pendientes de corte para este día.');
      return;
    }

    setCorteCount(completedLocalCount);
    setShowCorteModal(true);
  }, [tickets, selectedDate, isToday]);

  const confirmCorte = useCallback(async () => {
    await archiveTicketsByDate(selectedDate);
    // Raphael: Sincronización inmediata del historial para mantener la integridad de la caja
    await loadHistory();
    toast.success('Corte de día realizado correctamente.', { icon: '✅' });
    setShowCorteModal(false);
  }, [selectedDate, archiveTicketsByDate, loadHistory]);

  const handleDelete = useCallback((id: string) => {
    setTicketToDelete(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (ticketToDelete) {
      deleteTicket(ticketToDelete);
      toast.success('Servicio eliminado permanente', { icon: '🗑️' });
      setTicketToDelete(null);
    }
  }, [ticketToDelete, deleteTicket]);

  const handleToggleStatus = useCallback((id: string, currentStatus: string) => {
    setTicketToToggle({ id, currentStatus });
  }, []);

  const confirmToggleStatus = useCallback(() => {
    if (ticketToToggle) {
      const nextStatus = ticketToToggle.currentStatus === 'completed' ? 'pending' : 'completed';
      updateTicketStatus(ticketToToggle.id, nextStatus as 'pending' | 'completed');
      toast.success(nextStatus === 'completed' ? 'Servicio completado' : 'Servicio marcado como pendiente', { icon: '🔄' });
      setTicketToToggle(null);
    }
  }, [ticketToToggle, updateTicketStatus]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-page-enter">
      
      <Breadcrumbs />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 px-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
            <span className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-100">
                 <FileText className="text-primary-600" size={24} />
            </span> 
            {getDayLabel()}
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-2 ml-16">Sistema Gestor • Taller MSA v1.2.3</p>
        </div>
        
        <div className="flex gap-3">
            <button 
              onClick={handleCorteDeDia}
              className="h-12 px-6 bg-success-600 hover:bg-success-500 text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md shadow-success-900/10"
            >
              <RefreshCw size={18} /> Corte de Día
            </button>
            <Link 
              to="/nuevo" 
              className="h-12 px-6 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md"
            >
              <Plus size={20} /> Nuevo Servicio
            </Link>
        </div>
      </header>

      <div className="divider-fade opacity-30" />

      {/* --- FILTROS Y NAVEGACIÓN --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Navegador de Días */}
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
            <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => changeDate(-1)} 
                    className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-md transition-all flex items-center"
                >
                    <ChevronLeft size={18} />
                </button>
                <input 
                    type="date"
                    className="bg-transparent border-none outline-none font-medium text-slate-800 text-sm text-center w-[130px] px-2 cursor-pointer"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button 
                    onClick={() => changeDate(1)} 
                    className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-md transition-all flex items-center"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <button 
                onClick={() => { setSelectedDate(today); setSearchTerm(''); }} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm flex justify-center items-center gap-2 transition-colors font-medium border border-slate-200"
            >
                <RefreshCw size={16} /> Ir a Hoy
            </button>
        </div>

        {/* Buscador y Herramientas */}
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full lg:max-w-xl">
            <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por cliente, servicio, nota..." 
                    className="w-full h-11 border border-slate-200 rounded-lg p-2.5 pl-9 text-sm focus:border-slate-400 outline-none transition-colors bg-slate-50 focus:bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button 
                onClick={() => setShowExpedientModal(true)}
                className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-md group"
            >
                <Clock size={16} className="group-hover:rotate-[-45deg] transition-transform" /> Expediente
            </button>
        </div>
      </div>

      {/* --- KPIs (Light Mode Refined) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500 relative group">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1"></span> En Proceso
              <InfoTooltip content="Servicios actualmente activos en el taller que no han sido marcados como completados." />
            </h3>
             <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {tickets.filter((t: any) => t.status === 'pending' && (!t.is_archived && !t.isArchived)).length}
              </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500 relative group">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              Terminados
              <InfoTooltip content="Servicios finalizados el día seleccionado que están listos para ser entregados o cobrados." />
            </h3>
             <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {completedCount}
              </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500 relative group">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              Ingresos del Día
              <InfoTooltip content="Dinero cobrado hoy a través de Ventas Directas o Servicios Finalizados." />
            </h3>
            <p className="text-xl md:text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(dailyIncome)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-slate-700 relative group">
            <div className="flex flex-col h-full justify-between relative z-10">
               <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1">
                      Utilidad Neta
                      <InfoTooltip content="Ingresos del Día menos los Gastos o Egresos registrados el día de hoy." />
                    </h3>
                    <p className={`text-xl md:text-2xl font-black tracking-tight ${totalNet >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {formatCurrency(totalNet)}
                    </p>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${totalNet >= 0 ? 'bg-success-50 border-success-100 text-success-600' : 'bg-danger-50 border-danger-100 text-danger-600'}`}>
                    <DollarSign size={18} />
                  </div>
               </div>
               <div className="pt-2 border-t border-slate-100 flex justify-between items-center mt-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Egresos / Gastos</span>
                  <span className="text-xs font-black text-danger-500">{formatCurrency(totalExpenses)}</span>
               </div>
            </div>
        </div>
      </div>

      <div className="divider-fade opacity-30" />

      {/* --- LISTADO --- */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {isToday ? 'Listado de Servicios' : `Historial del ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`}
            </h2>
            
            {isToday ? (
              <div className="flex items-center bg-slate-200 p-1 rounded-lg">
                <button 
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'pending' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pendientes
                </button>
                <button 
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'completed' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Completados
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                {isLoadingPast && <RefreshCw size={12} className="animate-spin" />}
                📋 {filteredTickets.length} servicio{filteredTickets.length !== 1 ? 's' : ''} registrado{filteredTickets.length !== 1 ? 's' : ''}
              </span>
            )}
        </div>
 
        <div className="space-y-4" ref={animationParent}>
            {filteredTickets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800">No hay servicios encontrados</h3>
                    <p className="text-slate-500 mb-6">Intenta cambiar los filtros o crea uno nuevo.</p>
                </div>
            ) : (
                filteredTickets.map((ticket: any) => (
                    <ServiceCard 
                        key={ticket.id} 
                        ticket={ticket} 
                        handleDelete={handleDelete} 
                        handleToggleStatus={handleToggleStatus}
                        handleZoom={setZoomedImage}
                        removePendingTicket={removePendingTicket}
                        isToday={isToday}
                    />
                ))
            )}
        </div>
      </div>

      <DangerModal
        isOpen={showCorteModal}
        onClose={() => setShowCorteModal(false)}
        onConfirm={confirmCorte}
        title="Corte de Día"
        message={`¿Estás seguro de hacer el corte de día? ${corteCount} servicios completados se enviarán al historial.`}
        confirmText="HACER CORTE"
      />

      {/* Danger Modal (Delete Ticket) */}
      <DangerModal
        isOpen={!!ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Servicio"
        message="¿Estás completamente seguro de querer eliminar este ticket? Toda la información de venta o servicio se perderá de la base de datos."
      />

      <InfoModal
        isOpen={!!ticketToToggle}
        onClose={() => setTicketToToggle(null)}
        onConfirm={confirmToggleStatus}
        confirmText="Sí, cambiar"
        cancelText="No, cancelar"
        type={ticketToToggle?.currentStatus === 'completed' ? 'warning' : 'success'}
        title={ticketToToggle?.currentStatus === 'completed' ? "Marcar como Pendiente" : "Finalizar Servicio"}
          message={ticketToToggle?.currentStatus === 'completed' 
          ? "¿Deseas regresar este servicio a estado pendiente?" 
          : "¿Estás seguro de finalizar este servicio? Esto lo sumará a los ingresos del día."}
      />

      {/* Zoom Modal */}
      {zoomedImage && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-[#0a1428]/90 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-8 right-8 bg-white hover:bg-danger-600 text-slate-600 hover:text-white p-3 rounded-lg shadow-xl z-10 transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X size={24} />
          </button>
          
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
            <img 
              src={zoomedImage || undefined} 
              alt="Zoom registro" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      <VehicleHistoryModal 
        isOpen={showExpedientModal} 
        onClose={() => setShowExpedientModal(false)} 
      />
    </div>
  );
};
