// Plugin Sandbox - Security and resource management for plugins

use crate::plugins::types::*;

/// Sandbox runtime environment
#[derive(Debug, Clone)]
pub enum SandboxRuntime {
    /// Run in an iframe
    Iframe,
    /// Run in a WebWorker
    WebWorker,
    /// Run in an isolated world (future)
    IsolatedWorld,
}

/// API that plugins are allowed to access
#[derive(Debug, Clone, Default)]
pub struct AllowedApis {
    /// Allow console.log, console.error, etc.
    pub console: bool,
    /// Allow fetch API
    pub fetch: bool,
    /// Allow XMLHttpRequest
    pub xhr: bool,
    /// Allow WebSocket
    pub websocket: bool,
    /// Allow localStorage
    pub local_storage: bool,
    /// Allow sessionStorage
    pub session_storage: bool,
    /// Allow IndexedDB
    pub indexed_db: bool,
    /// Allow accessing parent window (for iframe)
    pub parent_access: bool,
    /// Allow posting messages to parent
    pub post_message: bool,
}

impl AllowedApis {
    /// Default API whitelist for plugins
    pub fn default_for_plugin() -> Self {
        Self {
            console: true,
            fetch: true,
            xhr: true,
            websocket: false,
            local_storage: false,
            session_storage: false,
            indexed_db: false,
            parent_access: false,
            post_message: true,
        }
    }
    
    /// All APIs allowed (for trusted plugins)
    pub fn all_allowed() -> Self {
        Self {
            console: true,
            fetch: true,
            xhr: true,
            websocket: true,
            local_storage: true,
            session_storage: true,
            indexed_db: true,
            parent_access: true,
            post_message: true,
        }
    }
}

/// Resource limits for plugins
#[derive(Debug, Clone)]
pub struct ResourceLimits {
    /// Maximum memory in bytes
    pub memory_bytes: u64,
    /// Maximum CPU time in seconds
    pub cpu_seconds: u64,
    /// Maximum network requests per minute
    pub network_requests_per_minute: u32,
    /// Maximum file size in bytes
    pub max_file_size: u64,
    /// Maximum storage in bytes
    pub storage_bytes: u64,
}

impl Default for ResourceLimits {
    fn default() -> Self {
        // 50MB memory limit
        const MB: u64 = 1024 * 1024;
        Self {
            memory_bytes: 50 * MB,
            // 30 seconds CPU time
            cpu_seconds: 30,
            // 100 requests per minute
            network_requests_per_minute: 100,
            // 10MB max file size
            max_file_size: 10 * MB,
            // 100MB storage
            storage_bytes: 100 * MB,
        }
    }
}

/// Plugin sandbox - security boundaries for plugin execution
#[derive(Debug, Clone)]
pub struct PluginSandbox {
    /// Runtime environment
    runtime: SandboxRuntime,
    /// Allowed APIs
    allowed_apis: AllowedApis,
    /// Resource limits
    limits: ResourceLimits,
    /// Permissions
    permissions: PluginPermissions,
    /// Whether this plugin is trusted
    trusted: bool,
}

impl PluginSandbox {
    /// Create a new sandbox with default settings
    pub fn new(permissions: PluginPermissions) -> Self {
        Self {
            runtime: SandboxRuntime::WebWorker,
            allowed_apis: AllowedApis::default_for_plugin(),
            limits: ResourceLimits::default(),
            permissions,
            trusted: false,
        }
    }
    
    /// Create a sandbox for a trusted plugin
    pub fn trusted(permissions: PluginPermissions) -> Self {
        Self {
            runtime: SandboxRuntime::WebWorker,
            allowed_apis: AllowedApis::all_allowed(),
            limits: ResourceLimits::default(),
            permissions,
            trusted: true,
        }
    }
    
    /// Get the runtime type
    pub fn runtime(&self) -> &SandboxRuntime {
        &self.runtime
    }
    
    /// Get allowed APIs
    pub fn allowed_apis(&self) -> &AllowedApis {
        &self.allowed_apis
    }
    
    /// Get resource limits
    pub fn limits(&self) -> &ResourceLimits {
        &self.limits
    }
    
    /// Get permissions
    pub fn permissions(&self) -> &PluginPermissions {
        &self.permissions
    }
    
    /// Check if an API is allowed
    pub fn is_api_allowed(&self, api: &str) -> bool {
        if self.trusted {
            return true;
        }
        
        match api {
            "console" => self.allowed_apis.console,
            "fetch" => self.allowed_apis.fetch,
            "XMLHttpRequest" => self.allowed_apis.xhr,
            "WebSocket" => self.allowed_apis.websocket,
            "localStorage" => self.allowed_apis.local_storage,
            "sessionStorage" => self.allowed_apis.session_storage,
            "IndexedDB" => self.allowed_apis.indexed_db,
            "parent" => self.allowed_apis.parent_access,
            "postMessage" => self.allowed_apis.post_message,
            _ => false,
        }
    }
    
    /// Check if a domain is allowed for network requests
    pub fn is_domain_allowed(&self, domain: &str) -> bool {
        if self.trusted {
            return true;
        }
        
        if let Some(network) = &self.permissions.network {
            if let Some(domains) = &network.domains {
                if domains.is_empty() {
                    return false;
                }
                return domains.iter().any(|d| {
                    domain == d || domain.ends_with(&format!(".{}", d))
                });
            }
        }
        
        // No network permissions = no network access
        false
    }
    
    /// Check if a filesystem path is allowed for reading
    pub fn is_read_allowed(&self, path: &str) -> bool {
        if self.trusted {
            return true;
        }
        
        if let Some(fs) = &self.permissions.filesystem {
            if !fs.read {
                return false;
            }
            if let Some(paths) = &fs.paths {
                if paths.is_empty() {
                    return false;
                }
                return paths.iter().any(|p| {
                    path.starts_with(p) || path == p
                });
            }
        }
        
        false
    }
    
