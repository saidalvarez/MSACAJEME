import { useState, useRef, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Calendar, FileText, ChevronLeft, ChevronRight, Search, Download, Upload, Database } from 'lucide-react';
import { useTickets } from '../context/TicketContext';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/format';
import { FinancesPDF } from '../components/FinancesPDF';
import { DangerModal } from '../components/DangerModal';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export const Finances = () => {
  const { tickets, clearTickets } = useTickets();
  const { expenses, addExpense, removeExpense, clearExpenses } = useExpenses();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState<'month' | 'historico'>('month');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const calendarRef = useRef<HTMLInputElement>(null);

  const displayedTickets = viewMode === 'month' ? tickets.filter(t => t.date.startsWith(reportMonth)) : tickets;
  const displayedExpenses = viewMode === 'month' ? expenses.filter(e => e.date.startsWith(reportMonth)) : expenses;

  const extraIncome = displayedExpenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
  const totalIncome = displayedTickets.reduce((acc, t) => acc + t.total, 0) + extraIncome;
  const totalExpenses = displayedExpenses.filter(e => !e.type || e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const reportTickets = useMemo(() => tickets.filter(t => t.date.startsWith(reportMonth)), [tickets, reportMonth]);
  const reportExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(reportMonth)), [expenses, reportMonth]);

  const getMonthlyData = () => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = m.toISOString().slice(0, 7);
      const label = m.toLocaleDateString('es-MX', { month: 'short' }).replace(/^\w/, c => c.toUpperCase());
      const mTickets = tickets.filter(t => t.date.startsWith(key));
      const mExpenses = expenses.filter(e => e.date.startsWith(key));
      const mExtraIncome = mExpenses.filter(e => e.type === 'income').reduce((a, e) => a + e.amount, 0);
      const mIncome = mTickets.reduce((a, t) => a + t.total, 0) + mExtraIncome;
      const mOutcome = mExpenses.filter(e => !e.type || e.type === 'expense').reduce((a, e) => a + e.amount, 0);
      data.push({ name: label, VENTAS: mIncome, GASTOS: mOutcome });
    }
    return data;
  };
  const monthlyData = getMonthlyData();

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    addExpense({
      description,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      type: 'expense'
    });
    setDescription('');
    setAmount('');
  };

  const handleClearMonthData = () => {
    clearTickets();
    clearExpenses();
    setShowClearConfirm(false);
    toast.success(`Datos de ${getMonthLabel(reportMonth)} eliminados con éxito`);
  };

  const handleExportBackup = () => {
    const data = JSON.stringify(localStorage);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MSA_Cajeme_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Respaldo descargado exitosamente');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    e.target.value = ''; // Reset input
  };

  const changeMonth = (offset: number) => {
    const current = new Date(`${reportMonth}-01T12:00:00`);
    current.setMonth(current.getMonth() + offset);
    setReportMonth(current.toISOString().slice(0, 7));
    setCurrentPage(1);
  };

  const getMonthLabel = (iso: string) => {
    const date = new Date(`${iso}-01T12:00:00`);
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  const combinedList = [
    ...displayedExpenses.map(e => ({ id: e.id, description: e.description, amount: e.amount, date: e.date, isIncome: e.type === 'income', isTicket: false })),
    ...displayedTickets.map(t => ({ id: t.id, description: `${t.clientName} (Auto: ${t.vehicle || 'N/A'})`, amount: t.total, date: t.date, isIncome: true, isTicket: true }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .filter(item => item.description.toLowerCase().includes(searchQuery.toLowerCase()) || item.amount.toString().includes(searchQuery));

  const totalPages = Math.ceil(combinedList.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = combinedList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <DollarSign className="text-blue-600" /> Finanzas y Reportes
          </h1>
          <p className="text-gray-500 text-sm">Control de ingresos, gastos, e historial financiero</p>
        </div>
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => { setViewMode('month'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Vista Mensual
          </button>
          <button
            onClick={() => { setViewMode('historico'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'historico' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Histórico Global
          </button>
        </div>
      </div>

      {/* Month Explorer + Clear + PDF Download */}
      {viewMode === 'month' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-bold text-slate-700">Explorador de Meses</h2>
          <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button onClick={() => changeMonth(-1)} className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-md transition-all flex items-center">
              <ChevronLeft size={18} />
            </button>
            <div className="w-48 text-center font-bold text-slate-800 flex justify-center items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              {getMonthLabel(reportMonth)}
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-md transition-all flex items-center">
              <ChevronRight size={18} />
            </button>
          </div>
          <input
            type="month"
            ref={calendarRef}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            value={reportMonth}
            onChange={(e) => { if (e.target.value) { setReportMonth(e.target.value); setCurrentPage(1); } }}
          />
          <div className="flex items-center gap-2">
            <button onClick={() => { try { calendarRef.current?.showPicker(); } catch { calendarRef.current?.focus(); calendarRef.current?.click(); } }} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              Ir a Mes
            </button>
          </div>
        </div>
      )}

      {/* Confirm Clear Dialog */}
      <DangerModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearMonthData}
        title={`¿Limpiar ${getMonthLabel(reportMonth)}?`}
        message={`Esta acción eliminará definitivamente todos los tickets de servicio y gastos de ${getMonthLabel(reportMonth)}. Tus clientes y catálogo permanecerán intactos.\n\nEsta acción NO se puede deshacer.`}
        requireText={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Ingreso General ({viewMode === 'month' ? 'Mes' : 'Total'})</h3>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="text-emerald-500" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Gastos Registrados ({viewMode === 'month' ? 'Mes' : 'Total'})</h3>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="text-red-500" /></div>
          </div>
        </div>
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 ${netIncome >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Ganancia Neta ({viewMode === 'month' ? 'Mes' : 'Total'})</h3>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(netIncome)}</p>
            </div>
            <div className={`p-2 rounded-lg ${netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <DollarSign className={netIncome >= 0 ? "text-blue-500" : "text-orange-500"} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Balance Chart */}
      {viewMode === 'month' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
            Balance Visual de Rentabilidad
            <span className={netIncome > 0 ? "text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs" : "text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs"}>
              {netIncome > 0 ? 'UTILIDAD A FAVOR' : 'PÉRDIDA'}
            </span>
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
            <div className="w-full md:w-1/2 h-72">
              {(totalIncome === 0 && totalExpenses === 0) ? (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400 border border-dashed rounded-xl">SIN MOVIMIENTOS</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Este Mes', VENTAS: totalIncome, GASTOS: totalExpenses }]} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <YAxis
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      domain={[0, (dataMax: number) => Math.ceil(dataMax / 5000) * 5000 + 5000]}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => formatCurrency(Number(value))}
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    <Bar dataKey="VENTAS" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={80} />
                    <Bar dataKey="GASTOS" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-4">
              <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold"><TrendingUp size={20} /> Ingresos Acumulados</div>
                <div className="text-xl font-black text-emerald-800">{formatCurrency(totalIncome)}</div>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-2 text-red-700 font-bold"><TrendingDown size={20} /> Gastos Totales</div>
                <div className="text-xl font-black text-red-800">{formatCurrency(totalExpenses)}</div>
              </div>
              <div className={`flex justify-between items-center p-4 rounded-xl border ${netIncome >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className={`flex items-center gap-2 font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  <DollarSign size={20} /> {netIncome >= 0 ? 'Utilidad Neta' : 'Déficit'}
                </div>
                <div className={`text-2xl font-black ${netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  {formatCurrency(netIncome)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Section for Global History View */}
      {viewMode === 'historico' && (
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 mb-8 text-white relative overflow-hidden animate-in fade-in">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
             <Database size={150} className="-mr-10 -mt-10" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Database className="text-blue-400" size={20}/> Centro de Seguridad de Datos
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Realiza copias de seguridad de toda la base de datos local para no perder nunca tu información, o restaura la base de datos a partir de un archivo JSON previo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                onClick={handleExportBackup}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                title="Descargar copia de seguridad"
              >
                <Download size={18} /> Exportar Respaldo
              </button>
              <label 
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-white font-bold px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Cargar copia de seguridad"
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 animate-in fade-in">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Rendimiento Últimos 6 Meses</h2>
          <p className="text-sm text-gray-500 mb-6">Comparativa de ventas vs gastos mes a mes</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax / 5000) * 5000 + 5000]}
                />
                <RechartsTooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                <Bar dataKey="VENTAS" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="GASTOS" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Grid: Register Expense + History */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Register Expense & Top Actions */}
          <div className="lg:col-span-1 space-y-6">
          
          {viewMode === 'month' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 bg-gradient-to-b from-blue-50 to-white">
              <h2 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                <FileText className="text-blue-600" size={20}/> Descargar Reporte
              </h2>
              <p className="text-sm text-blue-700/80 mb-4">Exporta en PDF la sumatoria del mes actual ({getMonthLabel(reportMonth)}).</p>
              
              <PDFDownloadLink
                document={<FinancesPDF monthYear={reportMonth} tickets={reportTickets} expenses={reportExpenses} />}
                fileName={`Reporte_Financiero_MSA_${reportMonth}.pdf`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-sm"
              >
                {({ loading }) => (
                  <>
                    <FileText size={18} />
                    {loading ? 'Generando PDF...' : 'Descargar PDF del Mes'}
                  </>
                )}
              </PDFDownloadLink>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Trash2 size={16} className="text-red-400" /> Reiniciar Mes
              </h2>
              <p className="text-xs text-gray-500 mb-3">Elimina los registros del mes seleccionado para empezar de cero.</p>
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="w-full bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 py-2.5 rounded-lg flex justify-center items-center gap-2 font-bold transition-colors text-sm"
              >
                <Trash2 size={14} /> Limpiar Cifras del Mes
              </button>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Registrar Gasto</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Servicios (Luz/Agua)', 'Nómina', 'Inventario', 'Renta', 'Herramientas', 'Comisiones'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDescription(preset)}
                  className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium px-3 py-1.5 rounded-full transition-colors border border-gray-200"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Concepto / Descripción</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-slate-800 transition-colors"
                  placeholder="Ej. Compra de herramientas..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Monto (MXN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg p-2.5 pl-8 outline-none focus:border-slate-800 transition-colors"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
              >
                <Plus size={18} /> Añadir Gasto
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Transaction History */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between flex-wrap gap-4">
              <span>{viewMode === 'month' ? `Movimientos (${getMonthLabel(reportMonth)})` : 'Historial Global'}</span>
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar movimiento..."
                  className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:border-blue-500 outline-none transition-colors bg-gray-50 focus:bg-white"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </h2>

            {combinedList.length === 0 ? (
              <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl my-auto">
                No hay movimientos que coincidan.
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                <div className="mb-2 text-sm text-gray-500 font-medium">{combinedList.length} registros encontrados</div>
                {paginatedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg mt-1 ${item.isIncome ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                        {item.isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{item.description}</h4>
                          {item.isTicket ? (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-200 shadow-sm">SERVICIO</span>
                          ) : item.isIncome ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-200 shadow-sm">VENTA</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded uppercase tracking-wider border border-red-200 shadow-sm">GASTO</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar size={12} /> {new Date(item.date).toLocaleDateString()} a las {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-800 text-lg">
                        {item.isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                      </span>
                      {!item.isTicket && (
                        <button
                          onClick={() => removeExpense(item.id)}
                          className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar gasto"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
