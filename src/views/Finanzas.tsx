import { useState, useRef, useMemo, useCallback, memo, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Calendar, FileText, ChevronLeft, ChevronRight, Search, Download, Upload, Database, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { FinancesPDF } from '../components/FinancesPDF';
import { DangerModal } from '../components/DangerModal';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useStore } from '../store/useStore';
import { dataAdapter } from '../services/dataAdapter';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { InfoTooltip } from '../components/ui/InfoTooltip';

const safeDateStr = (dateVal: any) => {
    try {
        if (!dateVal) return new Date().toISOString();
        return typeof dateVal === 'string' ? dateVal : new Date(dateVal).toISOString();
    } catch(e) { return new Date().toISOString(); }
};

const DownloadReportButton = memo(({ reportMonth, reportTickets, reportExpenses, reportSales }: { reportMonth: string, reportTickets: any[], reportExpenses: any[], reportSales: any[] }) => {
  const monthLabel = useMemo(() => {
    const date = new Date(`${reportMonth}-01T12:00:00`);
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  }, [reportMonth]);

  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
        <FileText className="text-primary-600" size={14} /> Reporte Mensual
      </h2>
      <p className="text-sm font-bold text-slate-600 mb-8 max-w-[200px] leading-normal uppercase text-[10px]">Exporta el resumen de {monthLabel} en PDF profesional.</p>
      
      <PDFDownloadLink
        document={<FinancesPDF monthYear={reportMonth} tickets={reportTickets} expenses={reportExpenses} sales={reportSales} />}
        fileName={`Reporte_Financiero_MSA_${reportMonth}.pdf`}
        className="w-full h-12 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex justify-center items-center gap-3"
      >
        {({ loading }) => (
          <>
            <Download size={18} />
            {loading ? 'Generando...' : 'Descargar PDF'}
          </>
        )}
      </PDFDownloadLink>
    </div>
  );
});

