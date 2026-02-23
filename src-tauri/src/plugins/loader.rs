// Plugin Loader - Handles loading and parsing plugins

use crate::plugins::types::*;
use std::fs;
use std::path::{Path, PathBuf};

/// Error type for plugin loading
#[derive(Debug)]
pub enum LoaderError {
    IoError(std::io::Error),
    JsonError(serde_json::Error),
    InvalidManifest(String),
    MissingManifest,
    DependencyNotFound(String),
}

impl std::fmt::Display for LoaderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LoaderError::IoError(e) => write!(f, "IO error: {}", e),
            LoaderError::JsonError(e) => write!(f, "JSON parse error: {}", e),
            LoaderError::InvalidManifest(msg) => write!(f, "Invalid manifest: {}", msg),
            LoaderError::MissingManifest => write!(f, "manifest.json not found"),
            LoaderError::DependencyNotFound(dep) => write!(f, "Dependency not found: {}", dep),
        }
    }
}

impl From<std::io::Error> for LoaderError {
    fn from(err: std::io::Error) -> Self {
        LoaderError::IoError(err)
    }
}

impl From<serde_json::Error> for LoaderError {
    fn from(err: serde_json::Error) -> Self {
        LoaderError::JsonError(err)
    }
}

/// Plugin loader - parses and validates plugins
pub struct PluginLoader;

impl PluginLoader {
    /// Load a plugin from a directory
    pub fn load_plugin(path: &Path) -> Result<Plugin, LoaderError> {
        let manifest_path = path.join("manifest.json");

        if !manifest_path.exists() {
            return Err(LoaderError::MissingManifest);
        }

        let manifest_content = fs::read_to_string(&manifest_path)?;
        let manifest: PluginManifest = serde_json::from_str(&manifest_content)
            .map_err(|e| LoaderError::InvalidManifest(e.to_string()))?;

        // Validate required fields
        if manifest.id.is_empty() {
            return Err(LoaderError::InvalidManifest(
                "Plugin ID cannot be empty".to_string(),
            ));
        }
        if manifest.name.is_empty() {
            return Err(LoaderError::InvalidManifest(
                "Plugin name cannot be empty".to_string(),
            ));
        }
        if manifest.version.is_empty() {
            return Err(LoaderError::InvalidManifest(
                "Plugin version cannot be empty".to_string(),
            ));
        }

        // Check dependencies if specified
        if let Some(deps) = &manifest.dependencies {
            if let Some(other_plugins) = &deps.other_plugins {
                for dep in other_plugins {
                    if dep.is_empty() {
                        return Err(LoaderError::InvalidManifest(
                            "Empty dependency ID".to_string(),
                        ));
                    }
                }
            }
        }

        Ok(Plugin::new(manifest, path.to_path_buf()))
    }

    /// Get the plugins directory path
    pub fn get_plugins_dir() -> PathBuf {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        home.join(".clawstation").join("plugins")
    }

    /// Ensure plugins directory exists
    pub fn ensure_plugins_dir() -> Result<PathBuf, LoaderError> {
        let dir = Self::get_plugins_dir();
        if !dir.exists() {
            fs::create_dir_all(&dir)?;
        }
        Ok(dir)
    }

    /// List all installed plugins
    pub fn list_installed() -> Result<Vec<PluginInfo>, LoaderError> {
        let plugins_dir = Self::get_plugins_dir();

        if !plugins_dir.exists() {
            return Ok(vec![]);
        }

        let mut plugins = Vec::new();

        for entry in fs::read_dir(&plugins_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // Skip the installed.json file
                if path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n == "installed.json")
                    .unwrap_or(false)
                {
                    continue;
                }

                match Self::load_plugin(&path) {
                    Ok(plugin) => {
                        plugins.push(PluginInfo {
                            id: plugin.manifest.id.clone(),
                            name: plugin.manifest.name.clone(),
                            version: plugin.manifest.version.clone(),
                            description: plugin.manifest.description.clone(),
                            author: plugin.manifest.author.clone(),
                            enabled: plugin.enabled,
                            installed: true,
                            has_update: false,
                        });
                    }
                    Err(e) => {
                        tracing::warn!("Failed to load plugin from {:?}: {}", path, e);
                    }
                }
            }
        }

        Ok(plugins)
    }

    /// Load the installed plugins list
    pub fn load_installed_list() -> Result<Vec<PluginInfo>, LoaderError> {
        let installed_path = Self::get_plugins_dir().join("installed.json");

        if !installed_path.exists() {
            return Self::list_installed();
        }

        let content = fs::read_to_string(&installed_path)?;
        let installed: InstalledPlugins = serde_json::from_str(&content)?;

        Ok(installed.plugins)
    }

    /// Save the installed plugins list
    pub fn save_installed_list(plugins: &[PluginInfo]) -> Result<(), LoaderError> {
        let dir = Self::ensure_plugins_dir()?;
        let installed_path = dir.join("installed.json");

        let installed = InstalledPlugins {
            plugins: plugins.to_vec(),
        };

        let content = serde_json::to_string_pretty(&installed)?;
        fs::write(installed_path, content)?;

        Ok(())
    }

    /// Check if all dependencies are satisfied
    pub fn check_dependencies(
        manifest: &PluginManifest,
        installed: &[PluginInfo],
    ) -> Result<(), LoaderError> {
        if let Some(deps) = &manifest.dependencies {
            if let Some(other_plugins) = &deps.other_plugins {
                let installed_ids: Vec<&str> = installed.iter().map(|p| p.id.as_str()).collect();

                for dep in other_plugins {
                    if !installed_ids.contains(&dep.as_str()) {
                        return Err(LoaderError::DependencyNotFound(dep.clone()));
                    }
                }
            }
        }
        Ok(())
    }

    /// Validate a plugin structure
    pub fn validate_plugin(path: &Path) -> Result<Vec<String>, LoaderError> {
        let mut errors = Vec::new();

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() {
            errors.push("Missing manifest.json".to_string());
            return Ok(errors);
        }

        let manifest_content = fs::read_to_string(&manifest_path)?;
        let manifest: PluginManifest = match serde_json::from_str(&manifest_content) {
            Ok(m) => m,
            Err(e) => {
                errors.push(format!("Invalid JSON in manifest: {}", e));
                return Ok(errors);
            }
        };

        // Validate required fields
        if manifest.id.is_empty() {
            errors.push("Plugin ID is required".to_string());
        }
        if manifest.name.is_empty() {
            errors.push("Plugin name is required".to_string());
        }
        if manifest.version.is_empty() {
            errors.push("Plugin version is required".to_string());
        }

        // Validate entry point if specified
        if let Some(main) = &manifest.main {
            let entry_path = path.join(main);
            if !entry_path.exists() {
                errors.push(format!("Entry point '{}' not found", main));
            }
        }

        Ok(errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_load_plugin_without_manifest() {
        let temp_dir = TempDir::new().unwrap();
        let result = PluginLoader::load_plugin(temp_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_empty_plugin() {
        let temp_dir = TempDir::new().unwrap();
        let errors = PluginLoader::validate_plugin(temp_dir.path()).unwrap();
        assert!(errors.iter().any(|e| e.contains("manifest.json")));
    }
}
