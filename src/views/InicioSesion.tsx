import { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, ChevronRight, Wrench, Settings, Gauge, CheckCircle2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { lazyStore } from '../store/tauriStore';

interface LoginProps {
  onLogin: () => void;
}

export const InicioSesion = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Force password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempRefreshToken, setTempRefreshToken] = useState('');
  
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    name: 'msa_cajeme',
    user: 'postgres',
    password: ''
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'server_off' | 'db_fail'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSuccess) return;
    
    setError('');
    setLoading(true);
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pin })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if forced password change is required
        if (data.force_password_change) {
          setTempToken(data.token);
          setTempRefreshToken(data.refreshToken);
          setShowPasswordChange(true);
          setLoading(false);
          return;
        }
        
        sessionStorage.setItem('msa_token', data.token);
        sessionStorage.setItem('msa_refresh_token', data.refreshToken);
        sessionStorage.setItem('msa_auth', 'true');
        setIsSuccess(true);
        setTimeout(() => {
          onLogin();
        }, 1500);
      } else {
        setError(data.error || 'Autenticación fallida');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
       setError('Error de conexión con el servidor principal');
       setShake(true);
       setTimeout(() => setShake(false), 600);
    } finally {
      if (!isSuccess && !showPasswordChange) {
        setLoading(false);
      }
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setPasswordLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        toast.success('¡Contraseña actualizada!');
        sessionStorage.setItem('msa_token', tempToken);
        sessionStorage.setItem('msa_refresh_token', tempRefreshToken);
        sessionStorage.setItem('msa_auth', 'true');
        setShowPasswordChange(false);
        setIsSuccess(true);
        setTimeout(() => {
          onLogin();
        }, 1500);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error al cambiar contraseña');
      }
    } catch {
      toast.error('Error de conexión al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  const API_BASE = 'http://localhost:3001/api';

  const handleSaveConfig = async () => {
    setTestStatus('testing');
    setTestMessage('Enviando configuración...');
    try {
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      let nodeApiError = false;

      try {
        const response = await fetch(`${API_BASE}/config/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: dbConfig.host,
            db_name: dbConfig.name,
            user: dbConfig.user,
            password: dbConfig.password
          })
        });
        if (!response.ok) nodeApiError = true;
      } catch {
        nodeApiError = true;
      }

      if (!isTauri && nodeApiError) {
        throw new Error('Error de conexión web');
      }

      if (isTauri) {
        await (lazyStore as any).setAll({
            host: dbConfig.host,
            port: '5432',
            name: dbConfig.name,
            user: dbConfig.user,
            password: dbConfig.password
        });
        setTestStatus('ok');
        setTestMessage('¡Bóveda guardada! Reiniciando servidor local...');
        toast.success('Bóveda configurada');
        
        await (lazyStore as any).restartBackend();
        setTimeout(async () => {
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const r = await fetch(`${API_BASE}/health`);
              if (r.ok) {
                const d = await r.json();
                if (d.database === 'connected') {
                  setTestStatus('ok');
                  setTestMessage('✅ ¡Base de datos vinculada exitosamente!');
                  toast.success('¡Conexión establecida!');
                  setTimeout(() => window.location.reload(), 1500);
                  return;
                }
              }
            } catch { /* server restarting */ }
          }
          setTestStatus('db_fail');
          setTestMessage('El servidor reinició pero no conectó a la BD. Verifica los datos.');
        }, 2000);
        
      } else {
        setTestStatus('ok');
        setTestMessage('¡Configuración guardada! Reiniciando servidor...');
        toast.success('Configuración guardada');
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch {
      setTestStatus('server_off');
      setTestMessage('No se pudo conectar al servidor. ¿Está corriendo el backend?');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Probando conexión...');
    
    for (let i = 0; i < 3; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (data.database === 'connected') {
            setTestStatus('ok');
            setTestMessage('✅ Servidor activo y base de datos conectada');
            return;
          } else {
            setTestStatus('db_fail');
            setTestMessage('⚠️ Servidor activo pero la base de datos NO conecta. Revisa los datos.');
            return;
          }
        } else {
          const data = await response.json();
          setTestStatus('db_fail');
          setTestMessage(`⚠️ Servidor activo pero BD desconectada: ${data.error || 'Error desconocido'}`);
          return;
        }
      } catch {
        if (i === 2) {
          setTestStatus('server_off');
          setTestMessage('❌ El servidor no responde. Asegúrate de que esté prendido.');
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#0a0f1c] flex flex-col lg:flex-row relative font-sans selection:bg-blue-500/30 text-slate-200 lg:overflow-hidden overflow-y-auto">
      
      {/* PROFESSIONAL BACKGROUND LAYERS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen transform translate-x-1/3 -translate-y-1/3 animate-pulse-slow fixed" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[120px] mix-blend-screen transform -translate-x-1/3 translate-y-1/3 fixed" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHptMjAgMjB2MjBoMjBWMjBIMjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+')] opacity-20 bg-repeat fixed" />
      </div>

      {/* Left side: Professional Cover */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center p-8 z-10 min-h-screen overflow-y-auto custom-scrollbar">
        <div className={`relative flex flex-col items-center justify-center w-full max-w-lg transition-all duration-1000 transform my-auto ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            
            {/* Logo Container with 3D Float and Glow */}
            <div className="relative mb-8 group animate-float perspective-1000 mt-4">
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition duration-700 ease-in-out"></div>
                <div className="relative rounded-full p-1 bg-gradient-to-tr from-slate-800 to-slate-600 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] transform transition-transform duration-500 hover:scale-[1.03] hover:-rotate-1">
                  <div className="rounded-full overflow-hidden bg-slate-950 border-4 border-slate-900 w-48 h-48 xl:w-56 xl:h-56 flex items-center justify-center relative">
                    <img 
                        src="/logo3.jpeg" 
                        alt="MSA Logo" 
                        className="w-full h-full object-cover scale-105" 
                    />
                  </div>
                </div>
            </div>
            
            <div className="text-center w-full">
                <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 drop-shadow-lg">
                    MULTISERVICIOS <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">AUTOMOTRIZ</span> <br/>
                    <span className="text-xl text-slate-400 tracking-[0.4em] font-semibold mt-4 block uppercase shadow-sm">CAJEME</span>
                </h1>
                
                <div className="flex items-center justify-center gap-4 xl:gap-6 mt-8 xl:mt-10 flex-wrap pb-8">
                    <div className="flex flex-col items-center gap-2 px-5 py-3 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner transition-transform hover:-translate-y-1 duration-300">
                        <Gauge size={22} className="text-blue-400" />
                        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Precisión</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-5 py-3 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner transition-transform hover:-translate-y-1 duration-300 delay-100">
                        <Wrench size={22} className="text-cyan-400" />
                        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Calidad</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-5 py-3 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner transition-transform hover:-translate-y-1 duration-300 delay-200">
                        <Settings size={22} className="text-blue-400 animate-spin-slow" />
                        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Expertise</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Right side: Login Panel */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 z-20 min-h-screen relative overflow-y-auto">
        <div className={`w-full max-w-md flex flex-col transition-all duration-1000 transform my-auto ${showContent ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'} ${shake ? 'animate-shake' : ''}`}>
           
          {isSuccess ? (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-blue-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500 rounded-3xl m-4 overflow-hidden border border-white/10 shadow-2xl h-[400px] my-auto">
                <div className="text-center relative p-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-pulse">
                        <CheckCircle2 size={40} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
                        ACCESO CONCEDIDO
                    </h2>
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-emerald-400 font-semibold uppercase tracking-[0.2em] text-[10px]">
                            Estableciendo conexión...
                        </p>
                        <div className="h-1.5 w-40 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-loading-bar" />
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center lg:text-left space-y-2 mt-4 lg:mt-0">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                      <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Taller MSA v1.2.3</span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight">Portal Gestor</h2>
                  <p className="text-slate-400 font-medium text-sm tracking-wide">Ingresa tus credenciales autorizadas asignadas.</p>
              </div>

              {/* Form Card */}
              <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] relative overflow-hidden group shrink-0">
                  {/* Card highlights */}
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                  {/* Error Message */}
                  <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-24 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase shadow-sm">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>{error}</span>
                      </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                      
                      {/* Username input */}
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Identidad de Operador</label>
                          <div className="relative group/input">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/input:text-blue-400" size={18} />
                              <input 
                                  type="text"
                                  placeholder="Ej. administrador"
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                                  disabled={loading}
                                  className="w-full bg-slate-950/80 border border-slate-700/60 text-white rounded-2xl py-3.5 pl-11 pr-4 outline-none transition-all duration-300 font-medium tracking-wide placeholder:text-slate-600 text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900 shadow-inner disabled:opacity-50"
                                  autoFocus
                              />
                          </div>
                      </div>

                      {/* Password input */}
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Clave de Acceso</label>
                          <div className="relative group/input">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/input:text-blue-400" size={18} />
                              <input 
                                  type="password"
                                  placeholder="••••••••"
                                  value={pin}
                                  onChange={(e) => setPin(e.target.value)}
                                  disabled={loading}
                                  className="w-full bg-slate-950/80 border border-slate-700/60 text-white rounded-2xl py-3.5 pl-11 pr-4 outline-none transition-all duration-300 font-bold tracking-[0.3em] placeholder:text-slate-600 placeholder:tracking-widest text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900 shadow-inner disabled:opacity-50"
                              />
                          </div>
                      </div>

                      <div className="pt-2 space-y-3">
                          <button 
                              type="submit"
                              disabled={loading}
                              className="relative w-full overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl border border-blue-400/20 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 group/btn disabled:opacity-80 disabled:pointer-events-none mt-2"
                          >
                              {loading ? (
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                  <>
                                      <span className="relative z-10 text-sm tracking-widest uppercase">Iniciar Sesión</span>
                                      <ChevronRight size={18} className="relative z-10 group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                                  </>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/10 to-blue-400/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover/btn:translate-x-full ease-in-out"></div>
                          </button>
                          

                      </div>
                  </form>
              </div>

              {/* Dynamic bottom text that flows naturally instead of overlapping */}
              <div className={`mt-10 mb-4 text-center transition-all duration-1000 delay-500 shrink-0 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="text-slate-600 text-[10px] font-bold tracking-widest uppercase mb-1">
                      Gestor de Taller v1.2.3
                  </p>
                  <div className="flex items-center justify-center gap-2 text-slate-700 text-[9px] font-semibold tracking-widest uppercase">
                      <span>Desarrollo Exclusivo por</span>
                      <span className="text-blue-500/70">Said Álvarez</span>
                  </div>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Force Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
           <div className="relative bg-slate-900 border border-amber-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-amber-500/20">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center uppercase tracking-tight">Cambio de Contraseña Requerido</h3>
              <p className="text-slate-400 text-xs mb-6 text-center font-medium leading-relaxed">
                Por seguridad, debes establecer una contraseña personal antes de acceder al sistema.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="password"
                      placeholder="Mínimo 4 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-sm font-medium tracking-widest"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="password"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-sm font-medium tracking-widest"
                    />
                  </div>
                </div>
                
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">Las contraseñas no coinciden</p>
                )}

                <button 
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-amber-600/20 disabled:opacity-40 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Establecer Contraseña y Entrar
                    </>
                  )}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Connection Config Button (Floating) */}
      <button 
        onClick={() => setShowConfig(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all shadow-xl z-50 group active:scale-95"
        title="Configurar Servidor"
      >
        <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* Connection Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConfig(false)} />
           <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                <Settings size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">Vincular Base de Datos</h3>
              <p className="text-slate-400 text-[10px] mb-6 font-medium">Ingresa los datos de tu PostgreSQL local para sincronizar el sistema.</p>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Host</label>
                    <input type="text" value={dbConfig.host}
                      onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-3 outline-none focus:border-blue-500/50 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre de la BD</label>
                    <input type="text" value={dbConfig.name}
                      onChange={(e) => setDbConfig({...dbConfig, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-3 outline-none focus:border-blue-500/50 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Usuario PostgreSQL</label>
                    <input type="text" value={dbConfig.user}
                      onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-3 outline-none focus:border-blue-500/50 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña PostgreSQL</label>
                    <input type="password" value={dbConfig.password}
                      onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-3 outline-none focus:border-blue-500/50 text-xs" />
                  </div>
                </div>

                {/* Status Panel */}
                {testStatus !== 'idle' && (
                  <div className={`rounded-2xl p-4 border text-center ${
                    testStatus === 'testing' ? 'bg-blue-500/5 border-blue-500/20' :
                    testStatus === 'ok' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    'bg-red-500/5 border-red-500/20'
                  }`}>
                    {testStatus === 'testing' && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-blue-400 text-xs font-semibold">{testMessage}</span>
                      </div>
                    )}
                    {testStatus === 'ok' && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                        <span className="text-emerald-400 text-xs font-semibold">{testMessage}</span>
                      </div>
                    )}
                    {(testStatus === 'server_off' || testStatus === 'db_fail') && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-red-400 text-xs font-semibold">{testMessage}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                    {testStatus === 'testing' ? 'Probando...' : 'Probar Conexión'}
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConfig(false)}
                      className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 transition-all">
                      Cerrar
                    </button>
                    <button onClick={handleSaveConfig}
                      disabled={testStatus === 'testing'}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
                      Guardar y Vincular
                    </button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        /* Custom scrollbar to avoid bulky native scrollbars causing layout shifts */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes loading-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-loading-bar { animation: loading-bar 1.5s ease-in-out forwards; }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        .animate-float {
          animation: float 7s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}</style>
    </div>
  );
};
