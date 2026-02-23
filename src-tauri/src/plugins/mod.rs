// Plugin System - Module exports

pub mod commands;
pub mod loader;
pub mod manager;
pub mod sandbox;
pub mod tests;
pub mod types;

pub use loader::PluginLoader;
pub use manager::{create_plugin_manager, PluginManager, PluginManagerState};
pub use sandbox::{AllowedApis, PluginSandbox, ResourceLimits, SandboxManager, SandboxRuntime};
pub use types::{
    CanvasRenderer, CommandDefinition, InstalledPlugins, PanelDefinition, Plugin, PluginContext,
    PluginContributes, PluginInfo, PluginManifest, PluginPermissions, ServiceDefinition,
    ThemeDefinition, WidgetDefinition,
};
