// Plugin Manager - Core plugin management logic

use crate::plugins::loader::PluginLoader;
use crate::plugins::sandbox::{PermissionCheck, SandboxManager, PluginSandbox};
use crate::plugins::types::*;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Plugin manager - handles plugin lifecycle
pub struct PluginManager {
    /// Loaded plugins (in memory)
    plugins: HashMap<String, Plugin>,
    /// Installed plugins info
    installed: Vec<PluginInfo>,
    /// Sandbox manager for security
    sandboxes: SandboxManager,
    /// Plugins directory
    plugins_dir: PathBuf,
}

impl Default for PluginManager {
    fn default() -> Self {
        Self::new()
    }
}

impl PluginManager {
    /// Create a new plugin manager
    pub fn new() -> Self {
        let plugins_dir = PluginLoader::get_plugins_dir();
        
        Self {
            plugins: HashMap::new(),
            installed: Vec::new(),
            sandboxes: SandboxManager::new(),
            plugins_dir,
        }
    }
    
    /// Initialize the plugin manager
    pub async fn init(&mut self) -> Result<(), String> {
        // Ensure plugins directory exists
        PluginLoader::ensure_plugins_dir()
            .map_err(|e| e.to_string())?;
        
        // Load installed plugins list
        self.installed = PluginLoader::load_installed_list()
            .map_err(|e| e.to_string())?;
        
        // Load all plugins from disk
        self.load_all().await?;
        
        Ok(())
    }
    
    /// Load all installed plugins
    pub async fn load_all(&mut self) -> Result<(), String> {
        let plugins = PluginLoader::list_installed()
            .map_err(|e| e.to_string())?;
        
        for plugin_info in &plugins {
            let plugin_path = self.plugins_dir.join(&plugin_info.id);
            match PluginLoader::load_plugin(&plugin_path) {
                Ok(plugin) => {
                    // Create sandbox for the plugin
                    let sandbox = PluginSandbox::new(PluginPermissions::default());
                    self.sandboxes.register(plugin.manifest.id.clone(), sandbox);
                    
                    self.plugins.insert(plugin_info.id.clone(), plugin);
                }
                Err(e) => {
                    tracing::warn!("Failed to load plugin {}: {}", plugin_info.id, e);
                }
            }
        }
        
        Ok(())
    }
    
    /// List all plugins
    pub fn list(&self) -> Vec<PluginInfo> {
        self.plugins.values()
            .map(|p| PluginInfo {
                id: p.manifest.id.clone(),
                name: p.manifest.name.clone(),
                version: p.manifest.version.clone(),
                description: p.manifest.description.clone(),
                author: p.manifest.author.clone(),
                enabled: p.enabled,
                installed: true,
                has_update: false,
            })
            .collect()
    }
    
    /// Get a plugin by ID
    pub fn get(&self, id: &str) -> Option<&Plugin> {
        self.plugins.get(id)
    }
    
    /// Install a plugin from a source (local path or URL)
    pub async fn install(&mut self, source: &str) -> Result<PluginInfo, String> {
        // Determine source type
        let source_path = if source.starts_with("http://") || source.starts_with("https://") {
            // TODO: Download from URL
            return Err("Remote plugin installation not yet implemented".to_string());
        } else {
            PathBuf::from(source)
        };
        
        // Validate the plugin
        let errors = PluginLoader::validate_plugin(&source_path)
            .map_err(|e| e.to_string())?;
        
        if !errors.is_empty() {
            return Err(format!("Plugin validation failed: {}", errors.join(", ")));
        }
        
        // Load the plugin to get its manifest
        let plugin = PluginLoader::load_plugin(&source_path)
            .map_err(|e| e.to_string())?;
        
        let plugin_id = plugin.manifest.id.clone();
        
        // Check dependencies
        PluginLoader::check_dependencies(&plugin.manifest, &self.installed)
            .map_err(|e| e.to_string())?;
        
        // Create target directory
        let target_dir = self.plugins_dir.join(&plugin_id);
        
        // Copy plugin files (or move if from temp location)
        Self::copy_dir(&source_path, &target_dir)
            .map_err(|e| format!("Failed to copy plugin: {}", e))?;
        
        // Load the installed plugin
        let installed_plugin = PluginLoader::load_plugin(&target_dir)
            .map_err(|e| e.to_string())?;
        
        // Create sandbox
        let sandbox = PluginSandbox::new(PluginPermissions::default());
        self.sandboxes.register(plugin_id.clone(), sandbox);
        
        // Add to plugins
        let plugin_info = PluginInfo {
            id: installed_plugin.manifest.id.clone(),
            name: installed_plugin.manifest.name.clone(),
            version: installed_plugin.manifest.version.clone(),
            description: installed_plugin.manifest.description.clone(),
            author: installed_plugin.manifest.author.clone(),
            enabled: true,
            installed: true,
            has_update: false,
        };
        
        self.plugins.insert(plugin_id.clone(), installed_plugin);
        self.installed.push(plugin_info.clone());
        
        // Save installed list
        PluginLoader::save_installed_list(&self.installed)
            .map_err(|e| e.to_string())?;
        
        Ok(plugin_info)
    }
    
