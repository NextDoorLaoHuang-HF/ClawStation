// Plugin Types - Core type definitions for the plugin system

use serde::{Deserialize, Serialize};

/// Plugin manifest - the declaration file for a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub icon: Option<String>,
    pub main: Option<String>, // entry point (e.g., "index.js")
    pub contributes: PluginContributes,
    pub dependencies: Option<PluginDependencies>,
    pub activation_events: Option<Vec<String>>,
}

/// Extension points that a plugin can contribute to
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginContributes {
    pub panels: Option<Vec<PanelDefinition>>,
    pub widgets: Option<Vec<WidgetDefinition>>,
    pub themes: Option<Vec<ThemeDefinition>>,
    pub commands: Option<Vec<CommandDefinition>>,
    pub canvas_renderers: Option<Vec<CanvasRenderer>>,
    pub services: Option<Vec<ServiceDefinition>>,
}

/// Plugin dependencies
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginDependencies {
    pub other_plugins: Option<Vec<String>>,
    pub node_modules: Option<Vec<String>>,
}

/// Panel definition - a UI panel contributed by a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PanelDefinition {
    pub id: String,
    pub title: String,
    pub icon: Option<String>,
    pub position: PanelPosition,
    pub component: String,
    #[serde(default)]
    pub default_open: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PanelPosition {
    Sidebar,
    Main,
    Bottom,
    Floating,
}

impl Default for PanelPosition {
    fn default() -> Self {
        PanelPosition::Sidebar
    }
}

/// Widget definition - a UI widget contributed by a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetDefinition {
    pub id: String,
    pub name: String,
    pub size: WidgetSize,
    pub component: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WidgetSize {
    Small,
    Medium,
    Large,
}

/// Theme definition - a visual theme contributed by a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeDefinition {
    pub id: String,
    pub name: String,
    pub colors: ThemeColors,
    pub fonts: Option<ThemeFonts>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeColors {
    pub primary: String,
    pub secondary: String,
    pub accent: String,
    pub background: String,
    pub foreground: String,
    pub error: Option<String>,
    pub warning: Option<String>,
    pub success: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeFonts {
    pub primary: Option<String>,
    pub monospace: Option<String>,
}

/// Command definition - a command contributed by a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandDefinition {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub keybinding: Option<String>,
    pub handler: Option<String>, // JS handler function name
    #[serde(default)]
    pub show_in_palette: bool,
    #[serde(default)]
    pub show_in_menu: bool,
    pub menu_path: Option<Vec<String>>,
}

/// Canvas renderer - a renderer for specific data types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasRenderer {
    pub id: String,
    pub name: String,
    pub mime_type: String,
    pub component: Option<String>,
    pub handler: Option<String>, // JS handler function name
}

/// Service definition - a third-party service integration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceDefinition {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub config_schema: Option<serde_json::Value>,
    pub capabilities: Vec<ServiceCapability>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceCapability {
    pub cap_type: String, // "read", "write", "subscribe", "execute"
    pub name: String,
}

/// Plugin instance - loaded and active plugin
#[derive(Debug, Clone)]
pub struct Plugin {
    pub manifest: PluginManifest,
    pub path: std::path::PathBuf,
    pub enabled: bool,
}

impl Plugin {
    pub fn new(manifest: PluginManifest, path: std::path::PathBuf) -> Self {
        Self {
            manifest,
            path,
            enabled: true,
        }
    }
}

/// Plugin info - publicly available plugin information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub enabled: bool,
    pub installed: bool,
    pub has_update: bool,
}

/// Plugin context - the API exposed to plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginContext {
    pub plugin_id: String,
    pub subscriptions: Vec<Disposable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Disposable {
    pub id: String,
    pub dispose: String, // JS function name to call
}

/// Plugin permissions - security configuration for plugins
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginPermissions {
    pub filesystem: Option<FilesystemPermissions>,
    pub network: Option<NetworkPermissions>,
    pub gateway: Option<GatewayPermissions>,
    pub ui: Option<UiPermissions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesystemPermissions {
    #[serde(default)]
    pub read: bool,
    #[serde(default)]
    pub write: bool,
    pub paths: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkPermissions {
    pub domains: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayPermissions {
    pub methods: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiPermissions {
    #[serde(default)]
    pub create_panels: bool,
    #[serde(default)]
    pub show_notifications: bool,
}

/// Installed plugins list storage
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPlugins {
    pub plugins: Vec<PluginInfo>,
}
