import { useState } from 'react';
import { Search, UserPlus, Phone, Mail, Trash2, Users, Award, Star, Shield, Crown, Clock, Info, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClients } from '../context/ClientContext';
import { useTickets } from '../context/TicketContext';
import { ClientModal } from '../components/ClientModal';
import { DangerModal } from '../components/DangerModal';
import toast from 'react-hot-toast';

export const Clients = () => {
  const { clients, removeClient } = useClients();
  const { tickets } = useTickets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRanksModalOpen, setIsRanksModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const needsReminder = (clientName: string) => {
    const clientTickets = tickets.filter(t => t.clientName === clientName);
    if (clientTickets.length === 0) return false;
    
    const sorted = [...clientTickets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastServiceDate = new Date(sorted[0].date);
    const today = new Date();
    
    // Calcula la diferencia real de meses
    const monthsDiff = (today.getFullYear() - lastServiceDate.getFullYear()) * 12 + (today.getMonth() - lastServiceDate.getMonth());
    return monthsDiff >= 6;
  };

  const getClientStats = (clientName: string) => {
    const clientTickets = tickets.filter(t => t.clientName === clientName);
    if (clientTickets.length === 0) return null;

    const sorted = [...clientTickets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const memberSince = new Date(sorted[0].date);
    const totalSpent = clientTickets.reduce((sum, t) => sum + t.total, 0);
    const visits = clientTickets.length;

    let rank = { name: 'Bronce', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Award size={14} />, perk: 'Cliente Nuevo' };
    
    if (visits >= 10 || totalSpent >= 25000) {
      rank = { name: 'Diamante', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <Crown size={14} />, perk: 'Lavado/Aspirado Gratis' };
    } else if (visits >= 5 || totalSpent >= 10000) {
      rank = { name: 'Oro', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Star size={14} />, perk: 'Revisión Express Gratis' };
    } else if (visits >= 2) {
      rank = { name: 'Plata', color: 'bg-slate-200 text-slate-700 border-slate-300', icon: <Shield size={14} />, perk: 'Aromatizante de Regalo' };
    }

    return { rank, memberSince, visits };
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      removeClient(clientToDelete);
      toast.success('Cliente eliminado de la base de datos', { icon: '🗑️' });
      setClientToDelete(null);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Users className="text-blue-600" /> Clientes
          </h1>
          <p className="text-gray-500 text-sm">Gestiona tu base de datos de clientes</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsRanksModalOpen(true)}
            className="bg-white hover:bg-gray-50 text-slate-700 border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors shadow-sm"
          >
            <Info size={18} className="text-blue-500" /> Ver Rangos
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors shadow-sm"
          >
            <UserPlus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative">
         <Search className="absolute left-7 top-7 text-gray-400" size={18} />
         <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
            No se encontraron clientes.
          </div>
        ) : (
          filteredClients.map((client, index) => (
            <div 
              key={client.id} 
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative animate-page-enter"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              
              <div className="flex justify-between items-start mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 font-bold text-lg">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={() => setClientToDelete(client.id)}
                  className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                  title="Eliminar cliente"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="font-bold text-slate-800 text-lg mb-1">{client.name}</h3>
              
              {(() => {
                const stats = getClientStats(client.name);
                if (!stats) return <span className="text-xs text-gray-400 block mb-2">Sin historial</span>;
                
                return (
                  <div className="flex flex-col gap-1.5 mb-2 mt-2">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit uppercase tracking-wider ${stats.rank.color}`}>
                      {stats.rank.icon} Nivel {stats.rank.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                      <Clock size={12} className="text-blue-500" /> Válido: {stats.rank.perk}
                    </div>
                  </div>
                );
              })()}

              {needsReminder(client.name) && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100 mb-2 w-fit mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  +6 Meses sin servicio
                </div>
              )}
              
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {client.phone}
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    {client.email}
                  </div>
                )}
              </div>

              {client.notes && (
                <div className="mt-4 pt-3 border-t border-gray-50 text-xs text-gray-500 italic">
                  "{client.notes}"
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-50 w-full text-center">
                 <Link to={`/clientes/${client.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-bold flex justify-center items-center py-1">
                    Ver Historial Completo
                 </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Importado */}
      <ClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Ranks Info Modal */}
      {isRanksModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white relative">
              <button 
                onClick={() => setIsRanksModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Crown className="text-yellow-400" /> Sistema de Fidelidad MSA
              </h2>
              <p className="text-slate-400 text-sm mt-1">Beneficios diseñados para premiar la lealtad sin afectar tus ganancias.</p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Bronce */}
              <div className="flex bg-orange-50 border border-orange-100 rounded-xl p-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-75 fill-mode-both">
                <div className="bg-orange-100 text-orange-600 p-3 rounded-full h-fit"><Award size={20} /></div>
                <div>
                  <h3 className="font-bold text-orange-800">Nivel Bronce</h3>
                  <p className="text-sm text-slate-600 mb-2">Cliente nuevo o con menos de 2 visitas.</p>
                  <div className="text-xs font-bold text-orange-700 bg-orange-100/50 px-2 py-1 rounded w-fit">Beneficio: Excelente servicio estándar</div>
                </div>
              </div>

              {/* Plata */}
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                <div className="bg-slate-200 text-slate-600 p-3 rounded-full h-fit"><Shield size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-800">Nivel Plata</h3>
                  <p className="text-sm text-slate-600 mb-2">A partir de <b>2 tickets</b> pagados.</p>
                  <div className="text-xs font-bold text-slate-700 bg-slate-200/50 px-2 py-1 rounded w-fit">Beneficio: Aromatizante Automotriz de Regalo</div>
                </div>
              </div>

              {/* Oro */}
              <div className="flex bg-yellow-50 border border-yellow-200 rounded-xl p-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full h-fit"><Star size={20} /></div>
                <div>
                  <h3 className="font-bold text-yellow-800">Nivel Oro</h3>
                  <p className="text-sm text-slate-600 mb-2">A partir de <b>5 tickets</b> o más de <b>$10,000 acumulados</b>.</p>
                  <div className="text-xs font-bold text-yellow-700 bg-yellow-100/50 px-2 py-1 rounded w-fit">Beneficio: Revisión Express gratuita (Niveles y Presión)</div>
                </div>
              </div>

              {/* Diamante */}
              <div className="flex bg-cyan-50 border border-cyan-200 rounded-xl p-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
                <div className="bg-cyan-100 text-cyan-600 p-3 rounded-full h-fit"><Crown size={20} /></div>
                <div>
                  <h3 className="font-bold text-cyan-800">Nivel Diamante</h3>
                  <p className="text-sm text-slate-600 mb-2">A partir de <b>10 tickets</b> o más de <b>$25,000 acumulados</b>.</p>
                  <div className="text-xs font-bold text-cyan-700 bg-cyan-100/50 px-2 py-1 rounded w-fit">Beneficio: Lavado y Aspirado Básico de cortesía</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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