    /// Uninstall a plugin
    pub async fn uninstall(&mut self, id: &str) -> Result<(), String> {
        // Check if plugin exists
        if !self.plugins.contains_key(id) {
            return Err(format!("Plugin {} not found", id));
        }
        
        // Remove from memory
        self.plugins.remove(id);
        
        // Remove sandbox
        self.sandboxes.remove(id);
        
        // Remove from installed list
        self.installed.retain(|p| p.id != id);
        
        // Delete plugin directory
        let plugin_dir = self.plugins_dir.join(id);
        if plugin_dir.exists() {
            std::fs::remove_dir_all(&plugin_dir)
                .map_err(|e| format!("Failed to remove plugin directory: {}", e))?;
        }
        
        // Save installed list
        PluginLoader::save_installed_list(&self.installed)
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    /// Enable a plugin
    pub fn enable(&mut self, id: &str) -> Result<(), String> {
        if let Some(plugin) = self.plugins.get_mut(id) {
            plugin.enabled = true;
            
            // Update installed list
            if let Some(info) = self.installed.iter_mut().find(|p| p.id == id) {
                info.enabled = true;
            }
            
            // Save
            PluginLoader::save_installed_list(&self.installed)
                .map_err(|e| e.to_string())?;
            
            Ok(())
        } else {
            Err(format!("Plugin {} not found", id))
        }
    }
    
    /// Disable a plugin
    pub fn disable(&mut self, id: &str) -> Result<(), String> {
        if let Some(plugin) = self.plugins.get_mut(id) {
            plugin.enabled = false;
            
            // Update installed list
            if let Some(info) = self.installed.iter_mut().find(|p| p.id == id) {
                info.enabled = false;
            }
            
            // Save
            PluginLoader::save_installed_list(&self.installed)
                .map_err(|e| e.to_string())?;
            
            Ok(())
        } else {
            Err(format!("Plugin {} not found", id))
        }
    }
    
    /// Reload a plugin
    pub async fn reload(&mut self, id: &str) -> Result<(), String> {
        // Get current plugin path
        let plugin_path = self.plugins_dir.join(id);
        
        if !plugin_path.exists() {
            return Err(format!("Plugin {} not found", id));
        }
        
        // Remove old plugin
        self.plugins.remove(id);
        self.sandboxes.remove(id);
        
        // Load fresh
        let plugin = PluginLoader::load_plugin(&plugin_path)
            .map_err(|e| e.to_string())?;
        
        // Create sandbox
        let sandbox = PluginSandbox::new(PluginPermissions::default());
        self.sandboxes.register(id.to_string(), sandbox);
        
        // Add back
        self.plugins.insert(id.to_string(), plugin);
        
        Ok(())
    }
    
    /// Check if a plugin has permission for an operation
    pub fn check_permission(&self, plugin_id: &str, permission: PermissionCheck) -> bool {
        self.sandboxes.check_permission(plugin_id, &permission)
    }
    
    /// Get plugin contributions (for UI rendering)
    pub fn get_contributions(&self, id: &str) -> Option<&PluginContributes> {
        self.plugins.get(id).map(|p| &p.manifest.contributes)
    }
    
    /// Copy directory recursively
    fn copy_dir(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
        if !dst.exists() {
            std::fs::create_dir_all(dst)?;
        }
        
        for entry in std::fs::read_dir(src)? {
            let entry = entry?;
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());
            
            if src_path.is_dir() {
                Self::copy_dir(&src_path, &dst_path)?;
            } else {
                std::fs::copy(&src_path, &dst_path)?;
            }
        }
        
        Ok(())
    }
}

/// Thread-safe wrapper for PluginManager
pub type PluginManagerState = Arc<RwLock<PluginManager>>;

pub fn create_plugin_manager() -> PluginManagerState {
    Arc::new(RwLock::new(PluginManager::new()))
}
