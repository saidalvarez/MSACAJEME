import { useState } from 'react';
import { Lock, User, AlertCircle, Wrench, Settings, ChevronRight } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const VALID_USER = 'administrador';

export const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validPin = localStorage.getItem('msa_custom_pin') || '1234';

    if (username.toLowerCase() === VALID_USER && pin === validPin) {
      sessionStorage.setItem('msa_auth', 'true');
      onLogin();
    } else {
      setError('Usuario o PIN incorrecto');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden">
      
      {/* Left side: Image Cover (Dark Theme) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-slate-900 flex-col overflow-hidden">
        {/* Background gradient instead of full cover */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/20" />
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Floating Image Center */}
        <div className="relative z-10 flex-1 flex items-center justify-center p-6 animate-[float_6s_ease-in-out_infinite]">
          <div className="relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
             <img 
               src="/logo3.jpeg" 
               alt="Taller MSA" 
               className="relative w-full max-w-[280px] h-auto rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] border border-slate-700/50 object-cover" 
             />
          </div>
        </div>

        <div className="relative z-10 px-10 pb-8 flex-shrink-0 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-3 mb-6 animate-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
             <div className="p-3 bg-blue-500/30 rounded-xl border border-blue-400/50 backdrop-blur-md relative group">
                <div className="absolute inset-0 bg-blue-300/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Wrench className="text-white relative z-10 animate-[pulse_4s_ease-in-out_infinite]" size={32} />
             </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight uppercase drop-shadow-2xl leading-tight animate-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
            MULTISERVICIOS<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
              AUTOMOTRIZ
            </span><br/>
            DE CAJEME
          </h1>
          <p className="text-slate-400 font-bold tracking-widest uppercase mt-4 text-sm shadow-sm opacity-90 inline-flex items-center gap-2">
            <span className="w-8 h-[2px] bg-blue-500"></span> SISTEMA GESTOR DE TALLER // V1.0
          </p>
        </div>
      </div>

      {/* Right side: Login Panel (Dark) */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 lg:p-12 bg-slate-950 relative">
        
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className={`relative w-full max-w-md transition-transform animate-in fade-in zoom-in-95 duration-700 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">MSA</span> Cajeme
            </h1>
            <p className="text-blue-500 font-bold tracking-widest uppercase mt-2 text-sm shadow-sm flex items-center justify-center gap-2">
              <Wrench size={14} /> Sistema Gestor
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-slate-700/50 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] lg:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] relative overflow-hidden group hover:border-slate-600/80 transition-colors duration-500">
            {/* Subtle top border glow */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="absolute -right-10 -top-10 opacity-5">
              <Settings size={140} className="animate-[spin_20s_linear_infinite]" />
            </div>

            <div className="flex items-center gap-3 mb-8 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 rounded-xl shadow-inner border border-blue-500/30 group-hover:scale-105 transition-transform duration-500">
                <Lock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight tracking-wide">Acceso Restringido</h2>
                <p className="text-sm text-slate-400 font-medium">Terminal de Administrador</p>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm font-bold animate-in slide-in-from-top-2 relative z-10">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
                <label className="text-sm font-bold text-slate-300 block mb-2">Usuario Administrador</label>
                <div className="relative group/input">
                  <User size={18} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors duration-300" />
                  <input 
                    type="text"
                    placeholder="administrador"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700/80 text-white placeholder-slate-600 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900 transition-all font-medium shadow-inner"
                    autoFocus
                  />
                  {/* Bottom animated border on focus */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-blue-500 w-0 group-focus-within/input:w-full transition-all duration-300 rounded-b-xl" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
                <label className="text-sm font-bold text-slate-300 block mb-2">PIN de Entrada</label>
                <div className="relative group/input">
                  <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors duration-300" />
                  <input 
                    type="password"
                    placeholder="••••"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950/50 border border-slate-700/80 text-white placeholder-slate-600 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900 transition-all tracking-[0.5em] text-center text-lg font-bold shadow-inner"
                  />
                  {/* Bottom animated border on focus */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-blue-500 w-0 group-focus-within/input:w-full transition-all duration-300 rounded-b-xl" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both pt-2">
                <button 
                  type="submit"
                  className="relative w-full overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(0,0,0,0.3)] transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 group/btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    Conectar al Servidor <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Watermark */}
          <div className="mt-6 text-center opacity-40 hover:opacity-100 transition-opacity">
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
              Desarrollado por <span className="text-blue-500">Said Alvarez</span>
            </p>
          </div>
        </div>
      </div>

      {/* CSS shake and float animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};
