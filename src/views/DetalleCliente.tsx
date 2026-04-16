import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, CheckCircle, PackageOpen, 
  ChevronDown, ChevronRight, Download, Award, Crown, Star, Shield, DollarSign,
  Mail,
  Phone,
  RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatPdfFileName } from '../utils/format';
import { pdf } from '@react-pdf/renderer';
import { QuotePDF } from '../components/QuotePDF';
import { ProfitPDF } from '../components/ProfitPDF';
import { dataAdapter } from '../services/dataAdapter';
import toast from 'react-hot-toast';
import type { Ticket } from '../types';



export const DetalleCliente = () => {
  const { id } = useParams<{ id: string }>();
  const { clients, tickets, sales } = useStore();

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingProfit, setIsGeneratingProfit] = useState(false);

  const client = clients.find(c => c.id === id);
  const [historialTickets, setHistorialTickets] = useState<any[]>([]);
  const [historialSales, setHistorialSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistorial = async () => {
      if (client) {
        try {
          // Fetch from historial table by client ID (robust)
          const res = await dataAdapter.getHistorial(1, 100, '', '', '', client.id) as any;
          setHistorialTickets(res.rows || []);
          
          // Fetch from sales table by client ID (including archived)
          const salesRes = await dataAdapter.getSales({ includeArchived: true, clientId: client.id }) as any;
          setHistorialSales(salesRes.rows || salesRes || []);
        } catch (error) {
          console.error("Error fetching client historial:", error);
        }
      }
    };
    fetchHistorial();
  }, [client]);

  if (!client) {
    return (
      <div className="p-6 text-center text-gray-500">
        <h2>Cliente no encontrado</h2>
        <Link to="/clientes" className="text-blue-500 hover:underline">Volver a Clientes</Link>
      </div>
    );
  }

  // Memoize exact client matches to avoid recalculating on every render
  const { activeClientTickets, activeClientSales } = useMemo(() => {
    if (!client) return { activeClientTickets: [], activeClientSales: [] };
    return {
      activeClientTickets: tickets.filter(t => t.client_id === client.id),
      activeClientSales: sales.filter(s => s.client_id === client.id)
    };
  }, [tickets, sales, client]);

  // Merge and Sort tickets ONCE, preventing massive Date parsing overhead during render
  const sortedClientTickets = useMemo(() => {
    // Evitar duplicidades comparando IDs
    const combined = [...activeClientTickets, ...historialTickets];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeClientTickets, historialTickets]);

  const sortedClientSales = useMemo(() => {
    const combined = [...activeClientSales, ...historialSales];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeClientSales, historialSales]);

  // Precompute totals
  const totalSpentTickets = useMemo(() => sortedClientTickets.reduce((sum, ticket) => sum + (ticket.total || 0), 0), [sortedClientTickets]);
  const totalSpentSales = useMemo(() => sortedClientSales.reduce((sum, sale) => sum + (sale.total || 0), 0), [sortedClientSales]);
  const totalSpent = totalSpentTickets + totalSpentSales;
  const totalVisits = sortedClientTickets.length + sortedClientSales.length;

  const currentRank = useMemo(() => {
    if (totalVisits === 0) return null;

    let rank = { name: 'Member', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Award size={14} />, perk: 'Diagnóstico express gratuito' };
    if (totalVisits >= 10 || totalSpent >= 25000) rank = { name: 'Black Series', color: 'bg-slate-900 text-yellow-500 border-slate-700', icon: <Crown size={14} />, perk: 'Lavado Completo & Cera VIP' };
    else if (totalVisits >= 5 || totalSpent >= 10000) rank = { name: 'Platinum', color: 'bg-slate-200 text-slate-800 border-slate-400', icon: <Star size={14} />, perk: 'Revisión Integral 20 pts' };
    else if (totalVisits >= 2) rank = { name: 'Gold', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <Shield size={14} />, perk: 'Trata de Cristales o Aroma' };

    return rank;
  }, [totalVisits, totalSpent]);

  const handleDownloadTicket = async (ticket: Ticket) => {
    try {
      console.log("DetalleCliente: Generando PDF para ticket:", ticket.id);
      setIsGenerating(true);
      toast.loading("Generando documento...", { id: 'pdf-client' });

      const format = (ticket.format_type || ticket.formatType || 'payment_info') as any;
      const doc = <QuotePDF quote={ticket} formatType={format} />;
      const blob = await pdf(doc).toBlob();
      
      const filename = formatPdfFileName(ticket.client_name || ticket.clientName, 'Cotizacion', ticket.ticket_number || ticket.ticketNumber || 0);

      try {
          const { invoke } = await import('@tauri-apps/api/core');
          const buffer = await blob.arrayBuffer();
          const bytes = Array.from(new Uint8Array(buffer));
          const savedPath = await invoke('save_pdf_to_desktop', { bytes, filename });
          console.log(`Guardado exitoso en Desktop: ${savedPath}`);
      } catch (e) {
          console.error("Fallo al guardar nativamente, usando fallback", e);
          const url = URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = filename;
          
          window.document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
      }

      toast.success("PDF Descargado", { id: 'pdf-client' });
    } catch (error: any) {
      console.error("DetalleCliente PDF Error:", error);
      toast.error(`Error al generar PDF: ${error.message || 'Error de renderizado'}`, { id: 'pdf-client' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadProfitTicket = async (ticket: Ticket) => {
    try {
      console.log("DetalleCliente: Generando Profit PDF para ticket:", ticket.id);
      setIsGeneratingProfit(true);
      toast.loading("Calculando y generando documento...", { id: 'pdf-client-profit' });

      const format = (ticket.format_type || ticket.formatType || 'payment_info') as any;
      const doc = <ProfitPDF quote={ticket} formatType={format} />;
      const blob = await pdf(doc).toBlob();
      
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
          const link = window.document.createElement('a');
          link.href = url;
          link.download = filename;
          
          window.document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
      }

      toast.success("Documento Utilidad Descargado", { id: 'pdf-client-profit' });
    } catch (error: any) {
      console.error("DetalleCliente Profit PDF Error:", error);
      toast.error(`Error al generar utilidad PDF: ${error.message || 'Error de calculo'}`, { id: 'pdf-client-profit' });
    } finally {
      setIsGeneratingProfit(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen animate-in fade-in flex justify-center">
      <div className="w-full max-w-7xl">
      {/* Header con botón regresar */}
      <div className="mb-8 flex items-center gap-4">
        <Link to="/clientes" className="w-10 h-10 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all flex items-center justify-center shadow-sm active:scale-95">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 uppercase tracking-tight">
            Expediente del Cliente
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Historial Técnico y Financiero</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Lado Izquierdo: Info del Cliente */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden border border-slate-800 text-white flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="flex flex-col items-center text-center relative z-10 mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-black text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl border border-slate-700 ring-1 ring-white/10 mb-4">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">{client.name}</h2>
              <div className="flex flex-col gap-2 items-center mt-3">
                <span className="text-[10px] bg-white/10 text-slate-300 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-white/5">
                  ID: {client.id}
                </span>
                {currentRank && (
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest flex items-center gap-1.5 border ${
                    currentRank.name === 'Black Series' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                    currentRank.name === 'Platinum' ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' :
                    currentRank.name === 'Gold' ? 'bg-yellow-300/10 text-yellow-300 border-yellow-300/20' :
                    'bg-white/10 text-white border-white/20'
                  }`}>
                    {currentRank.icon} {currentRank.name}
                  </span>
                )}
                <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                   <Clock size={10} className="text-primary-400" />
                   Registrado el {new Date(client.created_at || 0).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} a las {new Date(client.created_at || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="space-y-4 relative z-10 bg-black/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm mb-6 w-full">
              <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 border border-white/5 shrink-0"><Phone size={14} /></div>
                {client.phone}
              </div>
              {client.email && (
                <div className="flex items-center gap-4 text-sm font-medium text-slate-300 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 border border-white/5 shrink-0"><Mail size={14} /></div>
                  <span className="truncate">{client.email}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-auto p-4 bg-yellow-500/10 text-yellow-500/90 text-xs rounded-2xl border border-yellow-500/20 relative z-10 leading-relaxed font-medium">
                <span className="font-bold flex items-center gap-2 mb-2 text-yellow-500"><AlertTriangle size={14}/> NOTAS INTERNAS:</span>
                {client.notes}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden border border-slate-800">
             <div className="absolute -right-6 -bottom-6 opacity-[0.05]">
                 <TrendingUp size={150} />
             </div>
             <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Valor Histórico (LTV)</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase">{totalVisits} Tickets</span>
                </p>
                <p className="text-4xl font-black text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{formatCurrency(totalSpent)}</p>
                
                {currentRank && (
                  <div className="pt-5 border-t border-slate-700/50">
                    <p className="text-[9px] text-slate-500 font-bold mb-3 uppercase tracking-widest">Recompensa Vigente:</p>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 font-bold text-blue-400 text-xs flex items-center gap-2">
                       <CheckCircle2 size={16} className="shrink-0" /> <span className="leading-tight">{currentRank.perk}</span>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Lado Derecho: Historial */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Tickets */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <CheckCircle size={18} className="text-emerald-500" /> Trabajos Realizados (Tickets)
            </h3>
            
            {sortedClientTickets.length === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-6">No hay tickets registrados aún.</p>
            ) : (
              <div className="space-y-4">
                {sortedClientTickets.map((ticket: any) => (
                  <div key={ticket.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white hover:border-blue-200 transition-colors shadow-sm">
                    {/* Botón de Cabecera del Accordion */}
                    <button 
                      onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                      className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${expandedTicketId === ticket.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                           {expandedTicketId === ticket.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-500 mb-1 block">TICKET #{ticket.ticket_number || ticket.ticketNumber} {ticket.vehicle ? `• ${ticket.vehicle}` : ''}</span>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(ticket.date).toLocaleDateString()} a las {new Date(ticket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-semibold text-lg text-emerald-600">{formatCurrency(ticket.total)}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 flex items-center gap-1">
                          <PackageOpen size={12}/> {ticket.items.length} conceptos
                        </span>
                      </div>
                    </button>

                    {/* Contenido Desplegable (Items del Ticket) */}
                    {expandedTicketId === ticket.id && (
                      <div className="bg-slate-50 p-4 border-t border-gray-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detalle del Servicio</h4>
                        <div className="space-y-2">
                          {ticket.items.map((item: any, idx: number) => (
                             <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-gray-100 shadow-sm">
                               <div className="flex items-center gap-3">
                                  {item.image ? (
                                    <img src={item.image} alt="refaccion" className="w-10 h-10 object-cover rounded bg-gray-100 border border-gray-200" />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                      <PackageOpen size={16} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                                    <p className="text-xs text-slate-500">Cantidad: {item.quantity}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                                  <p className="text-xs text-slate-400">{formatCurrency(item.price)} c/u</p>
                               </div>
                             </div>
                          ))}
                        </div>
                        {ticket.notes && (
                           <div className="mt-4 p-3 bg-yellow-50/50 border border-yellow-100 rounded text-sm text-yellow-800">
                             <strong>Notas del Ticket:</strong> {ticket.notes}
                           </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3 flex-wrap">
                           <button 
                             onClick={() => handleDownloadTicket(ticket)}
                             disabled={isGenerating}
                             className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                           >
                             {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                             <span>Descargar PDF (Público)</span>
                           </button>

                           <button 
                             onClick={() => handleDownloadProfitTicket(ticket)}
                             disabled={isGeneratingProfit}
                             className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                           >
                             {isGeneratingProfit ? <RefreshCw size={18} className="animate-spin" /> : <DollarSign size={18} />}
                             <span>Utilidad (Taller)</span>
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Sales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <PackageOpen size={18} className="text-emerald-500" /> Ventas Directas (Mostrador)
            </h3>
            
            {sortedClientSales.length === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-6">No hay ventas directas registradas aún.</p>
            ) : (
              <div className="space-y-4">
                {sortedClientSales.map((sale: any) => (
                  <div key={sale.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white hover:border-emerald-200 transition-colors shadow-sm">
                    <button 
                      onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                      className="w-full p-4 flex justify-between items-center text-left hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${expandedSaleId === sale.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                           {expandedSaleId === sale.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-600 mb-1 block uppercase">{sale.saleNumber} • {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(sale.date).toLocaleDateString()} a las {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-lg text-emerald-600">{formatCurrency(sale.total)}</span>
                      </div>
                    </button>

                    {expandedSaleId === sale.id && (
                      <div className="bg-emerald-50/20 p-4 border-t border-emerald-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Productos Vendidos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {sale.items.map((item: any, idx: number) => (
                             <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex justify-between items-center">
                               <div>
                                 <p className="text-sm font-semibold text-slate-700">{item.brand}</p>
                                 <p className="text-[10px] text-gray-500 uppercase font-medium">{item.type} • {item.viscosity}</p>
                                 <p className="text-xs text-emerald-600 font-semibold mt-1">x{item.quantity}</p>
                               </div>
                               <p className="text-sm font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      </div>
    </div>
  );
};
