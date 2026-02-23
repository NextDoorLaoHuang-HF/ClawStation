// Settings Module - Application settings management

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::State;

use crate::AppState;
use crate::gateway::GatewayConfig;

// ============== Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub gateway: GatewayConfig,
    #[serde(default = "default_agent")]
    pub default_agent: String,
    #[serde(default = "default_theme")]
    pub theme: Theme,
    pub window: WindowSettings,
    pub canvas: CanvasSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gateway: GatewayConfig {
                url: "ws://127.0.0.1:18789".to_string(),
                token: String::new(),
                agent_id: "main".to_string(),
                canvas_port: 18793,
            },
            default_agent: "main".to_string(),
            theme: Theme::System,
            window: WindowSettings::default(),
            canvas: CanvasSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl Default for Theme {
    fn default() -> Self {
        Theme::System
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    #[serde(default)]
    pub x: Option<i32>,
    #[serde(default)]
    pub y: Option<i32>,
    #[serde(default = "default_maximized")]
    pub maximized: bool,
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            width: 1200,
            height: 800,
            x: None,
            y: None,
            maximized: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasSettings {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_canvas_port")]
    pub port: u16,
}

impl Default for CanvasSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            port: 18793,
        }
    }
}

fn default_agent() -> String {
    "main".to_string()
}

fn default_theme() -> Theme {
    Theme::System
}

fn default_maximized() -> bool {
    false
}

fn default_true() -> bool {
    true
}

fn default_canvas_port() -> u16 {
    18793
}

// ============== Settings ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub app: AppSettings,
    #[serde(skip)]
    pub workspace_dir: Option<PathBuf>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            app: AppSettings::default(),
            workspace_dir: dirs::data_dir().map(|p| {
                p.join("openclaw")
                    .join("agents")
                    .join("workspace")
            }),
        }
    }
}

// ============== Commands ==============

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state.settings.read().await;
    Ok(settings.app.clone())
}

#[tauri::command]
pub async fn update_settings(
    new_settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut settings = state.settings.write().await;
    settings.app = new_settings;

    tracing::info!("Settings updated");

    // In a real implementation, persist settings to disk
    // and apply changes (e.g., theme, window size)

    Ok(())
}
