/**
 * Offline sync queue — stores failed API operations for later retry.
 * CLEANED: Removed legacy SQLite/getDb references that no longer apply.
 */
import { dataAdapter } from '../services/dataAdapter';

interface PendingOperation {
  id: string;
  method: 'API';
  apiPath: string;
  apiBody: any;
  timestamp: number;
}

const STORAGE_KEY = 'msa_pending_sync';

export const addToSyncQueue = (op: Omit<PendingOperation, 'id' | 'timestamp'>) => {
  const queue: PendingOperation[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  queue.push({
    ...op,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const getSyncQueueLength = (): number => {
  const queue: PendingOperation[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return queue.length;
};

/**
 * Processes the sync queue — retries all pending API operations.
 * Returns true if the queue was fully cleared.
 */
export const syncData = async (): Promise<boolean> => {
  const queue: PendingOperation[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (queue.length === 0) return true;

  const remaining: PendingOperation[] = [];

  for (const op of queue) {
    try {
      if (op.apiPath && op.apiBody) {
        // Use the dataAdapter's secure API (has token refresh built in)
        const path = op.apiPath.startsWith('/') ? op.apiPath : `/${op.apiPath}`;
        
        // Determine method based on path patterns
        if (path.includes('/clear') || path.includes('/archive')) {
          await (dataAdapter as any).archiveTickets?.(op.apiBody.date) || 
                fetch(`http://localhost:3001/api${path}`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('msa_token') || ''}`
                  },
                  body: JSON.stringify(op.apiBody)
                });
        } else {
          // Generic POST retry
          await fetch(`http://localhost:3001/api${path}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('msa_token') || ''}`
            },
            body: JSON.stringify(op.apiBody)
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Sync retry failed for ${op.apiPath}:`, error);
      remaining.push(op);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  
  if (remaining.length === 0) {
    console.log("🔄 Sincronización completada con éxito");
  } else {
    console.warn(`⚠️ ${remaining.length} operaciones pendientes de sincronizar`);
  }
  
  return remaining.length === 0;
};

/**
 * Wraps an API POST call with offline resilience — if it fails,
 * the operation is saved to the sync queue for later retry.
 */
export const apiResilient = async (path: string, body: any) => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.warn("⚠️ Error de conexión API, guardando en cola:", error);
    addToSyncQueue({ method: 'API', apiPath: path, apiBody: body });
    window.dispatchEvent(new CustomEvent('msa_sync_update'));
    return null;
  }
};
