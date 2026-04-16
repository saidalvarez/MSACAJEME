import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Calendar, ClipboardList, PenTool as Tool, ChevronRight, Car } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';

interface VehicleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleHistoryModal: React.FC<VehicleHistoryModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { loadTickets } = useStore();

  useEffect(() => {
    if (searchTerm.length >= 3) {
      const delaySearch = setTimeout(async () => {
        setIsLoading(true);
        // We use a large limit to see full history
        try {
          // Fetching global tickets (the store handles search by vehicle in backend)
          const apiRes = await fetch(`/api/tickets?search=${searchTerm}&status=archived&limit=50`);
          const archived = await apiRes.json();
          
          const apiRes2 = await fetch(`/api/tickets?search=${searchTerm}&limit=50`);
          const active = await apiRes2.json();

          const combined = [...(active.rows || []), ...(archived.rows || [])];
          // Filter out duplicates and keep uniqueness
          const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
          setResults(unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
          console.error("Error fetching vehicle history:", error);
        } finally {
          setIsLoading(false);
        }
      }, 500);
      return () => clearTimeout(delaySearch);
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
              <Car size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Expediente Clínico</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Historial completo por Matrícula o Serie</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 bg-white border-b border-slate-100">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
            <input 
              autoFocus
              type="text" 
              placeholder="Ingresa placas o número de serie (VIN)..."
              className="w-full h-14 bg-slate-50 border-2 border-slate-100 focus:border-primary-500 rounded-xl pl-12 pr-4 text-sm font-bold uppercase outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="mt-3 text-[10px] text-slate-400 font-black uppercase tracking-widest text-center">Escribe al menos 3 caracteres para iniciar la búsqueda quirúrgica</p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 py-20 text-slate-400">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <span className="text-xs font-black uppercase tracking-widest">Consultando Archivos...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Resultados Encontrados: {results.length}</span>
              </div>
              {results.map((ticket) => (
                <div key={ticket.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded tracking-widest">#{ticket.ticket_number || ticket.ticketNumber}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {new Date(ticket.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                      ticket.status === 'archived' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                      ticket.status === 'completed' ? 'bg-success-50 text-success-600 border-success-200' :
                      'bg-warning-50 text-warning-600 border-warning-200'
                    }`}>
                      {ticket.status === 'archived' ? '📁 Historial' : ticket.status === 'completed' ? '🏁 Finalizado' : '⏳ En Taller'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnóstico / Servicios</h4>
                      <div className="space-y-1">
                        {ticket.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Tool size={10} className="text-primary-500" />
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Total</span>
                       <span className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(ticket.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm.length >= 3 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 grayscale opacity-60">
              <ClipboardList size={64} strokeWidth={1} className="mb-4" />
              <h3 className="text-sm font-black uppercase tracking-widest">Sin registros encontrados</h3>
              <p className="text-[10px] font-bold mt-1 uppercase">El vehículo no tiene historial en este taller</p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-slate-300">
               <Car size={80} strokeWidth={0.5} className="mb-4 text-slate-200" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ingresa una placa para rastrear su vida útil</p>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Raphael v1.0 • Gestión Logística de Autos</p>
        </div>
      </div>
    </div>
  );
};
