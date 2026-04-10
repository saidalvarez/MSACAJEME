import { Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, FileText } from 'lucide-react'; // Iconos ejemplo

export const Sidebar = () => (
  <aside className="w-64 h-screen bg-slate-900 text-white p-4 fixed left-0 top-0">
    <h1 className="text-xl font-bold mb-8 text-center">AutoService 🔧</h1>
    <nav className="space-y-2">
      <a href="/" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800">
        <LayoutDashboard size={20} /> Dashboard
      </a>
      <a href="/nuevo" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 text-blue-400">
        <PlusCircle size={20} /> Nuevo Ticket
      </a>
      <a href="/cotizaciones" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800">
        <FileText size={20} /> Cotizaciones
      </a>
    </nav>
  </aside>
);

export const Layout = () => {
  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <Outlet /> {/* Aquí se renderizará el Dashboard o el Formulario */}
      </main>
    </div>
  );
};
