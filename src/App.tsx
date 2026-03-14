import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Dashboard } from './views/Dashboard';
import { NewTicket } from './views/NewTicket';
import { EditTicket } from './views/EditTicket';
import { Clients } from './views/Clients'; 
import { ClientDetail } from './views/ClientDetail';
import { Finances } from './views/Finances';
import { Inventory } from './views/Inventory';
import { NewSale } from './views/NewSale';
import { Settings as SettingsView } from './views/Settings';
import { Login } from './views/Login';
import { LayoutDashboard, PlusCircle, ShoppingCart, Settings, Users, DollarSign, Package, LogOut } from 'lucide-react';

// Sidebar Component
interface SidebarProps {
  onLogout: () => void;
}

const Sidebar = ({ onLogout }: SidebarProps) => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const linkClass = (path: string) => `
    flex items-center gap-3 p-3 rounded-lg transition-colors
    ${isActive(path) 
      ? 'bg-blue-600 text-white font-medium' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
  `;

  return (
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight leading-tight mb-1">
           Multiservicios Automotriz de Cajeme
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sistema de Gestión</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Menu</p>
        
        <Link to="/" className={linkClass('/')}>
          <LayoutDashboard size={20} /> 
          <span>Dashboard</span>
        </Link>
        
        <Link to="/nuevo" className={linkClass('/nuevo')}>
          <PlusCircle size={20} /> 
          <span>Nuevo Servicio</span>
        </Link>
        
        <Link to="/nueva-venta" className={linkClass('/nueva-venta')}>
          <ShoppingCart size={20} /> 
          <span>Nueva Venta</span>
        </Link>
        
        <Link to="/clientes" className={linkClass('/clientes')}>
          <Users size={20} /> 
          <span>Clientes</span>
        </Link>
        
        <Link to="/inventario" className={linkClass('/inventario')}>
          <Package size={20} /> 
          <span>Inventario</span>
        </Link>

        <Link to="/finanzas" className={linkClass('/finanzas')}>
          <DollarSign size={20} /> 
          <span>Finanzas</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="bg-slate-800/50 rounded-lg p-3 mb-2 flex flex-col items-center justify-center border border-slate-700/50">
          <span className="text-xl font-medium tracking-widest text-white/90">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            {time.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        <Link to="/configuracion" className={linkClass('/configuracion')}>
          <Settings size={20} /> 
          <span className="font-medium">Configuración</span>
        </Link>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors text-left"
        >
          <LogOut size={20} /> 
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

interface LayoutProps {
  onLogout: () => void;
}

const Layout = ({ onLogout }: LayoutProps) => {
  const location = useLocation();
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar onLogout={onLogout} />
      <main className="ml-64 flex-1">
        <div key={location.pathname} className="animate-page-enter">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('msa_auth') === 'true');

  const handleLogout = () => {
    sessionStorage.removeItem('msa_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout onLogout={handleLogout} />}>
          <Route index element={<Dashboard />} />
          <Route path="nuevo" element={<NewTicket />} />
          <Route path="/editar/:id" element={<EditTicket />} />
          <Route path="nueva-venta" element={<NewSale />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="clientes/:id" element={<ClientDetail />} />
          <Route path="finanzas" element={<Finances />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="configuracion" element={<SettingsView />} />
        </Route>
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;