    /// Check if a filesystem path is allowed for writing
    pub fn is_write_allowed(&self, path: &str) -> bool {
        if self.trusted {
            return true;
        }
        
        if let Some(fs) = &self.permissions.filesystem {
            if !fs.write {
                return false;
            }
            if let Some(paths) = &fs.paths {
                if paths.is_empty() {
                    return false;
                }
                return paths.iter().any(|p| {
                    path.starts_with(p) || path == p
                });
            }
        }
        
        false
    }
    
    /// Check if a gateway method is allowed
    pub fn is_gateway_method_allowed(&self, method: &str) -> bool {
        if self.trusted {
            return true;
        }
        
        if let Some(gateway) = &self.permissions.gateway {
            if let Some(methods) = &gateway.methods {
                if methods.is_empty() {
                    return false;
                }
                return methods.contains(&method.to_string());
            }
        }
        
        // No gateway permissions = no gateway access
        false
    }
    
    /// Check if UI operations are allowed
    pub fn can_create_panels(&self) -> bool {
        if self.trusted {
            return true;
        }
        
        if let Some(ui) = &self.permissions.ui {
            ui.create_panels
        } else {
            false
        }
    }
    
    pub fn can_show_notifications(&self) -> bool {
        if self.trusted {
            return true;
        }
        
        if let Some(ui) = &self.permissions.ui {
            ui.show_notifications
        } else {
            false
        }
    }
    
    /// Generate CSP header for the sandbox
    pub fn generate_csp(&self) -> String {
        let mut directives = Vec::new();
        
        // Default-src
        directives.push("default-src 'self'".to_string());
        
        // Script-src
        if self.trusted {
            directives.push("script-src 'self' 'unsafe-eval' 'unsafe-inline'".to_string());
        } else {
            directives.push("script-src 'self'".to_string());
        }
        
        // Style-src
        directives.push("style-src 'self' 'unsafe-inline'".to_string());
        
        // Connect-src (for fetch/XHR)
        if let Some(network) = &self.permissions.network {
            if let Some(domains) = &network.domains {
                if !domains.is_empty() {
                    let domains_str = domains.join(" ");
                    directives.push(format!("connect-src 'self' {}", domains_str));
                } else {
                    directives.push("connect-src 'none'".to_string());
                }
            } else {
                directives.push("connect-src 'none'".to_string());
            }
        } else {
            directives.push("connect-src 'none'".to_string());
        }
        
        // Frame-src (for iframes)
        directives.push("frame-src 'none'".to_string());
        
        // Object-src
        directives.push("object-src 'none'".to_string());
        
        // Base-uri
        directives.push("base-uri 'self'".to_string());
        
        directives.join("; ")
    }
}

/// Sandbox manager - manages multiple plugin sandboxes
#[derive(Debug, Default)]
pub struct SandboxManager {
    sandboxes: std::collections::HashMap<String, PluginSandbox>,
}

impl SandboxManager {
    /// Create a new sandbox manager
    pub fn new() -> Self {
        Self {
            sandboxes: std::collections::HashMap::new(),
        }
    }
    
    /// Register a sandbox for a plugin
    pub fn register(&mut self, plugin_id: String, sandbox: PluginSandbox) {
        self.sandboxes.insert(plugin_id, sandbox);
    }
    
    /// Get a sandbox for a plugin
    pub fn get(&self, plugin_id: &str) -> Option<&PluginSandbox> {
        self.sandboxes.get(plugin_id)
    }
    
    /// Remove a sandbox
    pub fn remove(&mut self, plugin_id: &str) {
        self.sandboxes.remove(plugin_id);
    }
    
    /// Check permissions for a plugin operation
    pub fn check_permission(&self, plugin_id: &str, permission: &PermissionCheck) -> bool {
        if let Some(sandbox) = self.get(plugin_id) {
            match permission {
                PermissionCheck::Api(api) => sandbox.is_api_allowed(api),
                PermissionCheck::Domain(domain) => sandbox.is_domain_allowed(domain),
                PermissionCheck::ReadPath(path) => sandbox.is_read_allowed(path),
                PermissionCheck::WritePath(path) => sandbox.is_write_allowed(path),
                PermissionCheck::GatewayMethod(method) => sandbox.is_gateway_method_allowed(method),
                PermissionCheck::CreatePanel => sandbox.can_create_panels(),
                PermissionCheck::ShowNotification => sandbox.can_show_notifications(),
            }
        } else {
            // No sandbox = no permissions
            false
        }
    }
}

/// Types of permission checks
#[derive(Debug, Clone)]
pub enum PermissionCheck<'a> {
    Api(&'a str),
    Domain(&'a str),
    ReadPath(&'a str),
    WritePath(&'a str),
    GatewayMethod(&'a str),
    CreatePanel,
    ShowNotification,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_sandbox_blocks_network() {
        let sandbox = PluginSandbox::new(PluginPermissions::default());
        assert!(!sandbox.is_domain_allowed("api.example.com"));
    }
    
    #[test]
    fn test_trusted_sandbox_allows_everything() {
        let sandbox = PluginSandbox::trusted(PluginPermissions::default());
        assert!(sandbox.is_domain_allowed("api.example.com"));
        assert!(sandbox.is_api_allowed("fetch"));
    }
    
    #[test]
    fn test_sandbox_csp() {
        let sandbox = PluginSandbox::new(PluginPermissions::default());
        let csp = sandbox.generate_csp();
        assert!(csp.contains("default-src 'self'"));
    }
}
