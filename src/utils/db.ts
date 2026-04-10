let isConnected = false;

/**
 * MOCK/LEGACY - Database is now handled by the Express backend.
 * This utility now only checks for API health in both environments.
 */

export const checkConnection = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', { 
      method: 'GET', // Using login as a dummy check or similar
      signal: AbortSignal.timeout(2000)
    }).catch(() => null);
    
    // We don't really need a complex check here, just seeing if the server is up.
    isConnected = !!response;
    return isConnected;
  } catch {
    isConnected = false;
    return false;
  }
};

/**
 * Returns a dummy object that mimics the old Tauri Database plugin
 * to prevent immediate crashes, though dataAdapter should be the primary interface.
 */
export const getDb = async () => {
  console.warn("getDb is legacy. Use dataAdapter for API calls.");
  return {
    select: async () => [],
    execute: async () => {}
  } as any;
};
