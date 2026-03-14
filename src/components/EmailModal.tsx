import { useState, useEffect } from 'react';
import { X, Send, Mail } from 'lucide-react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail: string;
  ticketNumber: number;
}

export const EmailModal = ({ isOpen, onClose, defaultEmail, ticketNumber }: EmailModalProps) => {
  const [emailTo, setEmailTo] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Cada vez que se abre, reseteamos/cargamos el email
  useEffect(() => {
    if (isOpen) {
      setEmailTo(defaultEmail || '');
      setEmailCC('vendedor@correo.com'); // Ejemplo de default
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // SIMULACIÓN DE ENVÍO (Aquí conectarías tu backend en el futuro)
    setTimeout(() => {
      alert(`Correo enviado a ${emailTo} con el Ticket #${ticketNumber}`);
      setIsSending(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Mail size={20} className="text-slate-500"/> Enviar ticket por correo
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-5 space-y-4">
          <p className="text-sm text-gray-500 mb-2">
            Se adjunta el PDF del ticket. Si el cliente tiene correo guardado, se autocompleta.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Para (To)</label>
            <input 
              required
              type="email" 
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
              placeholder="cliente@correo.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CC (opcional)</label>
            <input 
              type="email" 
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
              placeholder="vendedor@correo.com"
              value={emailCC}
              onChange={(e) => setEmailCC(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSending}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
            >
              {isSending ? 'Enviando...' : <><Send size={16} /> Enviar</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};