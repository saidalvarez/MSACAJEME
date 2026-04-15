import { useState, useEffect, useRef } from 'react';
import { 
  Activity, Server, Cpu, Database, 
  Terminal, ShieldCheck, RefreshCw, Trash2,
  Clock
} from 'lucide-react';
import { dataAdapter } from '../services/dataAdapter';
import toast from 'react-hot-toast';

export const Monitor = () => {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statsData, logsData] = await Promise.all([
        dataAdapter.getSystemStats(),
        dataAdapter.getLogs()
      ]) as [any, any];
      setStats(statsData);
      setLogs(logsData.logs || '');
    } catch (error) {
      console.error('Error fetching monitor data:', error);
      toast.error('Error al conectar con el monitor del sistema');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Autoscroll para los logs
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleClearLogs = async () => {
    if (!window.confirm('¿Estás seguro de vaciar los archivos de log? Esta acción no se puede deshacer.')) return;
    try {
      await dataAdapter.clearLogs();
      setLogs('');
      toast.success('Logs vaciados correctamente');
    } catch (error) {
      toast.error('Error al vaciar logs');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <RefreshCw size={40} className="text-blue-500 animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Iniciando Diagnóstico...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-blue-400 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/10">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Monitor del Sistema</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} className="text-emerald-500" /> Administración Avanzada de MSA Cajeme
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={fetchData}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
           >
             <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
             Sincronizar
           </button>
           <button 
             onClick={handleClearLogs}
             className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
           >
             <Trash2 size={14} />
             Vaciar Logs
           </button>
        </div>
      </header>

      {/* MÉTRICAS VITALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* MEMORIA RAM */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Cpu size={48} />
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Uso de Memoria (RAM)</p>
           <h3 className="text-3xl font-black text-slate-900 mb-2">{stats.memory.percent}</h3>
           <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full transition-all duration-1000 ${parseFloat(stats.memory.percent) > 80 ? 'bg-rose-500' : 'bg-blue-600'}`}
                style={{ width: stats.memory.percent }}
              />
           </div>
           <p className="text-[10px] text-slate-500 font-medium">Usado: {stats.memory.used} / Total: {stats.memory.total}</p>
        </div>

        {/* CPU LOAD */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Server size={48} />
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Carga del CPU (Avg)</p>
           <h3 className="text-3xl font-black text-slate-900 mb-2">{stats.loadAvg[0].toFixed(2)}</h3>
           <p className="text-[10px] text-slate-500 font-medium">{stats.cpuCount} Núcleos Detectados ({stats.arch})</p>
           <div className="flex gap-1 mt-3">
              {[1, 5, 15].map((min, idx) => (
                <div key={min} className="flex-1 flex flex-col items-center">
                   <div className="w-full h-1 bg-slate-100 rounded-full mb-1">
                      <div className="h-full bg-slate-400" style={{ width: `${Math.min(100, stats.loadAvg[idx] * 100)}%` }} />
                   </div>
                   <span className="text-[8px] font-bold text-slate-400">{min}m</span>
                </div>
              ))}
           </div>
        </div>

        {/* UPTIME */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Clock size={48} />
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tiempo de Actividad</p>
           <h3 className="text-xl font-black text-slate-900 mb-2 ">
              {(stats.uptime / 3600).toFixed(1)} Horas
           </h3>
           <p className="text-[10px] text-slate-500 font-medium">Encendido desde inicio del sidecar</p>
        </div>

        {/* DB HEARTBEAT */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Database size={48} />
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Base de Datos</p>
           <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" />
              <h3 className="text-xl font-black text-slate-900">Activa</h3>
           </div>
           <p className="text-[10px] text-slate-500 font-medium">PostgreSQL @ Localhost</p>
        </div>
      </div>

      {/* CONSOLA DE LOGS */}
      <div className="flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-slate-900" />
                  <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Registro de Eventos (Real-time)</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Info</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Error</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Warning</span>
              </div>
          </div>

          <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 font-mono text-[11px] overflow-y-auto custom-scrollbar relative">
              <div className="space-y-1.5">
                  {logs.split('\n').filter(line => line.trim()).map((line, i) => {
                    let color = 'text-slate-300';
                    if (line.includes('ERROR')) color = 'text-rose-400 font-bold';
                    if (line.includes('WARN')) color = 'text-amber-400';
                    if (line.includes('[TICKET]')) color = 'text-blue-400 font-bold';
                    if (line.includes('[BACKUP]')) color = 'text-emerald-400';

                    return (
                      <div key={i} className={`whitespace-pre-wrap ${color}`}>
                        <span className="opacity-40 mr-2">{(i+1).toString().padStart(4, '0')}</span>
                        {line}
                      </div>
                    );
                  })}
                  {logs === '' && (
                    <div className="text-slate-600 italic text-center py-20">Esperando eventos del sistema...</div>
                  )}
                  <div ref={logEndRef} />
              </div>
              
              {/* Overlay suave inferior */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />
          </div>
      </div>

    </div>
  );
};
