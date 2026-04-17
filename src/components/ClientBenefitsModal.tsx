import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Award } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Client } from '../types';

interface ClientBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

export const ClientBenefitsModal = ({ isOpen, onClose, client }: ClientBenefitsModalProps) => {
  const { updateClient } = useStore();
  const [benefits, setBenefits] = useState('');

  useEffect(() => {
    if (client && isOpen) {
      setBenefits(client.benefits || '');
    } else {
      setBenefits('');
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateClient(client.id, { benefits });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Overlay con blur y animación suave */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Contenedor del Modal Táctico */}
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in slide-in-from-bottom-8 zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Decoración lateral color esmeralda */}
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-emerald-500" />
        
        <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative overflow-hidden pl-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
               <Award className="text-emerald-500" size={24} /> Beneficios Asignados
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">
              Define los privilegios especiales o notas de lealtad para <span className="text-emerald-600">{client.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-2 rounded-full transition-all active:scale-95 z-10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pl-10 overflow-y-auto">
          <div className="space-y-6">
            <div className="space-y-1.5 focus-within:text-slate-900 transition-colors group">
              <label className="text-xs font-bold text-emerald-600 group-focus-within:text-emerald-700 transition-colors flex items-center gap-1.5">
                 <span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">✦</span> Privilegios / Recompensas
              </label>
              <div className="relative">
                <textarea
                  className="w-full bg-white border border-slate-200 border-l-2 border-l-emerald-500 rounded-xl py-3.5 px-4 text-sm font-medium text-slate-800 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all min-h-[140px] resize-none placeholder:text-slate-300 shadow-sm leading-relaxed"
                  placeholder="Ej. Revisión Exprés, Lavado VIP, Descuento 10% en mano de obra..."
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 border border-emerald-500"
            >
              <Save size={16} />
              Guardar Beneficios
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
