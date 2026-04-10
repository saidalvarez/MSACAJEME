export const getApiUrl = () => {
  const savedUrl = localStorage.getItem('msa_api_url');
  if (savedUrl) return savedUrl.replace(/\/$/, '');
  return (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
};

const API_URL = getApiUrl();

export const isTauri = !!(window as any).__TAURI_INTERNALS__;

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${API_URL}${path}`, { headers });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  post: async <T>(path: string, body: any): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  put: async <T>(path: string, body: any): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  delete: async <T>(path: string): Promise<T> => {
    const token = sessionStorage.getItem('msa_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }
};

