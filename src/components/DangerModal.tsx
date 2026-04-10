import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      document.body.style.overflow = 'hidden';
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-8 lg:left-64">
      <div 
        className="absolute inset-0 bg-[#0a1428]/80 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Contenedor del Modal con animación suave */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-red-200 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg border border-red-400">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight uppercase">{title}</h2>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 mb-6 leading-relaxed font-medium text-sm">
            {message}
          </p>

          {requireText && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Para confirmar, escribe <span className="text-red-600 select-all bg-red-50 px-1 py-0.5 rounded font-mono">{confirmText}</span>:
              </label>
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmText}
                className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-lg py-2.5 px-3 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-bold uppercase text-xs tracking-widest"
                autoFocus
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!isConfirmed}
              className={`px-6 py-3 rounded-xl transition-all shadow-lg font-bold text-[10px] uppercase tracking-widest ${
                isConfirmed 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 active:scale-95' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed grayscale'
              }`}
            >
              Confirmar Acción
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
