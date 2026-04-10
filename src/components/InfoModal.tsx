import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'success' | 'warning';
}

export const InfoModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info'
}: InfoModalProps) => {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-8">
      <div 
        className="absolute inset-0 bg-[#0a1428]/80 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Contenedor del Modal con animación suave */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-10">
        <div className="p-8 text-center">
            {/* Header Icon Section */}
            <div className={`
                w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center
                border shadow-lg relative overflow-hidden
                ${type === 'warning' ? 'bg-amber-50 border-amber-100 shadow-amber-500/10' : 'bg-blue-50 border-blue-100 shadow-blue-500/10'}
            `}>
                <div className={`absolute inset-0 opacity-20 ${type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="relative z-10">
                    {type === 'warning' ? <Info size={36} className="text-amber-500" /> : <Info size={36} className="text-blue-500" />}
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight uppercase">
                {title}
            </h2>
            
            <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed px-4">
                {message}
            </p>

            <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={onClose}
                  className="px-6 py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                      onConfirm();
                      onClose();
                  }}
                  className={`
                      px-6 py-4 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest shadow-xl active:scale-95 text-white
                      ${type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}
                  `}
                >
                  {confirmText}
                </button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
