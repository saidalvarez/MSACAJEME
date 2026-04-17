import { useState, memo } from 'react';
import { 
  FileText, RefreshCw,
  Clock, Search, Trash2, DollarSign
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { formatCurrency, formatPdfFileName } from '../utils/format';
import { QuotePDF } from '../components/QuotePDF';
import { ProfitPDF } from '../components/ProfitPDF';
import { sendWhatsAppNotification, formatTicketMessage } from '../utils/notifications';
import { DangerModal } from '../components/DangerModal';
import { dataAdapter } from '../services/dataAdapter';
import { useEffect } from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Skeleton } from '../components/ui/Skeleton';

const WhatsAppIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M11.994 2a10.026 10.026 0 0 0-8.544 15.26L2 22l4.872-1.278A10.022 10.022 0 1 0 11.994 2zM12 20.25c-1.487 0-2.923-.393-4.184-1.139l-.3-.178-3.111.815.832-3.033-.195-.31A8.254 8.254 0 1 1 12 20.25z"/>
  </svg>
);

export interface HistoryTicket {
  id: string;
  ticket_number?: number;
  ticketNumber?: number;
  client_name?: string;
  clientName?: string;
  client_phone?: string;
  clientPhone?: string;
  status: string;
  total: number;
  date: string;
  format_type?: string;
  formatType?: string;
  items?: { name: string }[];
  is_archived?: boolean;
}

