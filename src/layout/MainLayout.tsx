import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  onLogout: () => void;
}

export const MainLayout = ({ onLogout }: MainLayoutProps) => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex relative font-sans selection:bg-primary-500">
      <Sidebar onLogout={onLogout} />
      
      <main className="flex-1 ml-64 p-6 relative z-10 transition-all duration-500">
        <div key={location.pathname} className="max-w-7xl mx-auto animate-page-enter">
            <Outlet />
        </div>
      </main>
    </div>
  );
};
