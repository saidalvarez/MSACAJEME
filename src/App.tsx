import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { PanelControl } from './views/PanelControl';
import { NuevoTicket } from './views/NuevoTicket';
import { EditarTicket } from './views/EditarTicket';
import { Clientes } from './views/Clientes'; 
import { DetalleCliente } from './views/DetalleCliente';
import { Finanzas } from './views/Finanzas';
import { Inventario } from './views/Inventario';
import { NuevaVenta } from './views/NuevaVenta';
import { Configuracion as SettingsView } from './views/Configuracion';
import { InicioSesion } from './views/InicioSesion';
import { Historial } from './views/Historial';
import { Monitor } from './views/Monitor';
import { useStore } from './store/useStore';
import { Notas } from './views/Notas';
import { MainLayout } from './layout/MainLayout';
import { LogoutModal } from './layout/LogoutModal';
import { X, CheckCircle, Sparkles, Rocket } from 'lucide-react';

const CURRENT_APP_VERSION = '1.2.3';

// ── Fullscreen Update Overlay (Absolute Overlay) ──
const UpdateScreen = ({ version, status, progress, error, onDismiss }: { version: string; status: string; progress: number; error: string; onDismiss: () => void }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
    color: 'white', overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', top: '-100px', right: '-100px' }} />
    <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', bottom: '-80px', left: '-80px' }} />

    {error ? (
      <>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 0 40px rgba(239,68,68,0.4)' }}>
          <X size={40} color="white" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Error de Actualización</h1>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', maxWidth: '600px', border: '1px solid #ef444450', marginBottom: '32px' }}>
          <p style={{ fontSize: '13px', color: '#fca5a5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{error}</p>
        </div>
        <button onClick={onDismiss} style={{ padding: '12px 32px', background: '#3b82f6', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
          Regresar al Sistema
        </button>
      </>
    ) : (
      <>
        <div style={{ width: '100px', height: '100px', borderRadius: '28px', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(124,58,237,0.4)', marginBottom: '40px', animation: progress < 100 ? 'pulse-update 2s ease-in-out infinite' : 'none' }}>
          {progress >= 100 ? <CheckCircle size={48} color="white" /> : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 8px', textTransform: 'uppercase' }}>Actualizando Sistema MSA</h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 40px' }}>Versión {version}</p>
        <div style={{ width: '360px', maxWidth: '90vw' }}>
          <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', border: '1px solid #334155' }}>
            <div style={{ width: `${Math.max(progress, 2)}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4)', borderRadius: '999px', transition: 'width 0.3s ease', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{status}</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed' }}>{progress > 0 ? `${Math.round(progress)}%` : ''}</span>
          </div>
        </div>
        <p style={{ position: 'absolute', bottom: '32px', fontSize: '10px', color: '#475569', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>No cierre el sistema • Multiservicios Cajeme</p>
      </>
    )}
    <style>{`@keyframes pulse-update { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
  </div>
);

// ── Changelog Modal ──
const ChangelogModal = ({ onClose }: { onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', padding: '32px 32px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}><Rocket size={120} /></div>
        <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '8px', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>¡Sistema Actualizado! <Sparkles size={24} color="#fde047" /></h2>
        <p style={{ color: '#bfdbfe', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', position: 'relative', zIndex: 10 }}>VERSIÓN {CURRENT_APP_VERSION}</p>
      </div>
      <div style={{ padding: '32px' }}>
        <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>El sistema ha sido actualizado con éxito. Aquí tienes un resumen de las mejoras incluidas en esta versión:</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', gap: '16px', display: 'flex', flexDirection: 'column' }}>
          <li style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={20} color="#3b82f6" /></div>
            <div><strong style={{ display: 'block', color: '#1e293b', fontSize: '15px' }}>Sidecar Ligero y Estable</strong><span style={{ color: '#64748b', fontSize: '13px' }}>Se optimizó el motor del backend eliminando binarios de C++ conflictivos. Ahora el servidor enciende instantáneamente sin crasheos silenciosos en Windows.</span></div>
          </li>
          <li style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={20} color="#3b82f6" /></div>
            <div><strong style={{ display: 'block', color: '#1e293b', fontSize: '15px' }}>Precisión Financiera Total</strong><span style={{ color: '#64748b', fontSize: '13px' }}>El Panel de Control ha sido reprogramado para filtrar los Gastos y las Ventas Directas estrictamente a sus días exactos sin mezclar historial.</span></div>
          </li>
          <li style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={20} color="#3b82f6" /></div>
            <div><strong style={{ display: 'block', color: '#1e293b', fontSize: '15px' }}>Reportes PDF Inteligentes</strong><span style={{ color: '#64748b', fontSize: '13px' }}>El motor de PDFs financieros ahora cuenta con paginación inteligente, numeración automática y evita el corte incorrecto de las tablas extensas.</span></div>
          </li>
        </ul>
        <button onClick={onClose} style={{ width: '100%', padding: '16px', background: '#0f172a', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.2)' }}>Ingresar al Sistema</button>
      </div>
    </div>
    <style>{`@keyframes slide-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('msa_auth') === 'true');
  const loadAllData = useStore(state => state.loadAllData);
  const syncOfflineData = useStore(state => state.syncOfflineData);
  const initWebSockets = useStore(state => state.initWebSockets);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // ── OTA Update State ──
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState('Buscando actualizaciones...');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');

  // Check changelog on load
  useEffect(() => {
    if (isAuthenticated) {
      const savedVersion = localStorage.getItem('msa_version');
      if (savedVersion !== CURRENT_APP_VERSION) {
        setShowChangelog(true);
      }
    }
  }, [isAuthenticated]);

  const handleCloseChangelog = () => {
    localStorage.setItem('msa_version', CURRENT_APP_VERSION);
    setShowChangelog(false);
  };

  const startUpdate = useCallback(async (update: any) => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      
      setIsUpdating(true);
      setUpdateError('');
      setUpdateVersion(update.version);
      setUpdateStatus('Preparando descarga...');
      setUpdateProgress(2);

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            setUpdateStatus('Iniciando descarga de paquetes...');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const perc = (downloaded / contentLength) * 100;
              setUpdateProgress(perc);
              setUpdateStatus(`Descargando bloque de sistema...`);
            } else {
              // Si no podemos leer el peso total, simulamos algo lineal
              setUpdateProgress(prev => Math.min(prev + 5, 95));
            }
            break;
          case 'Finished':
            setUpdateProgress(99);
            setUpdateStatus('Descomprimiendo actualización...');
            break;
        }
      });

      setUpdateProgress(100);
      setUpdateStatus('Instalación completada con éxito. Reiniciando...');

      // Save to local storage so next startup shows changelog immediately!
      localStorage.removeItem('msa_version'); 

      await new Promise(r => setTimeout(r, 2000));
      await relaunch();
    } catch (e: any) {
      console.error('[OTA] Update failed:', e);
      setUpdateError(String(e?.message || e || 'Error desconocido al aplicar el parche'));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !showChangelog) {
      loadAllData();
      syncOfflineData();
      initWebSockets();
      
      const interval = setInterval(syncOfflineData, 30000);

      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        const checkForUpdates = async () => {
          try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const update = await check();
            if (update) {
              const { default: toast } = await import('react-hot-toast');
              toast((t) => {
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;align-items:center;gap:12px';
                
                const text = document.createElement('div');
                text.innerHTML = `<div style="font-weight:800;font-size:13px;color:#1e293b">v${update.version} disponible</div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">Actualización automática</div>`;
                
                const btn = document.createElement('button');
                btn.textContent = 'Instalar Parche';
                btn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;border:none;padding:8px 20px;border-radius:10px;cursor:pointer;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;box-shadow:0 10px 15px -3px rgba(124,58,237,0.3)';
                btn.onclick = async () => {
                  toast.dismiss(t.id);
                  startUpdate(update);
                };
                
                el.appendChild(text);
                el.appendChild(btn);
                return el as any;
              }, { duration: Infinity, icon: '🚀', style: { padding: '16px 20px' } });
            }
          } catch (e) {
            console.log('[OTA] Update check blocked or failed:', e);
          }
        };
        setTimeout(checkForUpdates, 4000);
      }

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadAllData, syncOfflineData, initWebSockets, startUpdate, showChangelog]);

  const confirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      sessionStorage.removeItem('msa_auth');
      sessionStorage.removeItem('msa_token');
      sessionStorage.removeItem('msa_refresh_token');
      setIsAuthenticated(false);
      setShowLogoutModal(false);
      setIsLoggingOut(false);
    }, 1500);
  };

  if (!isAuthenticated) return <InicioSesion onLogin={() => setIsAuthenticated(true)} />;

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout onLogout={() => setShowLogoutModal(true)} />}>
            <Route index element={<PanelControl />} />
            <Route path="nuevo" element={<NuevoTicket />} />
            <Route path="editar/:id" element={<EditarTicket />} />
            <Route path="nueva-venta" element={<NuevaVenta />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<DetalleCliente />} />
            <Route path="bitacora" element={<Historial />} />
            <Route path="finanzas" element={<Finanzas />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="notas" element={<Notas />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="configuracion" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1e293b', color: '#fff', borderRadius: '12px' },
          }}
        />

        <LogoutModal 
          showModal={showLogoutModal} 
          isLoggingOut={isLoggingOut} 
          onCancel={() => setShowLogoutModal(false)} 
          onConfirm={confirmLogout} 
        />
      </BrowserRouter>

      {/* OVERLAYS RENDERED ON TOP OF EVERYTHING SO APP DOESNT UNMOUNT */}
      {isUpdating && (
        <UpdateScreen 
          version={updateVersion} 
          status={updateStatus} 
          progress={updateProgress} 
          error={updateError}
          onDismiss={() => setIsUpdating(false)}
        />
      )}
      
      {showChangelog && <ChangelogModal onClose={handleCloseChangelog} />}
    </>
  );
}

export default App;
