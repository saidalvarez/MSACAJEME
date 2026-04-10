import { useState, useEffect } from 'react';
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
import { useStore } from './store/useStore';
import { Notas } from './views/Notas';
import { MainLayout } from './layout/MainLayout';
import { LogoutModal } from './layout/LogoutModal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('msa_auth') === 'true');
  const loadAllData = useStore(state => state.loadAllData);
  const syncOfflineData = useStore(state => state.syncOfflineData);
  const initWebSockets = useStore(state => state.initWebSockets);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      syncOfflineData();
      initWebSockets();
      
      const interval = setInterval(syncOfflineData, 30000); // Try sync every 30s

      // Silent OTA update check on startup (only in Tauri desktop)
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        const checkForUpdates = async () => {
          try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const { relaunch } = await import('@tauri-apps/plugin-process');
            const update = await check();
            if (update) {
              const { default: toast } = await import('react-hot-toast');
              toast((t) => {
                const el = document.createElement('span');
                el.innerHTML = `<b>v${update.version} disponible</b> — `;
                const btn = document.createElement('button');
                btn.textContent = 'Instalar ahora';
                btn.style.cssText = 'background:#7c3aed;color:white;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:11px;margin-left:8px';
                btn.onclick = async () => {
                  toast.dismiss(t.id);
                  toast.loading('Descargando actualización...', { id: 'ota' });
                  await update.downloadAndInstall();
                  toast.success('Actualización instalada. Reiniciando...', { id: 'ota' });
                  await relaunch();
                };
                el.appendChild(btn);
                return el as any;
              }, { duration: 15000, icon: '🚀' });
            }
          } catch (e) {
            console.log('[OTA] Update check skipped:', e);
          }
        };
        // Delay 5s to not block the initial load
        setTimeout(checkForUpdates, 5000);
      }

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadAllData, syncOfflineData, initWebSockets]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      sessionStorage.removeItem('msa_auth');
      sessionStorage.removeItem('msa_token');
      setIsAuthenticated(false);
      setShowLogoutModal(false);
      setIsLoggingOut(false);
    }, 1500);
  };

  if (!isAuthenticated) {
    return <InicioSesion onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout onLogout={handleLogout} />}>
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
          <Route path="configuracion" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />

      <LogoutModal 
        showModal={showLogoutModal} 
        isLoggingOut={isLoggingOut} 
        onCancel={() => setShowLogoutModal(false)} 
        onConfirm={confirmLogout} 
      />
    </BrowserRouter>
  );
}

export default App;
