// Plugin System - Module exports

pub mod commands;
pub mod manager;
pub mod loader;
pub mod sandbox;
pub mod tests;
pub mod types;

pub use manager::{PluginManager, create_plugin_manager, PluginManagerState};
pub use loader::PluginLoader;
pub use sandbox::{PluginSandbox, SandboxManager, SandboxRuntime, ResourceLimits, AllowedApis};
pub use types::{
    Plugin, 
    PluginManifest, 
    PluginInfo, 
    PluginContext, 
    PluginPermissions,
    PluginContributes,
    PanelDefinition,
    WidgetDefinition,
    ThemeDefinition,
    CommandDefinition,
    CanvasRenderer,
    ServiceDefinition,
    InstalledPlugins,
};
