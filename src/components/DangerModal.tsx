import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  requireText?: boolean;
}

export const DangerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'ELIMINAR',
  requireText = false 
}: DangerModalProps) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input and block background scrolling when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      document.body.style.overflow = 'hidden';
      // Mover el scroll del navegador al inicio inmediatamente para evitar desfaces
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = !requireText || inputValue === confirmText;
 
  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-red-200 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-full border border-red-400">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 mb-6 leading-relaxed">
            {message}
          </p>

          {requireText && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <label className="text-sm font-bold text-slate-700 block mb-2">
                Para confirmar, escribe <span className="text-red-600 select-all bg-red-50 px-1 py-0.5 rounded font-mono">{confirmText}</span> a continuación:
              </label>
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmText}
                className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-lg py-2.5 px-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all font-mono"
                autoFocus
              />
            </div>
          )}

          <div className="flex justify-end gap-3 font-medium">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!isConfirmed}
              className={`px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                isConfirmed 
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-red-600/30' 
                  : 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200'
              }`}
            >
              Confirmar Eliminación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
