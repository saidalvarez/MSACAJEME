import { invoke } from '@tauri-apps/api/core';

// Native storage using custom Rust commands for portability and build stability
export const lazyStore = {
  set: async (key: string, value: any) => {
    // We get current config first, then update the specific key
    const current: any = await invoke('get_db_config');
    
    // Map key names to Rust struct field names
    const mapping: Record<string, string> = {
      'db_host': 'host',
      'db_port': 'port',
      'db_name': 'name',
      'db_user': 'user',
      'db_pass': 'pass'
    };

    const field = mapping[key] || key;
    current[field] = value;
    
    await invoke('save_db_config', { config: current });
  },
  setAll: async (newConfig: Record<string, any>) => {
    // Merge full config directly for zero race conditions
    const current: any = await invoke('get_db_config');
    current['host'] = newConfig.host || current.host;
    current['port'] = newConfig.port || current.port;
    current['name'] = newConfig.name || current.name;
    current['user'] = newConfig.user || current.user;
    current['pass'] = newConfig.password || current.pass;
    await invoke('save_db_config', { config: current });
  },
  restartBackend: async () => {
    await invoke('restart_sidecar');
  },
  get: async <T>(key: string): Promise<T | null> => {
    const config: any = await invoke('get_db_config');
    const mapping: Record<string, string> = {
      'db_host': 'host',
      'db_port': 'port',
      'db_name': 'name',
      'db_user': 'user',
      'db_pass': 'pass'
    };
    const field = mapping[key] || key;
    return (config[field] as T) || null;
  },
  save: async () => {
    // save_db_config already writes to disk
  }
};
