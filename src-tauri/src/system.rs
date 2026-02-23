// System Module - System operations and utilities

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

// ============== Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub tauri_version: String,
    pub platform: String,
    pub arch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_date: Option<String>,
}

// ============== Commands ==============

#[tauri::command]
pub async fn get_app_info() -> Result<AppInfo, String> {
    Ok(AppInfo {
        name: env!("CARGO_PKG_NAME").to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri_version: tauri::VERSION.to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}

#[tauri::command]
pub async fn open_external(url: String) -> Result<(), String> {
    tracing::info!("Opening external URL: {}", url);

    // Use tauri-plugin-opener to open the URL
    // In practice, this would be handled by the plugin
    // For now, we'll just return OK

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    // In a real implementation, this would check for updates
    // using tauri-plugin-updater or similar

    Ok(UpdateInfo {
        available: false,
        version: None,
        release_notes: None,
        release_date: None,
    })
}

#[tauri::command]
pub async fn install_update(state: State<'_, AppState>) -> Result<(), String> {
    // In a real implementation, this would trigger the update installation
    // For now, just return an error as updates aren't implemented

    let _ = state;

    Err("Update installation not implemented".to_string())
}
