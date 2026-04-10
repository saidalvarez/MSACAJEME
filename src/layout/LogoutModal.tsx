import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';

interface LogoutModalProps {
  showModal: boolean;
  isLoggingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutModal = ({ showModal, isLoggingOut, onCancel, onConfirm }: LogoutModalProps) => {
  if (!showModal && !isLoggingOut) return null;

  return (
    <>
      {showModal && !isLoggingOut && createPortal(
        <div className="fixed inset-0 z-[999] bg-blue-950/80 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-200 animate-in zoom-in-95 duration-300 z-10">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">¿Cerrar Sesión?</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Se detendrá tu sesión actual y volverás a la pantalla de ingreso.</p>
            <div className="flex gap-3 font-bold uppercase tracking-widest text-[10px]">
              <button 
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
              >
                Salir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isLoggingOut && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-blue-950/90 animate-in fade-in duration-500" />
          <div className="text-center relative z-10 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 animate-pulse" />
                <LogOut size={48} className="text-blue-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight uppercase">Cerrando Sesión</h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Sincronizando base de datos...</p>
            <div className="mt-8 flex justify-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
