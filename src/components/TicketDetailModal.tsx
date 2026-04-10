import { memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, User, Phone, Mail, Car, 
  Calendar, CheckCircle, RefreshCw, Trash2, 
  Download, Edit2, MessageSquare, ShieldCheck
} from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  onDownload: () => void;
  onWhatsApp: () => void;
  isGenerating?: boolean;
}

export const TicketDetailModal = memo(({ 
  isOpen, 
  onClose, 
  ticket, 
  onDelete, 
  onToggleStatus,
  onDownload,
  onWhatsApp,
  isGenerating
}: TicketDetailModalProps) => {
  if (!isOpen || !ticket) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 lg:p-12">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/80 shadow-2xl" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] z-10 border border-slate-200">
        
        {/* Left Side: Client & Vehicle Summary */}
        <div className="w-full md:w-80 bg-slate-900 p-8 text-white flex flex-col shrink-0">
          <div className="flex justify-between items-start mb-8 md:hidden">
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-white/5">
              FOLIO #{ticket.ticket_number || ticket.ticketNumber}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="mb-10 text-center md:text-left">
            <div className="w-20 h-20 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto md:mx-0 border border-primary-500/30">
                <User size={40} className="text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight leading-tight">{ticket.client_name || ticket.clientName}</h2>
            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
              ticket.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
            }`}>
              {ticket.status === 'completed' ? <CheckCircle size={12} /> : <RefreshCw size={12} />}
              {ticket.status === 'completed' ? 'Finalizado' : 'En Proceso'}
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-primary-500" /> Datos del Cliente
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <Phone size={14} className="text-slate-500" />
                        <span className="font-semibold">{ticket.client_phone || ticket.clientName || 'Sin Teléfono'}</span>
                    </div>
                    {ticket.client_email && (
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={14} className="text-slate-500" />
                            <span className="font-medium text-slate-300 truncate">{ticket.client_email}</span>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                    <Car size={14} className="text-primary-500" /> Referencia Vehicular
                </h3>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                    <p className="text-lg font-bold uppercase tracking-tight">{ticket.vehicle || 'No Especificado'}</p>
                    {ticket.plates && (
                        <div className="inline-block bg-white/10 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-white/10">
                            {ticket.plates}
                        </div>
                    )}
                </div>
            </section>
          </div>

          <div className="mt-auto pt-8 border-t border-white/10 hidden md:block">
             <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600 mb-2">Fecha de Registro</div>
             <div className="text-xs font-medium text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <Calendar size={12} />
                {new Date(ticket.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
             </div>
          </div>
        </div>

        {/* Right Side: Items and Actions */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
          {/* Header Desktop */}
          <div className="hidden md:flex justify-between items-center p-8 border-b border-slate-200 bg-white">
            <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Detalles del Folio</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">#{ticket.ticket_number || ticket.ticketNumber}</h3>
            </div>
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-200 shadow-sm active:scale-95">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-8 flex-1">
            {/* Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-900 px-6 py-3 text-white">
                    <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-widest">
                        <div className="col-span-8">Descripción del Servicio</div>
                        <div className="col-span-1 text-center">Cant</div>
                        <div className="col-span-3 text-right">Monto</div>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {ticket.items?.map((item: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                            <div className="col-span-8">
                                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{item.name}</p>
                            </div>
                            <div className="col-span-1 text-center text-xs font-bold text-slate-400">{item.quantity}</div>
                            <div className="col-span-3 text-right text-xs font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</div>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Acumulado</span>
                        <div className="text-2xl font-black text-primary-600 tracking-tighter">
                            {formatCurrency(ticket.total)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {ticket.notes && (
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Observaciones Técnicas</h4>
                    <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl">
                        <p className="text-sm text-amber-900 italic font-medium leading-relaxed">
                            "{ticket.notes}"
                        </p>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Diseño de Impresión:</span>
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-slate-200 shadow-sm">
                        { (ticket.format_type || ticket.formatType) === 'basic' ? '📄 Básico / Simple' : 
                          (ticket.format_type || ticket.formatType) === 'payment_info' ? '💳 Con Datos de Pago' : 
                          '📋 Estándar MSA' }
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button 
                  onClick={onDownload} 
                  disabled={isGenerating}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 hover:bg-blue-50/50 transition-all group active:scale-95 shadow-sm disabled:opacity-50"
                >
                    {isGenerating ? <RefreshCw size={20} className="text-blue-600 animate-spin mb-2" /> : <Download size={20} className="text-slate-400 group-hover:text-blue-600 mb-2" />}
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-600">
                        {isGenerating ? 'Generando...' : 'PDF'}
                    </span>
                </button>
                <button onClick={onWhatsApp} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group active:scale-95 shadow-sm">
                    <MessageSquare size={20} className="text-slate-400 group-hover:text-emerald-600 mb-2" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-emerald-600">WhatsApp</span>
                </button>
                <Link to={`/editar/${ticket.id}`} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-amber-200 hover:bg-amber-50/50 transition-all group active:scale-95 shadow-sm">
                    <Edit2 size={20} className="text-slate-400 group-hover:text-amber-600 mb-2" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-amber-600">Editar</span>
                </Link>
                <button onClick={() => onDelete(ticket.id)} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-red-200 hover:bg-red-50/50 transition-all group active:scale-95 shadow-sm">
                    <Trash2 size={20} className="text-slate-400 group-hover:text-red-600 mb-2" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-red-600">Eliminar</span>
                </button>
              </div>
            </div>

            <button 
                onClick={() => onToggleStatus(ticket.id, ticket.status)}
                className={`w-full h-14 rounded-2xl font-bold uppercase tracking-[0.2em] text-[11px] transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 ${
                    ticket.status === 'completed' 
                    ? 'bg-amber-500 text-white shadow-amber-900/20 hover:bg-amber-600' 
                    : 'bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-500'
                }`}
            >
                {ticket.status === 'completed' ? <RefreshCw size={18} /> : <CheckCircle size={18} />}
                {ticket.status === 'completed' ? 'Reabrir para ajustes' : 'Completar y Finalizar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