const HistoryCard = memo(({ ticket, onDelete }: { ticket: HistoryTicket, onDelete: (id: string) => void }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingProfit, setIsGeneratingProfit] = useState(false);

    const handleWhatsApp = async () => {
        const message = formatTicketMessage((ticket.client_name || ticket.clientName) as string, (ticket.ticket_number || ticket.ticketNumber) as number, ticket.status, ticket.total);
        sendWhatsAppNotification((ticket.client_phone || ticket.clientPhone || '') as string, message);
    };

    const handleDownload = async () => {
        try {
            console.log("Historial: Iniciando descarga de PDF para ticket #", ticket.ticket_number || ticket.ticketNumber);
            setIsGenerating(true);
            toast.loading("Generando PDF desde bitácora...", { id: 'pdf-historial' });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const document = <QuotePDF quote={ticket as any} formatType={(ticket.format_type || ticket.formatType || 'payment_info') as any} />;
            const blob = await pdf(document).toBlob();
            console.log("PDF generado en bitácora:", blob.size, "bytes");
            
            const filename = formatPdfFileName(ticket.client_name || ticket.clientName, 'Corte', ticket.ticket_number || ticket.ticketNumber || 0);

            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const buffer = await blob.arrayBuffer();
                const bytes = Array.from(new Uint8Array(buffer));
                const savedPath = await invoke('save_pdf_to_desktop', { bytes, filename });
                console.log(`Guardado exitoso en Desktop: ${savedPath}`);
            } catch (e) {
                console.error("Fallo al guardar nativamente, usando fallback", e);
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = filename;
                window.document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }
            
            toast.success("Documento Descargado", { id: 'pdf-historial' });
        } catch (error: unknown) {
            console.error("Historial PDF Error:", error);
            const err = error as Error;
            toast.error(`Error al generar documento: ${err.message || 'Error de renderizado'}`, { id: 'pdf-historial' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadProfit = async () => {
        try {
            console.log("Historial: Iniciando descarga de Utilidad para ticket #", ticket.ticket_number || ticket.ticketNumber);
            setIsGeneratingProfit(true);
            toast.loading("Generando tabla de utilidad...", { id: 'pdf-historial-profit' });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const document = <ProfitPDF quote={ticket as any} formatType={(ticket.format_type || ticket.formatType || 'payment_info') as any} />;
            const blob = await pdf(document).toBlob();
            
            const filename = formatPdfFileName(ticket.client_name || ticket.clientName, 'Utilidades', ticket.ticket_number || ticket.ticketNumber || 0);

            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const buffer = await blob.arrayBuffer();
                const bytes = Array.from(new Uint8Array(buffer));
                const savedPath = await invoke('save_pdf_to_desktop', { bytes, filename, folder: 'UTILIDADES' });
                console.log(`Guardado exitoso en Desktop: ${savedPath}`);
            } catch (e) {
                console.error("Fallo al guardar nativamente, usando fallback", e);
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = filename;
                window.document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }
            
            toast.success("Documento Descargado", { id: 'pdf-historial-profit' });
        } catch (error: unknown) {
            console.error("Historial PDF Profit Error:", error);
            const err = error as Error;
            toast.error(`Error al generar documento: ${err.message || 'Error de renderizado'}`, { id: 'pdf-historial-profit' });
        } finally {
            setIsGeneratingProfit(false);
        }
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md group relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Banner de Estado Lateral */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${ticket.status === 'completed' ? 'bg-emerald-500' : ticket.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'}`} />

            <div className="flex-1 flex flex-col gap-1 pl-2">
                <div className="flex items-center gap-3 mb-1">
                     <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Folio #{ticket.ticket_number || ticket.ticketNumber}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                        <Clock size={12} className="text-slate-300" />
                        {new Date(ticket.date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(ticket.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                <h4 className="font-black text-lg text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    {ticket.client_name}
                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-bold border ${ticket.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ticket.status === 'archived' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                       {ticket.status === 'completed' ? 'Completado' : ticket.status === 'archived' ? 'Archivado' : 'Pendiente'}
                    </span>
                </h4>

                <div className="text-xs font-medium text-slate-500 line-clamp-1 mt-1">
                    {ticket.items?.map((i: any) => i.name).join(' • ')}
                </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 md:gap-2 bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none">
                <div className="text-left md:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-0.5">Importe Total</span>
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                        {formatCurrency(ticket.total)}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                     <button onClick={handleDownload} disabled={isGenerating} title="Cotización Cliente" className="px-3 py-2 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all active:scale-95 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                        {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={16} />} Cotización
                     </button>
                     <button onClick={handleDownloadProfit} disabled={isGeneratingProfit} title="Utilidades Taller" className="px-3 py-2 flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all active:scale-95 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                        {isGeneratingProfit ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={16} />} Utilidades
                     </button>
                     <button onClick={handleWhatsApp} title="Enviar WhatsApp" className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg transition-all active:scale-95 shadow-sm">
                        <WhatsAppIcon size={16} />
                     </button>
                     <button onClick={() => onDelete(ticket.id)} title="Eliminar de Bitácora" className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 border border-slate-200 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all active:scale-95 shadow-sm">
                        <Trash2 size={14} />
                     </button>
                </div>
            </div>
        </div>
    );
});

export const Historial = () => {
    const [historyTickets, setHistoryTickets] = useState<HistoryTicket[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
    const [showClearAll, setShowClearAll] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            if (isMounted) setIsLoading(true);
            try {
                const res = await dataAdapter.getHistorial(page, limit, searchTerm, dateFrom, dateTo);
                if (isMounted) {
                    setHistoryTickets(res.rows || []);
                    setTotalCount(res.count || 0);
                }
            } catch (err) {
                if (isMounted) toast.error("Error al cargar historial");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        const timeout = setTimeout(fetchHistory, searchTerm ? 400 : 0);
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [page, limit, searchTerm, dateFrom, dateTo]);

    const handleClearAll = async () => {
        await dataAdapter.clearHistorial();
        setHistoryTickets([]);
        setTotalCount(0);
        setShowClearAll(false);
        toast.success("Historial vaciado correctamente");
    };

    return (
        <div className="p-3 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
            
            <Breadcrumbs />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20 border border-slate-800">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Bitácora de Operaciones</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Archivo Global Maestro • {totalCount} Folios Guardados</p>
                    </div>
                </div>
                {totalCount > 0 && (
                    <button 
                        onClick={() => setShowClearAll(true)}
                        className="h-10 px-4 bg-danger-50 hover:bg-danger-600 text-danger-600 hover:text-white border border-danger-200 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Vaciar Todo
                    </button>
                )}
            </header>

            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 mt-6 mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    <div className="lg:col-span-6 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar Cliente, Placas o Folio..." 
                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 pl-12 text-sm font-bold outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all placeholder:text-slate-400 text-slate-800 uppercase"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    
                    <div className="lg:col-span-6 flex flex-col md:flex-row items-center gap-3">
                        <div className="flex-1 w-full relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase text-slate-400 tracking-tighter">Desde</span>
                            <input 
                                type="date" 
                                className="w-full h-12 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 pl-14 pr-3 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all cursor-pointer uppercase" 
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="hidden md:block w-3 h-px bg-slate-300 shrink-0" />
                        <div className="flex-1 w-full relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase text-slate-400 tracking-tighter">Hasta</span>
                            <input 
                                type="date" 
                                className="w-full h-12 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 pl-14 pr-3 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all cursor-pointer uppercase" 
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 min-h-[400px]">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between gap-4 opacity-50">
                                <div className="space-y-3 flex-1">
                                    <Skeleton className="w-24 h-4 rounded" />
                                    <Skeleton className="w-48 h-6 rounded" />
                                    <Skeleton className="w-full h-3 rounded" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-20 h-8 rounded" />
                                    <Skeleton className="w-28 h-10 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : historyTickets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 animate-in fade-in">
                         <div className="bg-emerald-50 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                            <FileText className="text-emerald-500" size={32} />
                         </div>
                         <h3 className="text-lg font-bold text-slate-900 mb-2">Historial Vacío</h3>
                         <p className="text-slate-400 max-w-xs mx-auto text-sm">No se encontraron servicios que coincidan con los filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {historyTickets.map(ticket => (
                            <HistoryCard key={ticket.id} ticket={ticket} onDelete={(id) => setTicketToDelete(id)} />
                        ))}
                    </div>
                )}
            </div>
                {/* Pagination Controls */}
                {!isLoading && totalCount > limit && (
                    <div className="px-2 py-4 flex items-center justify-between border-t border-slate-200 mt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            Mostrando <span className="text-emerald-600">{((page - 1) * limit) + 1}</span> - <span className="text-emerald-600">{Math.min(page * limit, totalCount)}</span> de {totalCount}
                        </span>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={page === 1}
                                className="h-10 px-5 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                            >
                                Anterior
                            </button>
                            <button 
                                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={page * limit >= totalCount}
                                className="h-10 px-5 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal de eliminación individual */}
                <DangerModal
                    isOpen={!!ticketToDelete}
                    onClose={() => setTicketToDelete(null)}
                    onConfirm={async () => {
                        if (ticketToDelete) {
                            await dataAdapter.deleteHistorialTicket(ticketToDelete);
                            setHistoryTickets(prev => prev.filter(t => t.id !== ticketToDelete));
                            setTotalCount(prev => prev - 1);
                            setTicketToDelete(null);
                            toast.success("Servicio eliminado del historial");
                        }
                    }}
                    title="Eliminar de Historial"
                    message="¿Estás seguro de querer eliminar este registro permanentemente? Esta acción no se puede deshacer."
                />

                {/* Modal de vaciar todo */}
                <DangerModal
                    isOpen={showClearAll}
                    onClose={() => setShowClearAll(false)}
                    onConfirm={handleClearAll}
                    title="Vaciar Historial Completo"
                    message='Esta acción eliminará TODOS los servicios guardados en el historial. Escribe "BORRAR" para confirmar.'
                    requireText={true}
                />
            </div>
        );
};
