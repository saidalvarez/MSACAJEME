import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Lock, Database, Wifi, 
  WifiOff, RefreshCw, Download, User, Trash2, RefreshCcw, Info,
  Trash, FileText, DollarSign, CloudDownload, Terminal
} from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { dataAdapter } from '../services/dataAdapter';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { lazyStore } from '../store/tauriStore.ts';

export const Configuracion = () => {
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);

  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const res: any = await fetch('http://localhost:3001/api/health');
        const data = await res.json();
        
        const codeElement = document.getElementById('current-db-string');
        if (codeElement) {
          if (data.database === 'connected') {
            codeElement.innerText = `postgres://***:***@${data.host || 'localhost'}/${data.db_name || 'msa_cajeme'}`;
          } else {
            codeElement.innerText = 'Desconectado - Revisa los credenciales';
          }
        }
      } catch (err) {
        console.error('Error fetching health:', err);
      }
    };
    fetchDbStatus();
  }, []);
  const isOnline = true;
  const isSyncing = false;
  const [isBackingUp, setIsBackingUp] = useState(false);

  // --- UPDATER ---
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCheckUpdate = async () => {
    try {
      setIsUpdating(true);
      setUpdateStatus('Buscando versión...');
      toast.loading('Buscando actualizaciones...', { id: 'updater' });
      
      const update = await check();
      
      if (update) {
        toast.success(`Versión ${update.version} encontrada. Descargando...`, { id: 'updater' });
        setUpdateStatus(`Instalando v${update.version}...`);
        
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              setUpdateStatus(`Iniciando descarga...`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              if (contentLength > 0) {
                 const percent = Math.round((downloaded / contentLength) * 100);
                 setUpdateStatus(`Descargando: ${percent}%`);
              } else {
                 setUpdateStatus(`Descargando...`);
              }
              break;
            case 'Finished':
              setUpdateStatus('Instalación completa');
              break;
          }
        });

        setUpdateStatus('Reiniciando sistema...');
        toast.success('Actualización instalada. Reiniciando...', { id: 'updater' });
        await relaunch();
      } else {
        toast.success('Ya tienes la versión más reciente.', { id: 'updater' });
        setUpdateStatus('Sistema Actualizado (v1.0.0)');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Error al contactar al servidor de actualización. Verifica tu enlace de GitHub Gist.', { id: 'updater', duration: 5000 });
      setUpdateStatus('Error de conexión');
    } finally {
      setIsUpdating(false);
    }
  };


  const handleSavePin = () => {
    if (newPin.length === 4) {
      localStorage.setItem('msa_custom_pin', newPin);
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 3000);
      setNewPin('');
    }
  };

  const [loadingTrash, setLoadingTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<{tickets: any[], sales: any[]} | null>(null);

  const fetchTrash = async () => {
    try {
      setLoadingTrash(true);
      const data: any = await dataAdapter.getTrash();
      setTrashItems(data);
    } catch(err) {
      toast.error('Error al cargar la papelera');
    } finally {
      setLoadingTrash(false);
    }
  };

  const handleRecover = async (type: 'ticket' | 'sale', id: string) => {
    try {
      await dataAdapter.recoverTrashItem(type, id);
      toast.success('Registro recuperado con éxito');
      fetchTrash();
    } catch(err) {
      toast.error('Error al recuperar');
    }
  };

  const handleForceDelete = async (type: 'ticket' | 'sale', id: string) => {
    if(!window.confirm('¿Seguro que deseas eliminar permanentemente este registro?')) return;
    try {
      await dataAdapter.forceDeleteTrashItem(type, id);
      toast.success('Registro eliminado permanentemente');
      fetchTrash();
    } catch(err) {
      toast.error('Error al eliminar');
    }
  };

  const handleCloudBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await api.post<any>('/backup', {});
      toast.success(`Respaldo creado: ${res.filename}`, { icon: '☁️' });
    } catch (error) {
      console.error(error);
      toast.error('Error al crear respaldo en la nube');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLocalBackup = async () => {
    try {
      toast.loading('Generando respaldo...', { id: 'backup' });
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/backup/export`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('msa_token')}` }
      });
      if (!res.ok) throw new Error('Error al obtener el respaldo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MSA_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success('¡Respaldo Maestro Descargado!', { id: 'backup' });
    } catch (error) {
      toast.error('Error al generar respaldo maestro', { id: 'backup' });
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('⚠️ ADVERTENCIA CRÍTICA: Restaurar un respaldo sobreescribirá TODA la base de datos actual. ¿Estás absolutamente seguro de continuar?')) {
      e.target.value = '';
      return;
    }

    try {
      toast.loading('Restaurando sistema...', { id: 'restore' });
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const res = await fetch(`${API_BASE}/backup/import`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('msa_token')}`
            },
            body: JSON.stringify(json)
          });
          
          if (!res.ok) throw new Error('Error del servidor');
          toast.success('¡Sistema Restaurado con Éxito!', { id: 'restore' });
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          toast.error('El archivo de respaldo es inválido o corrupto', { id: 'restore' });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error('Error al procesar el archivo', { id: 'restore' });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-200">
              <SettingsIcon size={24} />
            </div> 
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Taller MSA versión 1.0</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest">Servidor Activo</span>
          </div>
        </div>
      </header>

      {/* TABLERO DE NOTAS REMOVIDO - AHORA ES UNA SECCIÓN INDEPENDIENTE */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 px-1 flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Enlace de Base de Datos
             <InfoTooltip content="Configura los parámetros de conexión para el servidor PostgreSQL. Si cambias estos datos, el servidor se reiniciará automáticamente para aplicar la nueva conexión." />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Host del Servidor</label>
              <input 
                id="db-host"
                type="text" 
                placeholder="localhost" 
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Puerto</label>
              <input 
                id="db-port"
                type="text" 
                placeholder="5432" 
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre de BD</label>
              <input 
                id="db-name"
                type="text" 
                placeholder="msa_cajeme" 
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Usuario</label>
              <input 
                id="db-user"
                type="text" 
                placeholder="postgres" 
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contraseña</label>
              <input 
                id="db-pass"
                type="password" 
                placeholder="********" 
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <button 
            onClick={async () => {
              const host = (document.getElementById('db-host') as HTMLInputElement).value;
              const port = (document.getElementById('db-port') as HTMLInputElement).value;
              const name = (document.getElementById('db-name') as HTMLInputElement).value;
              const user = (document.getElementById('db-user') as HTMLInputElement).value;
              const password = (document.getElementById('db-pass') as HTMLInputElement).value;

              try {
                toast.loading('Guardando configuración...', { id: 'db-config' });
                
                const token = localStorage.getItem('token') || '';
                const isTauri = !!(window as any).__TAURI_INTERNALS__;
                let nodeApiError = false;

                // Intentamos guardar en el servidor .env (útil para desarrollo / modo web)
                try {
                  const response = await fetch('http://localhost:3001/api/config/database', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ host, db_name: name, user, password, port })
                  });
                  if (!response.ok) nodeApiError = true;
                } catch (e) {
                  nodeApiError = true;
                }

                if (!isTauri && nodeApiError) {
                   throw new Error('Error al guardar en el servidor web');
                }

                // If on Tauri, we save via native command and immediately restart the Rust sidecar
                if (isTauri) {
                  await (lazyStore as any).setAll({ host, port, name, user, password });
                  toast.success('Bóveda configurada. Reiniciando motor local...', { id: 'db-config' });
                  await (lazyStore as any).restartBackend();
                  // Give Rust time to kill and respawn the sidecar
                  setTimeout(() => window.location.reload(), 2500);
                } else {
                  toast.success('Configuración web guardada. Reinicia el API para aplicar cambios.', { id: 'db-config' });
                  setTimeout(() => window.location.reload(), 3000);
                }
              } catch (err) {
                toast.error('Error al guardar la configuración', { id: 'db-config' });
              }
            }}
            className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
          >
            Vincular Base de Datos
          </button>
        </section>

        {/* Estado de Conexión */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 px-1 flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Estado del Servidor
             <InfoTooltip content="Estado de conexión en tiempo real con el backend de MSA." />
          </h2>
          
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div className={`p-6 rounded-2xl border-2 transition-all ${isOnline ? 'bg-slate-50 border-emerald-100' : 'bg-slate-50 border-rose-100 opacity-50'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
                </div>
                <div>
                   <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isOnline ? 'CONECTADO AL MOTOR' : 'DESCONECTADO'}
                   </span>
                   <p className="font-black text-xl text-slate-900">PostgreSQL Backend</p>
                </div>
              </div>
              <div className="bg-white/50 p-3 rounded-lg border border-slate-100">
                <code id="current-db-string" className="text-[10px] font-mono text-slate-400 break-all select-all hover:text-slate-600 transition-colors">
                  Cargando información de conexión...
                </code>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado del Sistema</span>
                {isSyncing && <RefreshCw size={16} className="text-blue-500 animate-spin" />}
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-black ${isOnline ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isOnline ? 'Operativo' : 'Error'}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  v1.0 Professional
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Actualizador */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 px-1 flex items-center gap-2">
             <CloudDownload size={16} className="text-purple-500" /> Sistema Over-The-Air (OTA)
             <InfoTooltip content="Recibe nuevas versiones directamente de tu servidor estático sin memorias USB." />
          </h2>

          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl relative overflow-hidden group hover:border-purple-300 transition-colors">
             <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             
             <div className="relative z-10 text-center space-y-4 w-full">
                <div className="w-20 h-20 mx-auto bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-center text-slate-800 relative">
                   <Terminal size={32} strokeWidth={1.5} />
                   {isUpdating && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-ping"></div>}
                </div>
                
                <div>
                   <h3 className="font-black text-lg text-slate-900 tracking-tight">MSA Remote Updater</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Versión Local: 1.0.0</p>
                </div>

                <div className="pt-4 w-full">
                   <button 
                     onClick={handleCheckUpdate}
                     disabled={isUpdating}
                     className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                     {isUpdating ? 'Procesando...' : 'Buscar Actualización en Gist'}
                   </button>
                   {updateStatus && <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{updateStatus}</p>}
                </div>
             </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Backup & Migration Center */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 px-1 flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Centro de Migración MSA
             <InfoTooltip content="Gestiona respaldos universales para mover tu taller a cualquier otra computadora con un solo clic." />
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <button 
              onClick={handleCloudBackup}
              disabled={!isOnline || isBackingUp}
              className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100 transition-all group flex flex-col items-center justify-center gap-5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                {isBackingUp ? <RefreshCw size={28} className="animate-spin" /> : <Database size={28} />}
              </div>
              <div className="text-center">
                <span className="block font-black text-lg text-slate-900 mb-1 leading-none">Nube</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Respaldo SQL</span>
              </div>
            </button>

            <button 
              onClick={handleLocalBackup}
              className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-100 transition-all group flex flex-col items-center justify-center gap-5"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Download size={28} />
              </div>
              <div className="text-center">
                <span className="block font-black text-lg text-slate-900 mb-1 leading-none">Exportar</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">JSON Maestro</span>
              </div>
            </button>

            <div className="relative group">
              <input 
                type="file" 
                accept=".json"
                onChange={handleRestoreBackup}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="p-8 h-full bg-slate-50 rounded-3xl border border-slate-200 group-hover:border-rose-500 group-hover:shadow-2xl group-hover:shadow-rose-100 transition-all flex flex-col items-center justify-center gap-5">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <RefreshCw size={28} />
                </div>
                <div className="text-center">
                  <span className="block font-black text-lg text-slate-900 mb-1 leading-none">Importar</span>
                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Restaurar Todo</span>
                </div>
              </div>
            </div>
          </div>
        </section>


      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Seguridad */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 px-1 flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Seguridad y Acceso
             <InfoTooltip content="El PIN protege acciones críticas como borrar tickets, ver el historial completo o vaciar la papelera." />
          </h2>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
             <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 relative z-10">
                <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 mb-2">PIN Administrador</h3>
                    <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">
                        Control de acceso total. Define un código de 4 dígitos para autorizar operaciones críticas.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                      <Lock className="absolute left-3 top-3 text-slate-400" size={14} />
                      <input 
                        type="password"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => {
                          setNewPin(e.target.value.replace(/\D/g, ''));
                          setPinSaved(false);
                        }}
                        placeholder="0000"
                        className="w-28 bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-center tracking-widest font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                      />
                  </div>
                  <button 
                    onClick={handleSavePin}
                    disabled={newPin.length !== 4}
                    className={`py-2.5 px-5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                      newPin.length === 4 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Actualizar
                  </button>
                </div>
             </div>
             
             {pinSaved && (
                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 animate-in zoom-in-95 duration-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">PIN Guardado con Éxito</span>
                </div>
             )}
          </div>
        </section>

        {/* Papelera de Reciclaje */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-400">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-slate-400 px-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" /> Papelera de Reciclaje
            </h2>
            <button 
              onClick={fetchTrash}
              className="text-xs flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wider border border-slate-200 shadow-sm"
            >
              <RefreshCcw size={14} className={loadingTrash ? 'animate-spin' : ''} /> 
              Cargar Archivos
            </button>
          </div>

          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-6 flex items-start gap-3">
             <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
             <p className="text-xs text-orange-800 font-medium">Los elementos borrados ("Soft Deletes") se archivan aquí. Los registros con más de 15 días son purgados diariamente de la base de datos a la 1:00 AM para evitar acumular memoria.</p>
          </div>
          
          {trashItems && (
            <div className="space-y-4">
              {trashItems.tickets.length === 0 && trashItems.sales.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 font-medium font-sm shadow-inner">
                  La papelera está completamente vacía.
                </div>
              ) : (
                <>
                  {trashItems.tickets.length > 0 && (
                    <div className="space-y-3">
                       <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest px-1">Servicios / Tickets</h3>
                       {trashItems.tickets.map(t => (
                         <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 group/item hover:border-primary-200 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary-600 shadow-sm border border-slate-100">
                                   <FileText size={18} />
                                </div>
                                <div>
                                   <p className="font-bold text-slate-700">#{t.ticket_number || t.ticketNumber} - {t.client_name || t.clientName}</p>
                                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                                      <Trash2 size={10} className="text-rose-400" /> Borrado el: {new Date(t.deletedAt).toLocaleDateString()}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button onClick={() => handleRecover('ticket', t.id)} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm">
                                  Recuperar
                                </button>
                                <button onClick={() => handleForceDelete('ticket', t.id)} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm">
                                  <Trash size={14} /> Destruir
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                  )}

                  {trashItems.sales.length > 0 && (
                     <div className="space-y-3 mt-6">
                       <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest px-1">Ventas Rápidas</h3>
                       {trashItems.sales.map(s => (
                         <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 group/item hover:border-primary-200 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                                   <DollarSign size={18} />
                                </div>
                                <div>
                                   <p className="font-bold text-slate-700">Venta rápida: {s.client_name || s.clientName || 'Público General'}</p>
                                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                                      <Trash2 size={10} className="text-rose-400" /> Borrado el: {new Date(s.deletedAt).toLocaleDateString()}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button onClick={() => handleRecover('sale', s.id)} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm">
                                  Recuperar
                                </button>
                                <button onClick={() => handleForceDelete('sale', s.id)} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm">
                                  <Trash size={14} /> Destruir
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

      </div>

      {/* --- FIRMA DE AUTOR (Said Alvarez) --- */}
      <footer className="mt-20 mb-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
         <div className="animate-float flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-[24px] shadow-2xl shadow-blue-100 border border-slate-100 flex items-center justify-center text-4xl mb-6 relative group transform hover:rotate-12 transition-transform cursor-default">
               <div className="absolute inset-0 bg-blue-400/5 rounded-[24px] blur-xl group-hover:bg-blue-400/20 transition-colors" />
               <span className="relative z-10">🪽</span>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md border border-white px-8 py-5 rounded-[32px] shadow-2xl shadow-blue-50/50 flex flex-col items-center gap-3 group transition-all hover:bg-white hover:border-blue-100">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-blue-600 transition-colors duration-500 overflow-hidden relative">
                     <User size={20} className="text-white relative z-10" />
                     <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-black text-2xl text-slate-900 tracking-tight leading-none mb-1">Said Alvarez</span>
                     <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none">Software Architect</span>
                  </div>
               </div>
               
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                  Taller MSA versión 1.0
               </p>
            </div>
         </div>
      </footer>
    </div>
  );
};
