import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Search, Calendar, Users, 
  Package, ChevronDown, ChevronUp, RefreshCw, Download,
  ShoppingBag, Wrench
} from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { dataAdapter } from '../services/dataAdapter';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { pdf } from '@react-pdf/renderer';
import { ProfitPDF } from '../components/ProfitPDF';
import { GlobalProfitPDF } from '../components/GlobalProfitPDF';
import { formatPdfFileName } from '../utils/format';
import toast from 'react-hot-toast';

// ── Types ──
interface ProfitItem {
  name: string;
  price: number;
  quantity: number;
  purchase_price?: number;
}

interface ProfitTicket {
  id: string;
  ticket_number?: number;
  ticketNumber?: number;
  client_name?: string;
  clientName?: string;
  date: string;
  total: number;
  status: string;
  format_type?: string;
  formatType?: string;
  items: ProfitItem[];
  _source: 'service' | 'sale';
}

type ViewMode = 'general' | 'cliente';

// ── Helpers ──
const getMarginColor = (margin: number) => {
  if (margin >= 40) return { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (margin >= 20) return { bg: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { bg: 'bg-red-400', text: 'text-red-600', badge: 'bg-red-50 text-red-600 border-red-200' };
};

const calcMargin = (revenue: number, cost: number) => {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
};

const calcItemProfit = (item: ProfitItem) => {
  const rev = (item.price || 0) * (item.quantity || 1);
  const cost = (item.purchase_price || 0) * (item.quantity || 1);
  return { revenue: rev, cost, profit: rev - cost, margin: calcMargin(rev, cost) };
};

const calcTicketProfit = (items: ProfitItem[]) => {
  return (items || []).reduce((acc, item) => {
    const { revenue, cost, profit } = calcItemProfit(item);
    return { revenue: acc.revenue + revenue, cost: acc.cost + cost, profit: acc.profit + profit };
  }, { revenue: 0, cost: 0, profit: 0 });
};


// ── Margin Bar Component ──
const MarginBar = ({ margin }: { margin: number }) => {
  const colors = getMarginColor(margin);
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colors.bg}`} 
          style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} 
        />
      </div>
      <span className={`text-[9px] font-black ${colors.text} w-10 text-right`}>{margin.toFixed(0)}%</span>
    </div>
  );
};

export const Utilidades = () => {
  const [tickets, setTickets] = useState<ProfitTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('general');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [activeRes, histRes, salesRes] = await Promise.all([
        dataAdapter.getTickets(200, 0),
        dataAdapter.getHistorial(1, 500),
        dataAdapter.getSales({ includeArchived: true })
      ]);
      const active = ((activeRes as any).rows || activeRes || []).map((t: any) => ({ ...t, _source: 'service' as const }));
      const hist = ((histRes as any).rows || histRes || []).map((t: any) => ({ ...t, _source: 'service' as const }));
      
      // Map sales to ProfitTicket format
      const salesMapped = ((salesRes as any) || []).map((s: any) => ({
        id: s.id,
        ticket_number: 0,
        client_name: s.client_name || s.clientName || 'Venta Mostrador',
        date: s.date,
        total: s.total,
        status: s.status || 'completed',
        format_type: 'basic',
        items: (s.items || []).map((item: any) => ({
          name: item.name || `${item.brand || ''} ${item.type || ''} ${item.viscosity || ''}`.trim() || 'Producto',
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          purchase_price: Number(item.purchase_price || 0)
        })),
        _source: 'sale' as const
      }));

      const combined = [...active, ...hist, ...salesMapped];
      const unique = Array.from(new Map(combined.map((t: any) => [t.id, t])).values());
      setTickets(unique as ProfitTicket[]);
    } catch (err) {
      console.error('Error cargando datos de utilidades:', err);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filtered tickets ──
  const filtered = useMemo(() => {
    let list = tickets;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => 
        (t.client_name || t.clientName || '').toLowerCase().includes(term) ||
        t.items?.some(i => i.name.toLowerCase().includes(term))
      );
    }
    if (dateFrom) list = list.filter(t => t.date >= dateFrom);
    if (dateTo) list = list.filter(t => t.date <= dateTo + 'T23:59:59');
    return list;
  }, [tickets, searchTerm, dateFrom, dateTo]);

  // ── Totals ──
  const totals = useMemo(() => {
    return filtered.reduce((acc, t) => {
      const p = calcTicketProfit(t.items);
      return {
        revenue: acc.revenue + p.revenue,
        cost: acc.cost + p.cost,
        profit: acc.profit + p.profit,
        tickets: acc.tickets + 1,
        items: acc.items + (t.items?.length || 0)
      };
    }, { revenue: 0, cost: 0, profit: 0, tickets: 0, items: 0 });
  }, [filtered]);


  // ── Client Breakdown ──
  const clientAnalysis = useMemo(() => {
    const clientMap = new Map<string, { name: string; tickets: ProfitTicket[]; totalRevenue: number; totalCost: number; totalProfit: number; itemCount: number }>();
    filtered.forEach(ticket => {
      const clientName = (ticket.client_name || ticket.clientName || 'Sin Cliente').trim();
      const existing = clientMap.get(clientName) || { name: clientName, tickets: [], totalRevenue: 0, totalCost: 0, totalProfit: 0, itemCount: 0 };
      existing.tickets.push(ticket);
      (ticket.items || []).forEach(item => {
        const { revenue, cost, profit } = calcItemProfit(item);
        existing.totalRevenue += revenue;
        existing.totalCost += cost;
        existing.totalProfit += profit;
        existing.itemCount++;
      });
      clientMap.set(clientName, existing);
    });
    return Array.from(clientMap.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filtered]);

  // ── Daily Breakdown (Vista General) ──
  const dailyBreakdown = useMemo(() => {
    const dayMap = new Map<string, { date: string; label: string; tickets: ProfitTicket[]; revenue: number; cost: number; profit: number; serviceCount: number; saleCount: number }>();
    filtered.forEach(ticket => {
      const dayKey = ticket.date?.slice(0, 10) || 'unknown';
      const existing = dayMap.get(dayKey) || {
        date: dayKey,
        label: new Date(dayKey + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
        tickets: [], revenue: 0, cost: 0, profit: 0, serviceCount: 0, saleCount: 0
      };
      existing.tickets.push(ticket);
      if (ticket._source === 'sale') existing.saleCount++;
      else existing.serviceCount++;
      const p = calcTicketProfit(ticket.items);
      existing.revenue += p.revenue;
      existing.cost += p.cost;
      existing.profit += p.profit;
      dayMap.set(dayKey, existing);
    });
    return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  // ── PDF Download (individual ticket) ──
  const handleDownloadProfit = async (ticket: ProfitTicket) => {
    try {
      toast.loading("Generando utilidad...", { id: 'pdf-util' });
      const format = (ticket.format_type || ticket.formatType || 'payment_info') as any;
      const doc = <ProfitPDF quote={ticket as any} formatType={format} />;
      const blob = await pdf(doc).toBlob();
      const filename = formatPdfFileName(ticket.client_name || ticket.clientName, 'Utilidades', ticket.ticket_number || ticket.ticketNumber || 0);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const buffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await invoke('save_pdf_to_desktop', { bytes, filename, folder: 'UTILIDADES' });
      } catch {
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url; a.download = filename;
        window.document.body.appendChild(a); a.click();
        setTimeout(() => { window.document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
      toast.success("Utilidad descargada", { id: 'pdf-util' });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`, { id: 'pdf-util' });
    }
  };

  // ── PDF Download (Global / Month / Day) ──
  const handleDownloadGlobal = async (dayItems?: any[], dayLabel?: string) => {
    try {
      toast.loading("Generando reporte...", { id: 'pdf-global' });
      const targetList = dayItems || filtered; // si manda items de un día, usa esos; si no, todos los filtrados
      
      const itemsForPdf = targetList.map(t => {
        const p = calcTicketProfit(t.items);
        return {
          title: t._source === 'sale' ? `VENTA: ${t.client_name || 'Mostrador'}` : `FOLIO #${t.ticket_number || 0} - ${t.client_name}`,
          profit: p.profit,
          details: (t.items || []).map((i: any) => {
            const ip = calcItemProfit(i);
            return { name: i.name, qty: i.quantity, cost: ip.cost, rev: ip.revenue, profit: ip.profit, margin: ip.margin };
          })
        };
      });

      const repTotals = targetList.reduce((acc, t) => {
        const p = calcTicketProfit(t.items);
        return { revenue: acc.revenue + p.revenue, cost: acc.cost + p.cost, profit: acc.profit + p.profit, tickets: acc.tickets + 1 };
      }, { revenue: 0, cost: 0, profit: 0, tickets: 0 });
      const finalTotals = { ...repTotals, margin: calcMargin(repTotals.revenue, repTotals.cost) };

      const title = dayLabel ? `Reporte Diario de Utilidades` : `Reporte Global de Utilidades`;
      const doc = <GlobalProfitPDF title={title} dateStr={dayLabel || `${dateFrom || 'Inicio'} al ${dateTo || 'Fin'}`} totals={finalTotals} items={itemsForPdf} />;
      const blob = await pdf(doc).toBlob();
      const filename = `Reporte_${dayLabel ? 'Diario' : 'Global'}_Utilidades.pdf`;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const buffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await invoke('save_pdf_to_desktop', { bytes, filename, folder: 'UTILIDADES' });
      } catch {
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url; a.download = filename;
        window.document.body.appendChild(a);
        a.click();
        setTimeout(() => { window.document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
      toast.success("Reporte descargado correctamente", { id: 'pdf-global' });
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: 'pdf-global' });
    }
  };

  // ── Render: Ticket Row (reusable) ──
  const renderTicketRow = (ticket: ProfitTicket) => {
    const ticketNum = ticket.ticket_number || ticket.ticketNumber || 0;
    const p = calcTicketProfit(ticket.items);
    const margin = calcMargin(p.revenue, p.cost);
    const isExpanded = expandedTicket === ticket.id;
    const isSale = ticket._source === 'sale';

    return (
      <div key={ticket.id} className="border-b border-slate-100 last:border-b-0">
        <button
          onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
          className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-white transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isSale ? (
              <span className="bg-violet-50 text-violet-600 text-[9px] font-black px-2 py-0.5 rounded border border-violet-100 flex items-center gap-1 shrink-0">
                <ShoppingBag size={9} /> VENTA
              </span>
            ) : (
              <span className="bg-primary-50 text-primary-600 text-[10px] font-black px-2 py-0.5 rounded border border-primary-100 shrink-0">
                #{ticketNum}
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              {(ticket.client_name || ticket.clientName || 'Mostrador')}
            </span>
            <span className="text-[10px] font-medium text-slate-300 truncate hidden md:inline">
              {(ticket.items || []).map(i => i.name).join(' • ')}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block w-24"><MarginBar margin={margin} /></div>
            <span className={`text-sm font-black ${p.profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {p.profit > 0 ? '+' : ''}{formatCurrency(p.profit)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadProfit(ticket); }}
              className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-all active:scale-95"
              title="Descargar PDF Utilidades"
            >
              <Download size={12} />
            </button>
            <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronUp size={12} className="text-slate-300" />
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-5 pb-4">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="col-span-4">Concepto</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2 text-right">Gasto</div>
                <div className="col-span-2 text-right">Venta</div>
                <div className="col-span-1 text-right">Util.</div>
                <div className="col-span-2 text-right">Margen</div>
              </div>
              {(ticket.items || []).map((item, idx) => {
                const ip = calcItemProfit(item);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 items-center">
                    <div className="col-span-4 text-sm font-bold text-slate-700 truncate">{item.name}</div>
                    <div className="col-span-1 text-sm font-bold text-slate-500 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-sm font-bold text-slate-500 text-right">{formatCurrency(ip.cost)}</div>
                    <div className="col-span-2 text-sm font-bold text-slate-800 text-right">{formatCurrency(ip.revenue)}</div>
                    <div className={`col-span-1 text-sm font-black text-right ${ip.profit > 0 ? 'text-emerald-600' : ip.profit < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {ip.profit > 0 ? '+' : ''}{formatCurrency(ip.profit)}
                    </div>
                    <div className="col-span-2"><MarginBar margin={ip.margin} /></div>
                  </div>
                );
              })}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-emerald-50/50 border-t border-emerald-100 items-center">
                <div className="col-span-4 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Total {isSale ? 'Venta' : `#${ticketNum}`}
                </div>
                <div className="col-span-1"></div>
                <div className="col-span-2 text-sm font-black text-slate-500 text-right">{formatCurrency(p.cost)}</div>
                <div className="col-span-2 text-sm font-black text-slate-800 text-right">{formatCurrency(p.revenue)}</div>
                <div className="col-span-1 text-sm font-black text-emerald-600 text-right">+{formatCurrency(p.profit)}</div>
                <div className="col-span-2"><MarginBar margin={margin} /></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumbs />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-slate-200 rounded animate-pulse" />
            <div className="w-32 h-4 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="w-full h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-20">
      <Breadcrumbs />

      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center border border-emerald-200 shadow-sm">
            <TrendingUp size={24} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Utilidades</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Análisis de Rentabilidad</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleDownloadGlobal()} className="h-10 px-5 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
            <Download size={14} /> Reporte Global
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('general')}
              className={`px-5 h-9 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'general' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Vista General
            </button>
            <button
              onClick={() => setViewMode('cliente')}
              className={`px-5 h-9 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'cliente' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Por Cliente
            </button>
          </div>
          <button onClick={loadData} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-lg border border-slate-200" title="Actualizar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ingresos</p>
          <p className="text-lg font-black text-slate-900">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className={`${totals.cost === 0 ? 'bg-slate-50' : 'bg-rose-50/50 border-rose-100'} p-4 rounded-xl border shadow-sm`}>
          <p className={`text-[8px] font-bold uppercase tracking-widest mb-1 ${totals.cost === 0 ? 'text-slate-400' : 'text-rose-500'}`}>Gasto Operativo</p>
          <p className={`text-lg font-black ${totals.cost === 0 ? 'text-slate-500' : 'text-rose-700'}`}>{formatCurrency(totals.cost)}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1"><TrendingUp size={9} /> Utilidad Neta</p>
          <p className="text-lg font-black text-emerald-700">+{formatCurrency(totals.profit)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Margen</p>
          <p className="text-lg font-black text-indigo-600">{calcMargin(totals.revenue, totals.cost).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Operaciones</p>
          <p className="text-lg font-black text-slate-700">{totals.tickets}</p>
        </div>
      </div>

      {/* ═══ Top 5 Concepts (Oculto de momento) ═══ */}
      {/* topConcepts.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Award size={12} className="text-amber-500" /> Top 5 Conceptos Más Rentables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topConcepts.map((concept, idx) => {
              const margin = calcMargin(concept.totalRevenue, concept.totalCost);
              return (
                <div key={idx} className={`p-4 rounded-xl border ${getGradientForMargin(margin)} shadow-sm relative overflow-hidden transition-all hover:scale-[1.02]`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-black uppercase leading-tight truncate">{concept.name}</span>
                    <span className="text-[10px] font-black bg-white/60 px-2 py-0.5 rounded shadow-sm shrink-0">#{idx + 1}</span>
                  </div>
                  <p className="text-xl font-black">+{formatCurrency(concept.totalProfit)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-bold opacity-70 bg-white/40 px-1.5 py-0.5 rounded">{concept.count}x vendidos</span>
                    <MarginBar margin={margin} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) */}

      {/* ═══ Filters ═══ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text" placeholder="Buscar por cliente o concepto..." 
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-300"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400" />
          <input type="date" className="h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[10px] font-bold outline-none" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-slate-300 font-bold text-xs">→</span>
          <input type="date" className="h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[10px] font-bold outline-none" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ VISTA GENERAL (por día) ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {viewMode === 'general' && (
        <div className="space-y-3">
          {dailyBreakdown.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Package size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400">Sin datos en el período seleccionado</p>
            </div>
          ) : (
            dailyBreakdown.map(day => {
              const dayMargin = calcMargin(day.revenue, day.cost);
              const isDayExpanded = expandedDay === day.date;

              return (
                <div key={day.date} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <button
                    onClick={() => setExpandedDay(isDayExpanded ? null : day.date)}
                    className="w-full p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <Calendar size={20} className="text-white" />
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">{day.label}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {day.serviceCount > 0 && (
                            <span className="text-[9px] font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 flex items-center gap-1">
                              <Wrench size={8} /> {day.serviceCount} servicio{day.serviceCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {day.saleCount > 0 && (
                            <span className="text-[9px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100 flex items-center gap-1">
                              <ShoppingBag size={8} /> {day.saleCount} venta{day.saleCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Ingreso</p>
                        <p className="text-base font-black text-slate-700">{formatCurrency(day.revenue)}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${day.cost === 0 ? 'text-slate-400' : 'text-rose-500'}`}>Gasto</p>
                        <p className={`text-base font-black ${day.cost === 0 ? 'text-slate-500' : 'text-rose-600'}`}>{formatCurrency(day.cost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600">Utilidad</p>
                        <p className="text-lg font-black text-emerald-600">+{formatCurrency(day.profit)}</p>
                      </div>
                      <div className="hidden md:block w-20"><MarginBar margin={dayMargin} /></div>
                      
                      {/* Botón Descargar Día */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadGlobal(day.tickets, day.label); }}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-900 text-slate-500 hover:text-white border border-slate-200 rounded-lg transition-all active:scale-95"
                        title={"Descargar Reporte " + day.label}
                      >
                        <Download size={16} />
                      </button>

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isDayExpanded ? 'bg-emerald-100 text-emerald-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </button>

                  {isDayExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {day.tickets.map(ticket => renderTicketRow(ticket))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ VISTA POR CLIENTE ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {viewMode === 'cliente' && (
        <div className="space-y-3">
          {clientAnalysis.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Package size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400">Sin datos</p>
            </div>
          ) : (
            clientAnalysis.map(client => {
              const clientMargin = calcMargin(client.totalRevenue, client.totalCost);
              return (
                <div key={client.name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <button
                    onClick={() => setExpandedClient(expandedClient === client.name ? null : client.name)}
                    className="w-full p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center text-2xl font-black shrink-0 shadow-md">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className="font-black text-xl text-slate-900 truncate uppercase tracking-tight">{client.name}</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          <Users size={12} className="inline mr-1" /> 
                          {client.tickets.length} operacion{client.tickets.length !== 1 ? 'es' : ''} • {client.itemCount} concepto{client.itemCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Ingreso</p>
                        <p className="text-base font-black text-slate-700">{formatCurrency(client.totalRevenue)}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${client.totalCost === 0 ? 'text-slate-400' : 'text-rose-500'}`}>Gasto</p>
                        <p className={`text-base font-black ${client.totalCost === 0 ? 'text-slate-500' : 'text-rose-600'}`}>{formatCurrency(client.totalCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Utilidad</p>
                        <p className="text-xl font-black text-emerald-600">+{formatCurrency(client.totalProfit)}</p>
                      </div>
                      <div className="hidden md:block w-24"><MarginBar margin={clientMargin} /></div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${expandedClient === client.name ? 'bg-emerald-100 text-emerald-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </button>

                  {expandedClient === client.name && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {client.tickets.map(ticket => renderTicketRow(ticket))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ Summary Footer ═══ */}
      {filtered.length > 0 && (
        <div className="mt-8 bg-slate-900 text-white p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Resumen del Período</p>
              <p className="text-sm font-bold text-slate-300">{totals.tickets} operaciones • {totals.items} conceptos</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Ingreso</p>
              <p className="text-sm font-black text-slate-300">{formatCurrency(totals.revenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Gasto</p>
              <p className="text-sm font-black text-slate-400">{formatCurrency(totals.cost)}</p>
            </div>
            <div className="text-center">
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Margen</p>
              <p className="text-lg font-black text-indigo-400">{calcMargin(totals.revenue, totals.cost).toFixed(1)}%</p>
            </div>
            <div className="text-center border-l border-white/10 pl-6">
              <p className="text-[7px] font-bold uppercase tracking-widest text-emerald-400">Utilidad Neta</p>
              <p className="text-2xl font-black text-emerald-400">+{formatCurrency(totals.profit)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
