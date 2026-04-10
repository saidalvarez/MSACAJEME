import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Send, Loader2 } from 'lucide-react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail: string | null;
  ticketNumber: string | number;
}

export const EmailModal = ({ isOpen, onClose, defaultEmail, ticketNumber }: EmailModalProps) => {
  const [emailTo, setEmailTo] = useState(defaultEmail || '');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // SIMULACIÓN DE ENVÍO
    setTimeout(() => {
      alert(`Correo enviado a ${emailTo} con el Ticket #${ticketNumber}`);
      setIsSending(false);
      onClose();
    }, 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Solid dark overlay without blur to prevent lag */}
      <div className="absolute inset-0 bg-[#0a1428]/80 transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-0 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Mail size={20} className="text-slate-500"/> Enviar por correo
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-5">
          <p className="text-sm text-gray-500 font-medium">
            Se adjuntará automáticamente el PDF del ticket generado.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Correo del Cliente</label>
            <input 
              required
              type="email" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="cliente@correo.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end pt-2 font-bold uppercase tracking-widest text-[10px]">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSending}
              className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
