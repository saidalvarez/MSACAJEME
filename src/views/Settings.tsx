import { useState } from 'react';
import { Settings as SettingsIcon, Lock, CheckCircle2 } from 'lucide-react';

export const Settings = () => {
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);

  const handleSavePin = () => {
    if (newPin.length === 4) {
      localStorage.setItem('msa_custom_pin', newPin);
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 3000);
      setNewPin('');
    }
  };

  return (
    <div className="p-6 min-h-screen font-sans animate-in fade-in bg-gray-50 text-slate-800">
      
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-slate-900 text-white p-2 rounded-lg"><SettingsIcon size={20} /></span> 
            Configuración
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ajustes visuales y del sistema</p>
        </div>
      </header>

      <div className="max-w-3xl grid gap-6">

        {/* Acerca de */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            Acerca de este Software
          </h2>
          <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-full flex items-center justify-center text-white text-3xl mb-4 shadow-lg shadow-blue-500/20">
              🪽
            </div>
            <h3 className="font-bold text-xl mb-1">Sistema de Gestión · MSA</h3>
            <p className="text-gray-500 text-sm mb-6">Versión 2.0.0 — Optimizado para alto rendimiento</p>
            
            <div className="text-sm font-medium bg-white px-6 py-3 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
              Creado por <span className="font-bold text-blue-600">Said Alvarez</span> <span className="animate-pulse text-lg">🪽</span>
            </div>
          </div>
        </section>

        {/* Seguridad */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
            <Lock size={20} className="text-blue-500" /> Seguridad y Acceso
          </h2>
          
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Cambiar PIN de Administrador</h3>
            <p className="text-xs text-slate-500 mb-4">El nuevo PIN debe contener exactamente 4 dígitos numéricos.</p>
            
            <div className="flex items-center gap-3">
              <input 
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  setPinSaved(false);
                }}
                placeholder="4 dígitos"
                className="w-32 border border-slate-300 rounded-lg py-2 px-3 text-center tracking-[0.3em] font-bold text-slate-700 focus:border-blue-500 outline-none transition-colors"
              />
              <button 
                onClick={handleSavePin}
                disabled={newPin.length !== 4}
                className={`py-2 px-4 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  newPin.length === 4 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Actualizar PIN
              </button>
              
              {pinSaved && (
                <span className="text-emerald-500 flex items-center gap-1 text-sm font-bold animate-in zoom-in-50 fade-in duration-300">
                  <CheckCircle2 size={16} /> ¡PIN Guardado!
                </span>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
