import { getDb } from './db';
import { api, isTauri } from './api';

interface PendingOperation {
  id: string;
  sql?: string;
  params?: any[];
  method: 'SQL' | 'API';
  apiPath?: string;
  apiBody?: any;
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

export const syncData = async (): Promise<boolean> => {
  const queue: PendingOperation[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (queue.length === 0) return true;

  try {
    // Process SQL operations (Tauri only legacy)
    if (isTauri) {
      const db = await getDb();
      for (const op of queue.filter(o => o.method === 'SQL')) {
        await db.execute(op.sql!, op.params || []);
      }
    }

    // Process API operations (ALWAYS)
    for (const op of queue.filter(o => o.method === 'API')) {
      if (op.apiPath && op.apiBody) {
        await api.post(op.apiPath, op.apiBody);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    console.log("🔄 Sincronización completada con éxito");
    return true;
  } catch (error) {
    console.error("❌ Error durante la sincronización:", error);
    return false;
  }
};

/**
 * Ejecuta una consulta SQL. Si falla por conexión, la guarda en la cola de sincronización.
 */
export const executeResilient = async (sql: string, params: any[] = []) => {
  try {
    const db = await getDb();
    return await db.execute(sql, params);
  } catch (error) {
    console.warn("⚠️ Error de conexión SQL, guardando en cola:", error);
    addToSyncQueue({ method: 'SQL', sql, params });
    window.dispatchEvent(new CustomEvent('msa_sync_update'));
    return null;
  }
};

export const apiResilient = async (path: string, body: any) => {
  try {
    return await api.post(path, body);
  } catch (error) {
    console.warn("⚠️ Error de conexión API, guardando en cola:", error);
    addToSyncQueue({ method: 'API', sql: '', params: [], apiPath: path, apiBody: body });
    window.dispatchEvent(new CustomEvent('msa_sync_update'));
    return null;
  }
};