const TransactionItem = memo(({ item, onRemove }: { item: any, onRemove: (id: string, isTicket?: boolean, isSale?: boolean) => void }) => (
  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group transition-colors">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
        item.isIncome ? 'bg-success-50 text-success-600 border-success-100' : 'bg-danger-50 text-danger-600 border-danger-100'
      }`}>
        {item.isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-sm uppercase tracking-tight text-slate-800">{item.description}</h4>
          {item.isTicket ? (
            <span className="text-[9px] font-bold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-lg border border-primary-100 uppercase tracking-widest">SERVICIO</span>
          ) : item.isIncome ? (
            <span className="text-[9px] font-bold bg-success-50 text-success-600 px-2 py-0.5 rounded-lg border border-success-100 uppercase tracking-widest">VENTA</span>
          ) : (
            <span className="text-[9px] font-bold bg-danger-50 text-danger-600 px-2 py-0.5 rounded-lg border border-danger-100 uppercase tracking-widest">GASTO</span>
          )}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Calendar size={12} /> {new Date(safeDateStr(item.date)).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} • {new Date(safeDateStr(item.date)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className={`text-lg font-bold ${item.isIncome ? 'text-success-600' : 'text-danger-600'}`}>
        {item.isIncome ? '+' : '-'}{formatCurrency(item.amount)}
      </span>
      {!item.isSale && !item.isTicket && (
        <button
          onClick={() => onRemove(item.id, item.isTicket, item.isSale)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-danger-600 hover:bg-danger-50 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-danger-100"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  </div>
));

export const Finanzas = () => {
  const { addExpense, deleteExpense, clearExpensesByMonth, clearSalesByMonth } = useStore();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState<'month' | 'historico'>('month');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const calendarRef = useRef<HTMLInputElement>(null);

  // Server state
  const [monthlyData, setMonthlyData] = useState<any>({ totalIncome: 0, totalExpenses: 0, netIncome: 0, tickets: [], sales: [], expenses: [] });
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (viewMode === 'month') {
        const response = await dataAdapter.getFinanceSummary(reportMonth) as any;
        setMonthlyData(response);
      } else {
        const response = await dataAdapter.getFinanceChart() as any[];
        setChartData(response);
      }
    } catch (error) {
      toast.error('Error al cargar datos financieros');
    } finally {
      setIsLoading(false);
    }
  }, [reportMonth, viewMode]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handleAddExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    try {
      await addExpense({
        description,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        type: 'expense',
        paymentMethod: 'cash'
      });
      toast.success('Gasto registrado exitosamente');
      setDescription('');
      setAmount('');
      fetchFinanceData(); // Reload stats after adding expense
    } catch (e) {
      toast.error('Error al registrar gasto');
    }
  }, [description, amount, addExpense, fetchFinanceData]);

  const handleClearMonthData = useCallback(async () => {
    await Promise.all([
      clearExpensesByMonth(reportMonth),
      clearSalesByMonth(reportMonth)
    ]);
    setShowClearConfirm(false);
    toast.success(`Movimientos de ${getMonthLabel(reportMonth)} archivados con éxito`);
    fetchFinanceData();
  }, [clearExpensesByMonth, clearSalesByMonth, reportMonth, fetchFinanceData]);

  const handleExportBackup = useCallback(async () => {
    try {
      toast.loading('Generando respaldo de base de datos...', { id: 'backup' });
      const result = await dataAdapter.createBackup() as any;
      toast.success(`Respaldo generado: ${result.filename}`, { id: 'backup', duration: 5000 });
    } catch (error) {
      toast.error('Error al generar respaldo. Verifica que pg_dump esté instalado.', { id: 'backup' });
    }
  }, []);

  const handleImportBackup = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, data[key]);
        });
        toast.success('¡Respaldo restaurado! Recargando sistema...');
        setTimeout(() => window.location.reload(), 2000);
      } catch {
        toast.error('Archivo de respaldo inválido o corrupto');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const changeMonth = useCallback((offset: number) => {
    const current = new Date(`${reportMonth}-01T12:00:00`);
    current.setMonth(current.getMonth() + offset);
    setReportMonth(current.toISOString().slice(0, 7));
    setCurrentPage(1);
  }, [reportMonth]);

  function getMonthLabel(iso: string) {
    const date = new Date(`${iso}-01T12:00:00`);
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  }

  const combinedList = useMemo(() => {
    const expenses = (monthlyData.expenses || []).map((e: any) => ({ id: e.id, description: e.description, amount: Number(e.amount || 0), date: e.date, isIncome: e.type === 'income', isTicket: false, isSale: false }));
    const sales = (monthlyData.sales || []).map((s: any) => ({ id: s.id, description: `Venta Directa: ${s.client_name || s.clientName || 'Sin Cliente'}`, amount: Number(s.total || 0), date: s.date, isIncome: true, isTicket: false, isSale: true }));
    const tickets = (monthlyData.tickets || []).map((t: any) => ({ id: t.id, description: `${t.client_name || t.clientName || 'Sin Cliente'} (Auto: ${t.vehicle || 'N/A'})`, amount: Number(t.total || 0), date: t.date, isIncome: true, isTicket: true, isSale: false }));
    
    return [...expenses, ...sales, ...tickets]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .filter(item => (item.description || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || item.amount.toString().includes(searchQuery || ''));
  }, [monthlyData, searchQuery]);

  const totalPages = useMemo(() => Math.ceil(combinedList.length / ITEMS_PER_PAGE) || 1, [combinedList]);
  const paginatedItems = useMemo(() => combinedList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [combinedList, currentPage]);

  const handleRemoveTransaction = useCallback(async (id: string, isTicket?: boolean, isSale?: boolean) => {
    try {
      if (isTicket) {
        toast.error("Para eliminar un servicio, ve a la Bitácora de Operaciones.");
      } else if (isSale) {
        toast.error("Las ventas no se pueden eliminar individualmente por seguridad contable.");
      } else {
        await deleteExpense(id);
        toast.success("Gasto eliminado exitosamente");
        fetchFinanceData(); // Reload stats after deleting
      }
    } catch (error) {
       toast.error("Error al intentar procesar la acción.");
    }
  }, [deleteExpense, fetchFinanceData]);

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 relative pb-32">
      <Breadcrumbs />

      {/* Header */}
      <header className="px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm border border-slate-200">
              <DollarSign size={28} />
            </div> 
            <div>
              <h1 className="text-2xl font-bold text-slate-800 uppercase">Finanzas</h1>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1.5 flex items-center gap-2">
                 <FileText size={12} /> Reportes y Balance General
              </p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
             <button
              onClick={() => { setViewMode('month'); setCurrentPage(1); }}
              className={`px-6 h-10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'month' 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Mes Actual
            </button>
            <button
              onClick={() => { setViewMode('historico'); setCurrentPage(1); }}
              className={`px-6 h-10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'historico' 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>
      </header>

      <div className="divider-fade opacity-30" />

      {/* Month Explorer + Clear + PDF Download */}
      {viewMode === 'month' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-primary-600">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Explorador de Meses</h2>
                <p className="font-bold text-xl text-slate-800 uppercase mt-0.5">{getMonthLabel(reportMonth)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 h-12">
              <button 
                onClick={() => changeMonth(-1)} 
                className="w-10 h-full rounded-lg flex items-center justify-center hover:bg-white text-slate-400 hover:text-primary-600 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button 
                onClick={() => { try { calendarRef.current?.showPicker(); } catch { calendarRef.current?.focus(); calendarRef.current?.click(); } }} 
                className="px-6 h-full rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary-600 hover:bg-primary-500 text-white shadow-md transition-all flex items-center gap-2"
              >
                {isLoading && <Loader2 size={12} className="animate-spin" />} Cambiar Período
              </button>

              <button 
                onClick={() => changeMonth(1)} 
                className="w-10 h-full rounded-lg flex items-center justify-center hover:bg-white text-slate-400 hover:text-primary-600 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex-1 min-w-[120px] flex justify-end">
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="h-10 w-full sm:w-auto px-5 bg-danger-50 hover:bg-danger-600 text-danger-600 hover:text-white border border-danger-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Borrar Ciclo
              </button>
            </div>
          </div>
          
          <input
            type="month"
            ref={calendarRef}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            value={reportMonth}
            onChange={(e) => { if (e.target.value) { setReportMonth(e.target.value); setCurrentPage(1); } }}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {isLoading && viewMode === 'month' && (
           <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
             <Loader2 size={32} className="animate-spin text-primary-600" />
           </div>
        )}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all duration-300">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 leading-none flex items-center gap-2">
                Ingresos Totales
                <InfoTooltip content="La suma total del dinero que ha entrado a caja por Servicios y Ventas Directas en el mes seleccionado." />
              </p>
              <h3 className="text-4xl font-bold tracking-tight leading-none text-success-600">{formatCurrency(monthlyData.totalIncome)}</h3>
            </div>
            <div className="w-12 h-12 bg-success-50 text-success-600 rounded-xl flex items-center justify-center border border-success-100 shadow-sm">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all duration-300">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 leading-none flex items-center gap-2">
                Gastos Generales
                <InfoTooltip content="Todo el dinero que ha salido para operación (insumos, luz, nóminas) en el mes." />
              </p>
              <h3 className="text-4xl font-bold tracking-tight leading-none text-danger-600">{formatCurrency(monthlyData.totalExpenses)}</h3>
            </div>
            <div className="w-12 h-12 bg-danger-50 text-danger-600 rounded-xl flex items-center justify-center border border-danger-100 shadow-sm">
              <TrendingDown size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all duration-300">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 leading-none flex items-center gap-2">
                Balance Neto
                <InfoTooltip content="El flujo de caja real. (Ingresos Totales - Gastos Generales). Define si este mes hubo utilidad general." />
              </p>
              <h3 className={`text-4xl font-bold tracking-tight leading-none ${monthlyData.netIncome >= 0 ? 'text-primary-600' : 'text-warning-600'}`}>
                {formatCurrency(monthlyData.netIncome)}
              </h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${
              monthlyData.netIncome >= 0 
                ? 'bg-primary-50 text-primary-600 border-primary-100' 
                : 'bg-warning-50 text-warning-600 border-warning-100'
            }`}>
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Balance Chart */}
      {viewMode === 'month' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-100 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-primary-600" />
            </div>
          )}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 uppercase">Balance de Rentabilidad</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Ventas vs Gastos Operativos</p>
            </div>
            <div className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
              monthlyData.netIncome >= 0 ? 'bg-success-50 text-success-600 border border-success-100' : 'bg-danger-50 text-danger-600 border border-danger-100'
            }`}>
              {monthlyData.netIncome >= 0 ? 'Utilidad Positiva' : 'Déficit Mensual'}
            </div>
          </div>

          <div className="h-[320px] w-full bg-slate-50 rounded-xl p-8 border border-slate-100 relative overflow-hidden">
             {(monthlyData.totalIncome === 0 && monthlyData.totalExpenses === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300">
                  <Database size={48} className="mb-4 opacity-20" />
                  Sin Movimientos Detectados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Este Mes', VENTAS: monthlyData.totalIncome, GASTOS: monthlyData.totalExpenses }]} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" hide />
                    <YAxis
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700 }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ 
                        background: '#fff', 
                        border: '1px solid rgba(0,0,0,0.05)',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        padding: '12px'
                      }}
                      itemStyle={{ padding: '2px 0' }}
                      formatter={(value: any) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="VENTAS" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="GASTOS" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>
        </div>
      )}

      {/* Backup Section for Global History View */}
      {viewMode === 'historico' && (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-100 relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-primary-600 mb-8 border border-slate-200">
              <Database size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 uppercase mb-4">Centro de Seguridad</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-12 max-w-sm">
              Respalda y restaura la base de datos completa del sistema msa cajeme.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={handleExportBackup}
                className="h-12 px-8 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-3"
              >
                <Download size={18} /> Exportar Respaldo
              </button>
              <label 
                className="h-12 px-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-200 active:scale-95 flex items-center gap-3 cursor-pointer"
              >
                <Upload size={18} /> Importar Datos
                <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 6-Month Comparison Chart */}
      {viewMode === 'historico' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-200 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-primary-600" />
            </div>
          )}
           <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 uppercase">Rendimiento Semestral</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Historial de los últimos 6 meses</p>
            </div>
          </div>

          <div className="h-[320px] w-full bg-slate-50 rounded-xl p-8 border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700 }}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid rgba(0,0,0,0.05)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    padding: '12px'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Bar dataKey="VENTAS" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="GASTOS" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Grid: Register Expense + History */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Left Column: Register Expense & Top Actions */}
          <div className="lg:col-span-1 space-y-8">
            <DownloadReportButton 
              reportMonth={reportMonth} 
              reportTickets={monthlyData.tickets} 
              reportExpenses={monthlyData.expenses} 
              reportSales={monthlyData.sales}
            />

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 uppercase mb-8">Registrar Gasto</h2>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {['Servicios', 'Nómina', 'Almacén', 'Renta'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDescription(preset)}
                    className="h-8 px-4 bg-slate-100 hover:bg-primary-600 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-white border border-slate-200 hover:border-primary-500 transition-all"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-3 ml-2">Concepto</label>
                  <input
                    type="text"
                    required
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-slate-300 uppercase tracking-widest"
                    placeholder="Ej. Herramientas..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-3 ml-2">Monto (MXN)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-slate-300"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full h-14 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Añadir Gasto
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Transaction History */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col min-h-[600px] relative">
              {isLoading && (
                 <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
                   <Loader2 size={32} className="animate-spin text-primary-600" />
                 </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-6 mb-12">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 uppercase">Lista de Movimientos</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{combinedList.length} registros totales</p>
                </div>
                
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Filtrar registros..."
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-slate-300"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>

              {combinedList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <FileText size={48} className="text-slate-200 mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300">Sin Movimientos</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  {paginatedItems.map(item => (
                    <TransactionItem key={item.id} item={item} onRemove={handleRemoveTransaction} />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Página {currentPage} / {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 disabled:opacity-30 transition-all hover:bg-slate-100"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 disabled:opacity-30 transition-all hover:bg-slate-100"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Dialog */}
      <DangerModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearMonthData}
        title={`¿Limpiar Movimientos de ${getMonthLabel(reportMonth)}?`}
        message={`Esta acción archivará definitivamente todos los gastos y ventas directas registrados en ${getMonthLabel(reportMonth)}. Los servicios (tickets) y el historial de clientes no se verán afectados.\n\nEscribe "BORRAR" para confirmar.`}
        confirmText="BORRAR"
        requireText={true}
      />
    </div>
  );
};
