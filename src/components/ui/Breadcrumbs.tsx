import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbMap: Record<string, string> = {
    'nuevo': 'Nuevo Servicio',
    'editar': 'Editar Servicio',
    'clientes': 'Directorio de Clientes',
    'inventario': 'Almacén de Inventario',
    'finanzas': 'Control de Finanzas',
    'configuracion': 'Ajustes del Sistema',
    'historial': 'Historial de Servicios',
    'nueva-venta': 'Venta Directa'
  };

  return (
    <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40 mb-6 px-1" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-primary-500 transition-colors flex items-center gap-2 pb-0.5">
        <Home size={12} />
        <span>Dashboard</span>
      </Link>
      
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = breadcrumbMap[value] || value;

        // Skip IDs in breadcrumbs if they look like UUIDs or Mongo IDs
        if (value.length > 20) return null;

        return (
          <React.Fragment key={to}>
            <ChevronRight size={10} className="opacity-50" />
            {isLast ? (
              <span className="text-primary-500">{name}</span>
            ) : (
              <Link to={to} className="hover:text-primary-500 transition-colors">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
