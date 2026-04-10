import { useState, useMemo } from 'react';
import { Search, UserPlus, Phone, Trash2, Edit2, Users, Award, Star, Shield, Crown, Info, X, Calendar, CheckCircle2, MessageCircle, Clock, Activity, TrendingUp, PlusCircle, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ClientModal } from '../components/ClientModal';
import { DangerModal } from '../components/DangerModal';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

export const Clientes = () => {
  const navigate = useNavigate();
  const { clients, deleteClient: removeClient } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isRanksModalOpen, setIsRanksModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'inactive' | 'new'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const clientDataMap = useMemo(() => {
    const map = new Map();
    
    clients.forEach((client: any) => {
        const visits = Number(client.total_visits || 0);
        const totalSpent = Number(client.total_spent || 0);
        const memberSince = new Date(client.created_at || client.registrationDate || new Date());
        let lastServiceDate = new Date(client.last_activity || memberSince);
        
        let rank = { name: 'Member', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Award size={14} />, perk: 'Diagnóstico en cada visita' };
        if (visits >= 10 || totalSpent >= 25000) rank = { name: 'Black Series', color: 'bg-slate-900 text-slate-100 border-slate-700', icon: <Crown size={14} className="text-yellow-500" />, perk: 'Lavado Completo & Cera VIP' };
        else if (visits >= 5 || totalSpent >= 10000) rank = { name: 'Platinum', color: 'bg-slate-200 text-slate-800 border-slate-400', icon: <Star size={14} />, perk: 'Revisión Integral 20 pts' };
        else if (visits >= 2) rank = { name: 'Gold', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <Shield size={14} />, perk: 'Tratamiento Cristales o Aroma' };
        
        const stats = { rank, memberSince, visits, totalSpent };

        const today = new Date();
        const monthsDiff = (today.getFullYear() - lastServiceDate.getFullYear()) * 12 + (today.getMonth() - lastServiceDate.getMonth());
        const needsReminder = visits > 0 && monthsDiff >= 6;

        let lastTicketInfo = 'Aún no tiene servicios registrados';
        if (visits > 0) {
            const daysDiff = Math.floor((today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24));
            let timeAgo = '';
            if (daysDiff === 0) timeAgo = 'Hoy';
            else if (daysDiff === 1) timeAgo = 'Ayer';
            else if (daysDiff < 30) timeAgo = `Hace ${daysDiff} días`;
            else if (monthsDiff === 1) timeAgo = 'Hace 1 mes';
            else timeAgo = `Hace ${monthsDiff} meses`;
            
            lastTicketInfo = `Servicio General • ${timeAgo}`;
        }
        
        map.set(client.id, { stats, needsReminder, lastTicketInfo });
    });
    
    return map;
  }, [clients]);

  const metrics = useMemo(() => {
    let vip = 0;
    let inactive = 0;
    let newThisMonth = 0;
    const today = new Date();
    
    clients.forEach(client => {
      const data = clientDataMap.get(client.id);
      if (!data) return;
      if (data.stats.rank.name === 'Black Series' || data.stats.rank.name === 'Platinum') vip++;
      if (data.needsReminder) inactive++;
      
      if (data.stats.memberSince.getMonth() === today.getMonth() && data.stats.memberSince.getFullYear() === today.getFullYear()) {
          newThisMonth++;
      }
    });

    return { total: clients.length, vip, inactive, newThisMonth };
  }, [clients, clientDataMap]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const nameMatch = (client.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = (client.phone || '').includes(searchTerm);
      if (!nameMatch && !phoneMatch) return false;

      const data = clientDataMap.get(client.id);
      if (!data) return true;

      switch (filterType) {
          case 'vip': return data.stats.rank.name === 'Black Series' || data.stats.rank.name === 'Platinum';
          case 'inactive': return data.needsReminder;
          case 'new': 
              const today = new Date();
              return data.stats.memberSince.getMonth() === today.getMonth() && data.stats.memberSince.getFullYear() === today.getFullYear();
          default: return true;
      }
    }).sort((a, b) => {
        const dateA = new Date(a.created_at || a.registrationDate || 0).getTime() || 0;
        const dateB = new Date(b.created_at || b.registrationDate || 0).getTime() || 0;
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [clients, searchTerm, filterType, clientDataMap, sortBy]);

  const confirmDelete = async () => {
    if (clientToDelete) {
      await removeClient(clientToDelete);
      toast.success('Cliente eliminado de la base de datos', { icon: '🗑️' });
      setClientToDelete(null);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6 animate-page-enter">
      
      <Breadcrumbs />

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm border border-slate-200">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 uppercase">Directorio de Clientes</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1">Gestión de Base de Datos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsRanksModalOpen(true)}
            className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-all shadow-sm"
          >
            <Info size={16} className="text-primary-500" /> Ranks
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-4 bg-slate-900 text-white rounded-lg flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <UserPlus size={16} /> Nuevo
          </button>
        </div>
      </header>

      {/* Mini-Dashboard Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Users size={18} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Clientes</p><p className="text-xl font-black text-slate-800">{metrics.total}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-yellow-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center shrink-0"><Crown size={18} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">Clientes VIP</p><p className="text-xl font-black text-slate-800">{metrics.vip}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0"><Calendar size={18} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Inactivos +6M</p><p className="text-xl font-black text-rose-600">{metrics.inactive}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={18} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Nuevos</p><p className="text-xl font-black text-slate-800">{metrics.newThisMonth}</p></div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
              type="text" 
              placeholder="Buscar por nombre o teléfono..." 
              className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 lg:pb-0">
          <button onClick={() => setFilterType('all')} className={`shrink-0 px-4 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm ${filterType === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todos</button>
          <button onClick={() => setFilterType('vip')} className={`shrink-0 flex items-center gap-1.5 px-4 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm ${filterType === 'vip' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Crown size={14} className={filterType === 'vip' ? 'text-yellow-600' : ''} /> Elite 💎</button>
          <button onClick={() => setFilterType('inactive')} className={`shrink-0 flex items-center gap-1.5 px-4 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm ${filterType === 'inactive' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Calendar size={14} className={filterType === 'inactive' ? 'text-rose-600' : ''} /> Inactivos ⚠️</button>
          <button onClick={() => setFilterType('new')} className={`shrink-0 flex items-center gap-1.5 px-4 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm ${filterType === 'new' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Star size={14} className={filterType === 'new' ? 'text-emerald-600' : ''} /> Nuevos 🌟</button>
        </div>
        
        {/* Sort Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
           <button 
             onClick={() => setSortBy('newest')}
             className={`px-4 h-10 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Recientes
           </button>
           <button 
             onClick={() => setSortBy('oldest')}
             className={`px-4 h-10 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${sortBy === 'oldest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Antiguos
           </button>
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Users className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-tight">Sin resultados</h3>
            <p className="text-slate-400 text-sm font-medium">No se encontraron clientes con esos criterios.</p>
          </div>
        ) : (
          filteredClients.map((client, index) => {
            const data = clientDataMap.get(client.id) || { stats: null, needsReminder: false, lastTicketInfo: '' };
            const { stats, needsReminder, lastTicketInfo } = data;
            
            return (
              <div 
                key={client.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group overflow-hidden relative animate-page-enter flex flex-col pb-6"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Status Indicator Bar */}
                {needsReminder && <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />}
                <div className="p-6 relative z-10 flex-1">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6
                            ${stats?.rank?.color ? stats.rank.color : 'bg-primary-600 text-white'}
                        `}>
                            {(client.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-900 uppercase tracking-tight leading-tight truncate max-w-[150px]" title={client.name}>
                                {client.name || 'Sin Nombre'}
                            </h3>
                            <div className="flex items-center gap-1 mt-1.5">
                                <div className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.2em] ${stats?.rank?.color || 'bg-slate-100 text-slate-500'}`}>
                                    {stats?.rank?.icon} {stats?.rank?.name || 'Bronce'}
                                </div>
                                <div className="text-[7px] font-bold text-slate-900 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest">
                                    ID: {client.id}
                                </div>
                                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest ml-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Clock size={8} /> Desde {new Date(client.created_at || 0).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>

                  {needsReminder && (
                    <div className="flex items-center gap-2 mb-4 animate-in fade-in zoom-in slide-in-from-top-2 duration-300">
                      <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1.5">
                        <Calendar size={10} /> Reactivación Requerida (+6m)
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 mb-4">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-7 h-7 rounded-[0.5rem] bg-white flex items-center justify-center text-slate-400 mt-0.5 border border-slate-100 shadow-sm shrink-0"><Activity size={12} className="text-blue-500" /></div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Última Actividad</p>
                            <p className="text-xs font-bold text-slate-700 line-clamp-2 leading-tight">{lastTicketInfo}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Award size={10} className="text-indigo-500"/> Visitas</p>
                            <p className="text-sm font-black text-slate-700">{stats?.visits || 0} Registradas</p>
                        </div>
                        <div className={`flex flex-col gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100`}>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10} className="text-blue-500"/> Celular</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{client.phone}</p>
                        </div>
                    </div>
                  </div>
                </div>
                
                {/* Barra de Acciones HOVER (Flotante en la base) */}
                <div className="absolute -bottom-16 left-0 w-full bg-slate-900/95 backdrop-blur-md p-3 transition-all duration-300 group-hover:bottom-0 flex justify-center items-center gap-3 z-20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.1)]">
                    <button 
                        onClick={(e) => { e.preventDefault(); navigate(`/nuevo?clientName=${encodeURIComponent(client.name || '')}&clientPhone=${client.phone || ''}&clientEmail=${encodeURIComponent(client.email || '')}`); }}
                        title="Nuevo Ticket Auto-Fill"
                        className="w-10 h-10 bg-white/10 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95 border border-white/5 relative group/btn"
                    >
                        <PlusCircle size={18} />
                    </button>
                    <Link 
                        to={`/clientes/${client.id}`}
                        title="Ver Expediente de Vehículos/Tickets"
                        className="w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 border border-white/5 relative group/btn"
                    >
                        <FileText size={18} />
                    </Link>
                    {client.phone && (
                        <a 
                            href={`https://wa.me/52${(client.phone || '').replace(/\D/g,'')}?text=Hola%20${encodeURIComponent((client.name || '').split(' ')[0])},%20te%20saludamos%20de%20MSA%20Cajeme.`}
                            target="_blank" rel="noopener noreferrer"
                            title="Mandar WhatsApp"
                            className="w-10 h-10 bg-white/10 hover:bg-[#25D366] text-white rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-[#25D366]/30 active:scale-95 border border-white/5 relative group/btn"
                        >
                            <MessageCircle size={18} />
                        </a>
                    )}
                    <button 
                        onClick={() => { setEditingClient(client); setIsModalOpen(true); }}
                        title="Editar Datos"
                        className="w-10 h-10 bg-white/10 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-lg border border-white/5 active:scale-95 relative group/btn"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => setClientToDelete(client.id)}
                        title="Borrar Cliente"
                        className="w-10 h-10 bg-white/10 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-rose-600/30 border border-white/5 active:scale-95 relative group/btn"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Visible before hover: subtle dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 group-hover:opacity-0 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div><div className="w-1 h-1 rounded-full bg-slate-300"></div><div className="w-1 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Importado */}
      <ClientModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }} 
        client={editingClient}
      />

      {/* Ranks Info Modal VIP */}
      {isRanksModalOpen && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 lg:p-8">
          <div 
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsRanksModalOpen(false)}
          />
          <div className="bg-black text-white rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-800 relative z-10 flex flex-col max-h-[90vh]">
            
            {/* Header VIP */}
            <div className="p-8 relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 to-black border-b border-slate-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />
              <button 
                onClick={() => setIsRanksModalOpen(false)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-slate-800/50 w-10 h-10 rounded-full flex items-center justify-center"
              >
                <X size={20} />
              </button>
              <h2 className="text-3xl font-black flex items-center gap-3 uppercase tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                <Crown className="text-yellow-500" size={32} />
                Club MSA
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-3">Programa de Lealtad Automotriz</p>
            </div>
            
            <div className="p-8 grow overflow-y-auto custom-scrollbar bg-black/95">
              <div className="grid grid-cols-1 gap-6">
                
                {/* Black Series */}
                 <div className="group relative bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-700/50 hover:border-yellow-500/50 transition-all duration-500 overflow-hidden flex flex-col md:flex-row gap-6 items-center shadow-lg">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-white shadow-2xl border border-slate-700 ring-1 ring-white/10 shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-0" />
                        <Crown size={36} className="text-yellow-500 relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    </div>
                    <div className="flex-1 w-full relative z-10 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-2">
                           <h3 className="font-black text-2xl uppercase tracking-tighter text-white">Black Series</h3>
                           <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 mt-2 md:mt-0 rounded-full uppercase tracking-widest border border-yellow-500/20">Máximo Prestigio</span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mb-4 tracking-wide">Para los clientes más constantes (+10 servicios) o que han confiado grandes proyectos con nosotros.</p>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 w-full backdrop-blur-md">
                           <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                           <span className="text-xs font-bold text-slate-200">Encerado Premium / Lavado Completo Gratis de Cortesía</span>
                        </div>
                    </div>
                 </div>

                 {/* Platinum */}
                 <div className="group relative bg-slate-900/40 p-6 rounded-3xl border border-slate-800 hover:border-slate-500 transition-all duration-300 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-slate-900 shadow-xl border border-slate-400 shrink-0">
                        <Star size={32} className="text-slate-900" />
                    </div>
                    <div className="flex-1 w-full text-center md:text-left">
                        <h3 className="font-black text-xl uppercase tracking-tighter text-slate-200 mb-1">Platinum</h3>
                        <p className="text-[11px] font-medium text-slate-400 mb-4 tracking-wide">El estándar de excelencia. A partir de 5 visitas al taller.</p>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                           <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                           <span className="text-xs font-bold text-slate-300">Revisión Integral de 20 Puntos + Escáner Sin Costo</span>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gold */}
                    <div className="group relative bg-slate-900/30 p-5 rounded-3xl border border-slate-800 flex flex-col items-center md:items-start md:text-left text-center transition-all hover:bg-slate-900/50">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-200 to-yellow-500 flex items-center justify-center text-yellow-900 mb-4 shadow-lg">
                            <Shield size={28} />
                        </div>
                        <h3 className="font-bold text-lg uppercase tracking-tight text-white mb-1">Gold</h3>
                        <p className="text-[10px] font-medium text-slate-500 mb-4">Otorgado tras tu 2do servicio con nosotros.</p>
                        <div className="w-full bg-slate-800/50 p-3 rounded-xl flex items-start gap-2 border border-slate-700/50 mt-auto">
                           <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                           <span className="text-[10px] font-bold text-slate-300 leading-tight">Tratamiento de Cristales o Aromatizante VIP</span>
                        </div>
                    </div>

                    {/* Member */}
                    <div className="group relative bg-slate-900/30 p-5 rounded-3xl border border-slate-800 flex flex-col items-center md:items-start md:text-left text-center transition-all hover:bg-slate-900/50">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 mb-4 shadow-lg border border-slate-600">
                            <Award size={28} />
                        </div>
                        <h3 className="font-bold text-lg uppercase tracking-tight text-white mb-1">Member</h3>
                        <p className="text-[10px] font-medium text-slate-500 mb-4">Nivel base al registrar tu primer servicio.</p>
                        <div className="w-full bg-slate-800/50 p-3 rounded-xl flex items-start gap-2 border border-slate-700/50 mt-auto">
                           <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                           <span className="text-[10px] font-bold text-slate-300 leading-tight">Diagnóstico exprés en cada visita y registro.</span>
                        </div>
                    </div>
                 </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest gap-4">
                <span className="text-center md:text-left w-full max-w-[280px] leading-relaxed">Informa a tu cliente sobre sus beneficios para asegurar su regreso a MSA.</span>
                <button 
                  onClick={() => setIsRanksModalOpen(false)}
                  className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-lg active:scale-95 w-full md:w-auto"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Danger Modal para Eliminar Cliente */}
      <DangerModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        message="¿Estás completamente seguro de querer eliminar este cliente? Se borrará de la agenda, afectando historiales o búsquedas futuras vinculadas."
      />

    </div>
  );
};
