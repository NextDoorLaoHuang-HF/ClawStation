// Plugin Commands - Tauri commands for plugin management

use crate::plugins::types::PluginInfo;
use crate::AppState;
use tauri::State;

/// List all installed plugins
#[tauri::command]
pub async fn list_plugins(state: State<'_, AppState>) -> Result<Vec<PluginInfo>, String> {
    let manager = state.plugins.read().await;
    Ok(manager.list())
}

/// Install a plugin from a source (local path or URL)
#[tauri::command]
pub async fn install_plugin(source: String, state: State<'_, AppState>) -> Result<PluginInfo, String> {
    let mut manager = state.plugins.write().await;
    manager.install(&source).await
}

/// Uninstall a plugin
#[tauri::command]
pub async fn uninstall_plugin(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut manager = state.plugins.write().await;
    manager.uninstall(&id).await
}

/// Enable a plugin
#[tauri::command]
pub async fn enable_plugin(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut manager = state.plugins.write().await;
    manager.enable(&id)
}

/// Disable a plugin
#[tauri::command]
pub async fn disable_plugin(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut manager = state.plugins.write().await;
    manager.disable(&id)
}

/// Reload a plugin
#[tauri::command]
pub async fn reload_plugin(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut manager = state.plugins.write().await;
    manager.reload(&id).await
}

/// Get plugin contributions (panels, commands, etc.)
#[tauri::command]
pub async fn get_plugin_contributions(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<crate::plugins::types::PluginContributes>, String> {
    let manager = state.plugins.read().await;
    Ok(manager.get_contributions(&id).cloned())
}
