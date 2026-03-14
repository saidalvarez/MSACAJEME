import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, CheckCircle, ChevronDown, ChevronRight, PackageOpen, Award, Crown, Shield, Star } from 'lucide-react';
import { useClients } from '../context/ClientContext';
import { useTickets } from '../context/TicketContext';
import { useSales } from '../context/SalesContext';
import { formatCurrency } from '../utils/format';

export const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { clients } = useClients();
  const { tickets } = useTickets();
  const { sales } = useSales();

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const client = clients.find(c => c.id === id);

  if (!client) {
    return (
      <div className="p-6 text-center text-gray-500">
        <h2>Cliente no encontrado</h2>
        <Link to="/clientes" className="text-blue-500 hover:underline">Volver a Clientes</Link>
      </div>
    );
  }

  // Find history using the client's name
  const clientTickets = tickets.filter(t => t.clientName === client.name);
  const clientSales = sales.filter(s => s.clientName === client.name);
  
  const totalSpentTickets = clientTickets.reduce((sum, ticket) => sum + ticket.total, 0);
  const totalSpentSales = clientSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSpent = totalSpentTickets + totalSpentSales;

  const totalVisits = clientTickets.length + clientSales.length;

  const getClientStats = () => {
    if (totalVisits === 0) return null;

    const visits = totalVisits;

    let rank = { name: 'Bronce', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Award size={14} />, perk: 'Cliente Nuevo' };
    
    if (visits >= 10 || totalSpent >= 25000) {
      rank = { name: 'Diamante', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <Crown size={14} />, perk: 'Lavado/Aspirado Gratis' };
    } else if (visits >= 5 || totalSpent >= 10000) {
      rank = { name: 'Oro', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Star size={14} />, perk: 'Revisión Express Gratis' };
    } else if (visits >= 2) {
      rank = { name: 'Plata', color: 'bg-slate-200 text-slate-700 border-slate-300', icon: <Shield size={14} />, perk: 'Aromatizante de Regalo' };
    }

    return rank;
  };

  const currentRank = getClientStats();

  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in">
      {/* Header con botón regresar */}
      <div className="mb-6 flex items-center gap-4">
        <Link to="/clientes" className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            Historial del Cliente
          </h1>
          <p className="text-gray-500 text-sm">Resumen de servicios y cotizaciones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Izquierdo: Info del Cliente */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
                <div className="flex flex-col gap-1 items-start mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
                    ID: {client.id}
                  </span>
                  {currentRank && (
                    <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 border ${currentRank.color}`}>
                      {currentRank.icon} Nivel {currentRank.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" /> {client.phone}
              </div>
              {client.email && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail size={16} className="text-gray-400" /> {client.email}
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100">
                <span className="font-bold block mb-1">Notas:</span>
                {client.notes}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-sm text-white relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-slate-400 text-sm font-medium mb-1 flex items-center justify-between">
                  <span>Total Invertido</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{totalVisits} Operaciones</span>
                </p>
                <p className="text-3xl font-bold text-emerald-400 mb-4">{formatCurrency(totalSpent)}</p>
                
                {currentRank && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">Beneficio Actual:</p>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 font-medium text-blue-300 text-sm">
                       ✨ {currentRank.perk}
                    </div>
                  </div>
                )}
             </div>
             <User size={100} className="absolute -right-6 -bottom-6 text-slate-800 opacity-50" />
          </div>
        </div>

        {/* Lado Derecho: Historial */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tickets */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CheckCircle size={18} className="text-emerald-500" /> Trabajos Realizados (Tickets)
            </h3>
            
            {clientTickets.length === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-6">No hay tickets registrados aún.</p>
            ) : (
              <div className="space-y-4">
                {clientTickets.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ticket => (
                  <div key={ticket.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white hover:border-blue-200 transition-colors shadow-sm">
                    {/* Botón de Cabecera del Accordion */}
                    <button 
                      onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                      className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${expandedTicketId === ticket.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                           {expandedTicketId === ticket.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500 mb-1 block">TICKET #{ticket.ticketNumber} {ticket.vehicle ? `• ${ticket.vehicle}` : ''}</span>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(ticket.date).toLocaleDateString()} a las {new Date(ticket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold text-lg text-emerald-600">{formatCurrency(ticket.total)}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 flex items-center gap-1">
                          <PackageOpen size={12}/> {ticket.items.length} conceptos
                        </span>
                      </div>
                    </button>

                    {/* Contenido Desplegable (Items del Ticket) */}
                    {expandedTicketId === ticket.id && (
                      <div className="bg-slate-50 p-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Detalle del Servicio</h4>
                        <div className="space-y-2">
                          {ticket.items.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-gray-100 shadow-sm">
                               <div className="flex items-center gap-3">
                                  {item.image ? (
                                    <img src={item.image} alt="refaccion" className="w-10 h-10 object-cover rounded bg-gray-100 border border-gray-200" />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                      <PackageOpen size={16} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-bold text-slate-700">{item.name}</p>
                                    <p className="text-xs text-slate-500">Cantidad: {item.quantity}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                                  <p className="text-xs text-slate-400">{formatCurrency(item.price)} c/u</p>
                               </div>
                             </div>
                          ))}
                        </div>
                        {ticket.notes && (
                           <div className="mt-4 p-3 bg-yellow-50/50 border border-yellow-100 rounded text-sm text-yellow-800">
                             <strong>Notas del Ticket:</strong> {ticket.notes}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Sales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <PackageOpen size={18} className="text-emerald-500" /> Ventas Directas (Mostrador)
            </h3>
            
            {clientSales.length === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-6">No hay ventas directas registradas aún.</p>
            ) : (
              <div className="space-y-4">
                {clientSales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(sale => (
                  <div key={sale.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white hover:border-emerald-200 transition-colors shadow-sm">
                    <button 
                      onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                      className="w-full p-4 flex justify-between items-center text-left hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${expandedSaleId === sale.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                           {expandedSaleId === sale.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-600 mb-1 block uppercase">{sale.saleNumber} • {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(sale.date).toLocaleDateString()} a las {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-emerald-600">{formatCurrency(sale.total)}</span>
                      </div>
                    </button>

                    {expandedSaleId === sale.id && (
                      <div className="bg-emerald-50/20 p-4 border-t border-emerald-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Productos Vendidos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {sale.items.map((item, idx) => (
                             <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex justify-between items-center">
                               <div>
                                 <p className="text-sm font-bold text-slate-700">{item.brand}</p>
                                 <p className="text-[10px] text-gray-500 uppercase font-medium">{item.type} • {item.viscosity}</p>
                                 <p className="text-xs text-emerald-600 font-bold mt-1">x{item.quantity}</p>
                               </div>
                               <p className="text-sm font-black text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
