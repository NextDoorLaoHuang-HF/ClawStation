// ClawStation Library - Main entry point and module exports

pub mod agents;
pub mod canvas;
pub mod files;
pub mod gateway;
pub mod plugins;
pub mod sessions;
pub mod settings;
pub mod system;

use std::sync::Arc;
use tokio::sync::RwLock;

pub use agents::AgentInfo;
pub use canvas::CanvasState;
pub use files::FileInfo;
pub use gateway::{GatewayConfig, GatewayProfile, GatewayStatus};
pub use plugins::{create_plugin_manager, PluginInfo, PluginManagerState};
pub use sessions::Session;

// Application state shared across all commands
pub struct AppState {
    pub gateway: Arc<RwLock<gateway::GatewayState>>,
    pub sessions: Arc<RwLock<sessions::SessionManager>>,
    pub canvas: Arc<RwLock<canvas::CanvasManager>>,
    pub files: Arc<RwLock<files::FileManager>>,
    pub agents: Arc<RwLock<agents::AgentManager>>,
    pub settings: Arc<RwLock<settings::Settings>>,
    pub plugins: PluginManagerState,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            gateway: Arc::new(RwLock::new(gateway::GatewayState::default())),
            sessions: Arc::new(RwLock::new(sessions::SessionManager::default())),
            canvas: Arc::new(RwLock::new(canvas::CanvasManager::default())),
            files: Arc::new(RwLock::new(files::FileManager::default())),
            agents: Arc::new(RwLock::new(agents::AgentManager::default())),
            settings: Arc::new(RwLock::new(settings::Settings::default())),
            plugins: create_plugin_manager(),
        }
    }
}

pub fn run() {
    let app_state = AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Gateway
            gateway::connect,
            gateway::disconnect,
            gateway::get_status,
            gateway::list_gateway_profiles,
            gateway::add_gateway_profile,
            gateway::update_gateway_profile,
            gateway::remove_gateway_profile,
            gateway::set_default_gateway,
            gateway::get_default_gateway_profile,
            // Sessions
            sessions::list_sessions,
            sessions::get_history,
            sessions::send_message,
            sessions::abort_session,
            sessions::create_session,
            sessions::spawn_subagent,
            // Canvas
            canvas::canvas_present,
            canvas::canvas_navigate,
            canvas::canvas_eval,
            canvas::canvas_snapshot,
            canvas::a2ui_push,
            // Files
            files::list_workspace,
            files::read_file,
            files::read_image,
            files::watch_directory,
            files::unwatch_directory,
            // Agents
            agents::list_agents,
            agents::switch_agent,
            agents::get_agent_config,
            // Settings
            settings::get_settings,
            settings::update_settings,
            // System
            system::get_app_info,
            system::open_external,
            system::check_update,
            system::install_update,
            // Plugins
            plugins::commands::list_plugins,
            plugins::commands::install_plugin,
            plugins::commands::uninstall_plugin,
            plugins::commands::enable_plugin,
            plugins::commands::disable_plugin,
            plugins::commands::reload_plugin,
            plugins::commands::get_plugin_contributions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
