import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Plus, FileText, 
  CheckCircle, RefreshCw, Trash2, ChevronLeft, ChevronRight, Download, Edit2, Mail
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { useTickets, type Ticket } from '../context/TicketContext';
import { useExpenses } from '../context/ExpenseContext';
import { QuotePDF } from '../components/QuotePDF';
import { DangerModal } from '../components/DangerModal';

const WhatsAppIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M11.994 2a10.026 10.026 0 0 0-8.544 15.26L2 22l4.872-1.278A10.022 10.022 0 1 0 11.994 2zM12 20.25c-1.487 0-2.923-.393-4.184-1.139l-.3-.178-3.111.815.832-3.033-.195-.31A8.254 8.254 0 1 1 12 20.25z"/>
  </svg>
);

// --- COMPONENTE DE TARJETA INDIVIDUAL ---
const ServiceCard = ({ ticket, handleDelete, handleToggleStatus }: { ticket: Ticket, handleDelete: (id: string) => void, handleToggleStatus: (id: string, currentStatus: string) => void }) => {
    const format = ticket.formatType || 'payment_info';
    const [isGenerating, setIsGenerating] = useState(false);

    const generateFile = async () => {
        const document = <QuotePDF quote={ticket} formatType={format} />;
        const blob = await pdf(document).toBlob();
        const fileName = `Cotizacion-${ticket.ticketNumber}.pdf`;
        return new File([blob], fileName, { type: 'application/pdf' });
    };

    const handleWhatsApp = async () => {
        try {
            const file = await generateFile();
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Servicio #${ticket.ticketNumber}`,
                    files: [file],
                });
            } else {
                const text = encodeURIComponent(`Hola, adjunto los detalles del servicio #${ticket.ticketNumber} para ${ticket.clientName}. Total: ${formatCurrency(ticket.total)}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        } catch (error) {
           console.error("Error WhatsApp:", error);
        }
    };

    const handleEmail = async () => {
        const subject = encodeURIComponent(`Detalles de Servicio #${ticket.ticketNumber} - Multiservicios Cajeme`);
        const body = encodeURIComponent(`Hola ${ticket.clientName},\n\nAdjunto enviamos el documento correspondiente a su servicio #${ticket.ticketNumber}.\n\nTotal: ${formatCurrency(ticket.total)}\nGracias por su preferencia.`);
        window.location.href = `mailto:${ticket.clientEmail || ''}?subject=${subject}&body=${body}`;
    };

    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            const document = <QuotePDF quote={ticket} formatType={format} />;
            const blob = await pdf(document).toBlob();
            
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `Cotizacion-${ticket.ticketNumber}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al intentar generar la cotización.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-all group ${ticket.status === 'completed' ? 'opacity-60 grayscale-[0.3] border-gray-200 bg-gray-50' : 'border-gray-100'}`}>
            
            {/* IZQUIERDA: INFORMACIÓN */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded border border-indigo-100">
                        #{ticket.ticketNumber}
                    </span>
                    <span className="text-gray-400 text-sm font-medium">
                        {ticket.date.split('T')[0]} {new Date(ticket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>

                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2 truncate">
                    {ticket.clientName} 
                    {ticket.clientPhone && (
                      <>
                        <span className="text-gray-300 text-xl leading-none">·</span>
                        <span className="text-slate-600 font-semibold">{ticket.clientPhone}</span>
                      </>
                    )}
                </h4>

                <div className="text-sm font-medium text-slate-600 mt-1">
                    {ticket.items.map(item => item.name).join(', ')}
                </div>

                {ticket.notes && (
                    <div className="text-xs text-gray-500 italic mt-1 bg-yellow-50 p-2 rounded border border-yellow-100 inline-block">
                        <span className="font-bold not-italic text-yellow-800 mr-1">N:</span>
                        {ticket.notes}
                    </div>
                )}

                <div className="text-slate-500 font-medium text-sm mt-2 mb-3">
                    Total: <span className="font-bold flex-inline text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{formatCurrency(ticket.total)}</span>
                </div>
            </div>

            {/* DERECHA: ACCIONES */}
            <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-x divide-gray-200 w-full md:w-auto justify-center">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
                        title="Descargar PDF"
                    >
                        {isGenerating ? <span className="text-[10px] text-gray-400">...</span> : <><Download size={14} /></>}
                    </button>
                    
                    <button onClick={handleWhatsApp} className="flex-1 px-3 py-2 text-[#25D366] hover:bg-green-50 hover:text-green-600 transition-colors flex justify-center items-center" title="Compartir a WhatsApp">
                        <WhatsAppIcon size={16} />
                    </button>

                    <button onClick={handleEmail} className="flex-1 px-3 py-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Enviar por Email">
                        <Mail size={14} />
                    </button>

                    <Link to={`/editar/${ticket.id}`} className="px-3 py-2 text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Editar Servicio">
                        <Edit2 size={15} />
                    </Link>

                    <button 
                      onClick={() => handleToggleStatus(ticket.id, ticket.status)} 
                      className={`px-3 py-2 transition-colors ${ticket.status === 'completed' ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:bg-gray-50 hover:text-emerald-600'}`} 
                      title={ticket.status === 'completed' ? "Marcar como pendiente" : "Marcar como completado"}
                    >
                        <CheckCircle size={15} />
                    </button>
                    
                    <button onClick={() => handleDelete(ticket.id)} className="px-3 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Eliminar">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Dashboard = () => {
  const { tickets, deleteTicket, updateTicketStatus } = useTickets();
  const { expenses } = useExpenses();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed'>('pending');
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  // Local Timezone Day Logic (Arizona MST)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

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
    
    const d = new Date(`${selectedDate}T12:00:00`); // Evita problemas de zona horaria cruzada
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return `Tickets del ${d.toLocaleDateString('es-MX', options)}`;
  };

  // Advanced filtering
  const filteredTickets = tickets.filter(t => {
    // 1. Date filter
    const ticketDate = new Date(t.date);
    const start = getStartOfDay(selectedDate);
    const end = getEndOfDay(selectedDate);
    
    const isWithinDates = ticketDate >= start && ticketDate <= end;

    // 2. Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchName = t.clientName.toLowerCase().includes(searchLower);
    const matchPhone = t.clientPhone?.toLowerCase().includes(searchLower) ?? false;
    const matchNotes = t.notes?.toLowerCase().includes(searchLower) ?? false;
    const matchServices = t.items.some(item => item.name.toLowerCase().includes(searchLower));

    const matchesSearch = matchName || matchPhone || matchNotes || matchServices;
    const matchesStatus = t.status === filterStatus;

    return isWithinDates && matchesSearch && matchesStatus;
  });

  const totalSales = tickets.reduce((acc, ticket) => acc + ticket.total, 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const handleDelete = (id: string) => {
    setTicketToDelete(id);
  };

  const confirmDelete = () => {
    if (ticketToDelete) {
      deleteTicket(ticketToDelete);
      toast.success('Servicio eliminado permanente', { icon: '🗑️' });
      setTicketToDelete(null);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTicketStatus(id, nextStatus as 'pending' | 'completed');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-slate-800">
      
      {/* --- ENCABEZADO --- */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-slate-900 text-white p-2 rounded-lg">📄</span> 
            {getDayLabel()} ☀️
          </h1>
          <p className="text-gray-500 text-sm mt-1">Historial, envío y control por negocio</p>
        </div>
        
        <div className="flex gap-3">
            <Link 
              to="/nuevo" 
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
              <Plus size={18} /> Nuevo Servicio
            </Link>
        </div>
      </header>

      {/* --- FILTROS Y NAVEGACIÓN --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Navegador de Días */}
        <div className="flex items-center justify-between gap-2 overflow-hidden w-full md:w-auto">
            
            <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
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
        </div>

        <button 
            onClick={() => { setSelectedDate(today); setSearchTerm(''); }} 
            className="hidden md:flex bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm justify-center items-center gap-2 transition-colors font-medium border border-gray-200"
        >
            <RefreshCw size={16} /> Ir a Hoy
        </button>

        {/* Buscador */}
        <div className="relative flex-1 w-full max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar por cliente, servicio, nota..." 
                className="w-full border border-gray-200 rounded-lg p-2.5 pl-9 text-sm focus:border-slate-800 outline-none transition-colors bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* --- KPIs --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Servicios Registrados</h3>
            <p className="text-3xl font-bold text-slate-800">{tickets.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Ingresos Totales</h3>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Gastos Registrados</h3>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* --- LISTADO --- */}
      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Listado de Servicios</h2>
            
            <div className="flex items-center bg-gray-200 p-1 rounded-lg">
                <button 
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'pending' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500 hover:text-slate-700'}`}
                >
                    Pendientes
                </button>
                <button 
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'completed' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500 hover:text-slate-700'}`}
                >
                    Completados
                </button>
            </div>
        </div>

        <div className="space-y-3">
            {filteredTickets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800">No hay servicios encontrados</h3>
                    <p className="text-gray-500 mb-6">Intenta cambiar los filtros o crea uno nuevo.</p>
                </div>
            ) : (
                filteredTickets.map((ticket) => (
                    <ServiceCard key={ticket.id} ticket={ticket} handleDelete={handleDelete} handleToggleStatus={handleToggleStatus} />
                ))
            )}
        </div>
      </div>

      {/* Danger Modal */}
      <DangerModal
        isOpen={!!ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Servicio"
        message="¿Estás completamente seguro de querer eliminar este ticket? Toda la información de venta o servicio se perderá de la base de datos."
      />

    </div>
  );
};