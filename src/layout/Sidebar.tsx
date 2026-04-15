import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, PlusCircle, ShoppingCart, Settings, 
  Users, DollarSign, Package, LogOut, FileText, StickyNote, Activity 
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar = ({ onLogout }: SidebarProps) => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const linkClass = (path: string) => {
    const activeItem = isActive(path);
    return `
      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
      ${activeItem 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
      text-sm font-medium
    `;
  };

  return (
    <aside className="w-64 h-full flex flex-col fixed left-0 top-0 z-50 shadow-xl bg-[#0a1428] border-r border-white/5">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Settings size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Sistema MSA</h1>
              <p className="text-sm text-blue-400 font-medium tracking-tight">Sistema MSA versión 1.2.3</p>
            </div>
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        <Link to="/" className={linkClass('/')}>
          <LayoutDashboard size={16} /> 
          <span>Panel de Control</span>
        </Link>
        
        <Link to="/nuevo" className={linkClass('/nuevo')}>
          <PlusCircle size={16} /> 
          <span>Nuevo Servicio</span>
        </Link>
        
        <Link to="/nueva-venta" className={linkClass('/nueva-venta')}>
          <ShoppingCart size={16} /> 
          <span>Ventas</span>
        </Link>
        
        <Link to="/clientes" className={linkClass('/clientes')}>
          <Users size={16} /> 
          <span>Directorio</span>
        </Link>
        
        <Link to="/inventario" className={linkClass('/inventario')}>
          <Package size={16} /> 
          <span>Inventario</span>
        </Link>

        <Link to="/bitacora" className={linkClass('/bitacora')}>
          <FileText size={16} /> 
          <span>Bitácora</span>
        </Link>

        <Link to="/finanzas" className={linkClass('/finanzas')}>
          <DollarSign size={16} /> 
          <span>Finanzas</span>
        </Link>
        
        <Link to="/notas" className={linkClass('/notas')}>
          <StickyNote size={16} /> 
          <span>Notas</span>
        </Link>
        
        <Link to="/monitor" className={linkClass('/monitor')}>
          <Activity size={16} /> 
          <span>Sistema</span>
        </Link>
      </nav>

      <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
        <div className="mb-3 flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Servidor Activo</span>
          <span className="text-[8px] font-semibold text-slate-500 ml-auto">SQL</span>
        </div>
        
        <div className="rounded-xl p-2.5 mb-3 flex flex-col items-center justify-center bg-white/5 border border-white/5">
          <span className="text-base font-semibold text-white tracking-widest">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
            {time.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        <Link to="/configuracion" className={linkClass('/configuracion')}>
          <Settings size={16} /> 
          <span>Ajustes</span>
        </Link>
        <button 
          onClick={onLogout}
          className="w-full mt-1 flex items-center justify-center gap-2.5 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold text-[10px] uppercase tracking-widest"
        >
          <LogOut size={14} /> 
          Salir del Sistema
        </button>
      </div>
    </aside>
  );
};
