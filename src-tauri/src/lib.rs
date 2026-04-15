use serde::{Deserialize, Serialize};
use std::fs;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
struct DbConfig {
    host: Option<String>,
    port: Option<String>,
    user: Option<String>,
    pass: Option<String>,
    name: Option<String>,
}

// Hold reference to the sidecar process so we can kill it on exit
struct SidecarState(Mutex<Option<Child>>);

#[tauri::command]
fn save_db_config(handle: tauri::AppHandle, config: DbConfig) -> Result<(), String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let config_path = app_dir.join("db_config.json");
    let json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_db_config(handle: tauri::AppHandle) -> Result<DbConfig, String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_dir.join("db_config.json");
    if !config_path.exists() {
        return Ok(DbConfig::default());
    }
    let json = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: DbConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
fn save_pdf_to_desktop(handle: tauri::AppHandle, bytes: Vec<u8>, filename: String) -> Result<String, String> {
    let desktop_dir = handle.path().desktop_dir().map_err(|e| e.to_string())?;
    let target_dir = desktop_dir.join("COTIZACIONES");
    
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    
    let file_path = target_dir.join(filename);
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_str().unwrap_or("Archivo guardado").to_string())
}

fn find_sidecar(handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    // Strategy 1: Tauri resource resolver (production installs)
    if let Ok(path) = handle.path().resolve("bin/msa-server.exe", tauri::path::BaseDirectory::Resource) {
        log::info!("[SIDECAR] Strategy 1 (resolve): {:?} exists={}", path, path.exists());
        if path.exists() {
            return Some(path);
        }
    }

    // Strategy 2: resource_dir + bin/ (alternative production layout)
    if let Ok(res_dir) = handle.path().resource_dir() {
        let path = res_dir.join("bin").join("msa-server.exe");
        log::info!("[SIDECAR] Strategy 2 (resource_dir): {:?} exists={}", path, path.exists());
        if path.exists() {
            return Some(path);
        }
    }

    // Strategy 3: Next to the main executable (portable mode)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let path = exe_dir.join("bin").join("msa-server.exe");
            log::info!("[SIDECAR] Strategy 3 (exe_dir/bin): {:?} exists={}", path, path.exists());
            if path.exists() {
                return Some(path);
            }
            // Also check directly next to exe
            let path2 = exe_dir.join("msa-server.exe");
            log::info!("[SIDECAR] Strategy 3b (exe_dir): {:?} exists={}", path2, path2.exists());
            if path2.exists() {
                return Some(path2);
            }
        }
    }

    // Strategy 4: Current working directory (development)
    let cwd_path = std::path::PathBuf::from("bin").join("msa-server.exe");
    log::info!("[SIDECAR] Strategy 4 (cwd): {:?} exists={}", cwd_path, cwd_path.exists());
    if cwd_path.exists() {
        return Some(cwd_path);
    }

    log::error!("[SIDECAR] CRITICAL: msa-server.exe not found in any location!");
    None
}

fn start_sidecar(handle: &tauri::AppHandle) {
    // Read config
    let app_dir = handle.path().app_data_dir().unwrap_or_default();
    let config_path = app_dir.join("db_config.json");
    
    let config: DbConfig = if config_path.exists() {
        if let Ok(json) = fs::read_to_string(config_path) {
            serde_json::from_str(&json).unwrap_or_default()
        } else {
            DbConfig::default()
        }
    } else {
        DbConfig::default()
    };

    let host = config.host.unwrap_or_else(|| "localhost".to_string());
    let port = config.port.unwrap_or_else(|| "5432".to_string());
    let user = config.user.unwrap_or_else(|| "postgres".to_string());
    let pass = config.pass.unwrap_or_else(|| "admin".to_string());
    let name = config.name.unwrap_or_else(|| "msa_cajeme".to_string());

    // Find the sidecar binary
    let resource_path = match find_sidecar(handle) {
        Some(path) => path,
        None => {
            log::error!("[TAURI] CRITICAL: Cannot find msa-server.exe. The backend will not start.");
            return;
        }
    };

    log::info!("[TAURI] Launching sidecar from: {:?}", resource_path);

    // Prepare data directories in AppData
    let log_dir = app_dir.join("logs");
    let backup_dir = app_dir.join("backups");

    // Create data directories
    let _ = fs::create_dir_all(&log_dir);
    let _ = fs::create_dir_all(&backup_dir);

    let mut cmd = Command::new(&resource_path);
    cmd.env("DB_HOST", &host)
        .env("DB_PORT", &port)
        .env("DB_USER", &user)
        .env("DB_PASSWORD", &pass)
        .env("DB_NAME", &name)
        .env("PORT", "3001")
        .env("MSA_LOG_DIR", log_dir.to_str().unwrap_or_default())
        .env("MSA_BACKUP_DIR", backup_dir.to_str().unwrap_or_default())
        .env("JWT_SECRET", "msa_cjm_9f4b2e7a1d8c3f5e6b0a4d7c9e2f1a8b5d3c6e0f7a9b2d4e6f8a1c3d5e7f9a0")
        .env("JWT_REFRESH_SECRET", "msa_ref_a7c3e9f1b5d2a8c4e0f6b3d9a5c1e7f3b9d5a1c7e3f9b5d1a7c3e9f5b1d7a3e9");

    #[cfg(target_os = "windows")]
    let cmd = cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    match cmd.spawn()
    {
        Ok(child) => {
            let pid = child.id();
            if let Some(state) = handle.try_state::<SidecarState>() {
                let mut lock = state.0.lock().unwrap();
                *lock = Some(child);
                log::info!("[TAURI] Sidecar server started (PID: {}). Logs: {:?}", pid, log_dir);
            }
        }
        Err(e) => {
            log::error!("[TAURI] Failed to spawn sidecar: {}", e);
        }
    }
}

fn kill_sidecar(state: &SidecarState) {
    if let Ok(mut lock) = state.0.lock() {
        if let Some(ref mut child) = *lock {
            let _ = child.kill();
            let _ = child.wait();
            log::info!("[TAURI] Sidecar server killed on exit");
        }
    }
}

#[tauri::command]
fn restart_sidecar(handle: tauri::AppHandle, state: tauri::State<'_, SidecarState>) -> Result<(), String> {
    log::info!("[TAURI] Restarting sidecar...");
    kill_sidecar(&state);
    start_sidecar(&handle);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build())
        .manage(SidecarState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![save_db_config, get_db_config, restart_sidecar, save_pdf_to_desktop])
        .setup(|app| {
            let handle = app.handle().clone();
            // Launch sidecar in a background thread to NOT block the UI
            std::thread::spawn(move || {
                // Small delay to let the window initialize first
                std::thread::sleep(std::time::Duration::from_millis(500));
                start_sidecar(&handle);
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app_handle.state::<SidecarState>();
                kill_sidecar(state.inner());
            }
        });
}
