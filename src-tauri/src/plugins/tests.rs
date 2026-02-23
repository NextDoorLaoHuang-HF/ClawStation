// Plugin Tests - Comprehensive tests for the plugin system

#[cfg(test)]
#[allow(clippy::module_inception)]
mod tests {
    use crate::plugins::sandbox::PermissionCheck;
    use crate::plugins::types::{
        FilesystemPermissions, GatewayPermissions, NetworkPermissions, PanelPosition,
        PluginContributes, PluginDependencies, PluginInfo, PluginManifest, PluginPermissions,
        UiPermissions,
    };
    use crate::plugins::{
        AllowedApis, Plugin, PluginLoader, PluginSandbox, ResourceLimits, SandboxManager,
    };
    use std::fs;
    use tempfile::TempDir;

    // ========== Loader Tests ==========

    #[test]
    fn test_load_manifest_valid() {
        let temp_dir = TempDir::new().unwrap();

        let manifest = r#"{
            "id": "test-plugin",
            "name": "Test Plugin",
            "version": "1.0.0",
            "description": "A test plugin",
            "author": "Test Author",
            "main": "index.js",
            "contributes": {}
        }"#;

        fs::write(temp_dir.path().join("manifest.json"), manifest).unwrap();

        let result = PluginLoader::load_plugin(temp_dir.path());
        assert!(result.is_ok());

        let plugin = result.unwrap();
        assert_eq!(plugin.manifest.id, "test-plugin");
        assert_eq!(plugin.manifest.name, "Test Plugin");
        assert_eq!(plugin.manifest.version, "1.0.0");
    }

    #[test]
    fn test_load_manifest_missing() {
        let temp_dir = TempDir::new().unwrap();
        let result = PluginLoader::load_plugin(temp_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_load_manifest_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        fs::write(temp_dir.path().join("manifest.json"), "invalid json").unwrap();

        let result = PluginLoader::load_plugin(temp_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_load_manifest_empty_id() {
        let temp_dir = TempDir::new().unwrap();

        let manifest = r#"{
            "id": "",
            "name": "Test Plugin",
            "version": "1.0.0",
            "contributes": {}
        }"#;

        fs::write(temp_dir.path().join("manifest.json"), manifest).unwrap();

        let result = PluginLoader::load_plugin(temp_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_load_manifest_empty_name() {
        let temp_dir = TempDir::new().unwrap();

        let manifest = r#"{
            "id": "test-plugin",
            "name": "",
            "version": "1.0.0",
            "contributes": {}
        }"#;

        fs::write(temp_dir.path().join("manifest.json"), manifest).unwrap();

        let result = PluginLoader::load_plugin(temp_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_plugin_valid() {
        let temp_dir = TempDir::new().unwrap();

        let manifest = r#"{
            "id": "test-plugin",
            "name": "Test Plugin",
            "version": "1.0.0",
            "main": "index.js",
            "contributes": {}
        }"#;

        fs::write(temp_dir.path().join("manifest.json"), manifest).unwrap();
        fs::write(temp_dir.path().join("index.js"), "console.log('hello');").unwrap();

        let errors = PluginLoader::validate_plugin(temp_dir.path()).unwrap();
        assert!(errors.is_empty());
    }

    #[test]
    fn test_validate_plugin_missing_entry() {
        let temp_dir = TempDir::new().unwrap();

        let manifest = r#"{
            "id": "test-plugin",
            "name": "Test Plugin",
            "version": "1.0.0",
            "main": "nonexistent.js",
            "contributes": {}
        }"#;

        fs::write(temp_dir.path().join("manifest.json"), manifest).unwrap();

        let errors = PluginLoader::validate_plugin(temp_dir.path()).unwrap();
        assert!(errors.iter().any(|e| e.contains("not found")));
    }

    #[test]
    fn test_check_dependencies_satisfied() {
        let manifest = PluginManifest {
            id: "test-plugin".to_string(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: None,
            author: None,
            icon: None,
            main: None,
            contributes: PluginContributes::default(),
            dependencies: Some(PluginDependencies {
                other_plugins: Some(vec!["dep1".to_string(), "dep2".to_string()]),
                node_modules: None,
            }),
            activation_events: None,
        };

        let installed = vec![
            PluginInfo {
                id: "dep1".to_string(),
                name: "Dep 1".to_string(),
                version: "1.0.0".to_string(),
                description: None,
                author: None,
                enabled: true,
                installed: true,
                has_update: false,
            },
            PluginInfo {
                id: "dep2".to_string(),
                name: "Dep 2".to_string(),
                version: "1.0.0".to_string(),
                description: None,
                author: None,
                enabled: true,
                installed: true,
                has_update: false,
            },
        ];

        let result = PluginLoader::check_dependencies(&manifest, &installed);
        assert!(result.is_ok());
    }

    #[test]
    fn test_check_dependencies_missing() {
        let manifest = PluginManifest {
            id: "test-plugin".to_string(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: None,
            author: None,
            icon: None,
            main: None,
            contributes: PluginContributes::default(),
            dependencies: Some(PluginDependencies {
                other_plugins: Some(vec!["missing-dep".to_string()]),
                node_modules: None,
            }),
            activation_events: None,
        };

        let installed = vec![];

        let result = PluginLoader::check_dependencies(&manifest, &installed);
        assert!(result.is_err());
    }

    // ========== Sandbox Tests ==========

    #[test]
    fn test_sandbox_default_permissions() {
        let perms = PluginPermissions::default();
        let sandbox = PluginSandbox::new(perms);

        // Console should be allowed by default
        assert!(sandbox.is_api_allowed("console"));
        assert!(sandbox.is_api_allowed("fetch"));
        assert!(sandbox.is_api_allowed("XMLHttpRequest"));

        // Most things should be blocked
        assert!(!sandbox.is_api_allowed("WebSocket"));
        assert!(!sandbox.is_api_allowed("localStorage"));
        assert!(!sandbox.is_api_allowed("IndexedDB"));
    }

    #[test]
    fn test_sandbox_network_permissions() {
        let perms = PluginPermissions {
            network: Some(NetworkPermissions {
                domains: Some(vec![
                    "example.com".to_string(),
                    "api.github.com".to_string(),
                ]),
            }),
            ..Default::default()
        };

        let sandbox = PluginSandbox::new(perms);

        assert!(sandbox.is_domain_allowed("example.com"));
        assert!(sandbox.is_domain_allowed("sub.example.com"));
        assert!(sandbox.is_domain_allowed("api.github.com"));
        assert!(!sandbox.is_domain_allowed("evil.com"));
    }

    #[test]
    fn test_sandbox_filesystem_permissions() {
        let perms = PluginPermissions {
            filesystem: Some(FilesystemPermissions {
                read: true,
                write: true,
                paths: Some(vec!["/home/user/data".to_string()]),
            }),
            ..Default::default()
        };

        let sandbox = PluginSandbox::new(perms);

        assert!(sandbox.is_read_allowed("/home/user/data/file.txt"));
        assert!(sandbox.is_read_allowed("/home/user/data"));
        assert!(!sandbox.is_read_allowed("/etc/passwd"));

        assert!(sandbox.is_write_allowed("/home/user/data/file.txt"));
        assert!(!sandbox.is_write_allowed("/etc/passwd"));
    }

    #[test]
    fn test_sandbox_gateway_permissions() {
        let perms = PluginPermissions {
            gateway: Some(GatewayPermissions {
                methods: Some(vec![
                    "sessions:list".to_string(),
                    "agents:invoke".to_string(),
                ]),
            }),
            ..Default::default()
        };

        let sandbox = PluginSandbox::new(perms);

        assert!(sandbox.is_gateway_method_allowed("sessions:list"));
        assert!(sandbox.is_gateway_method_allowed("agents:invoke"));
        assert!(!sandbox.is_gateway_method_allowed("system:exec"));
    }

    #[test]
    fn test_sandbox_ui_permissions() {
        let perms = PluginPermissions {
            ui: Some(UiPermissions {
                create_panels: true,
                show_notifications: true,
            }),
            ..Default::default()
        };

        let sandbox = PluginSandbox::new(perms);

        assert!(sandbox.can_create_panels());
        assert!(sandbox.can_show_notifications());
    }

    #[test]
    fn test_sandbox_ui_permissions_denied() {
        let perms = PluginPermissions::default();
        let sandbox = PluginSandbox::new(perms);

        assert!(!sandbox.can_create_panels());
        assert!(!sandbox.can_show_notifications());
    }

    #[test]
    fn test_sandbox_resource_limits() {
        let limits = ResourceLimits::default();

        // Verify default limits
        assert_eq!(limits.memory_bytes, 50 * 1024 * 1024); // 50MB
        assert_eq!(limits.cpu_seconds, 30);
        assert_eq!(limits.network_requests_per_minute, 100);
        assert_eq!(limits.max_file_size, 10 * 1024 * 1024); // 10MB
        assert_eq!(limits.storage_bytes, 100 * 1024 * 1024); // 100MB
    }

    #[test]
    fn test_allowed_apis_defaults() {
        let apis = AllowedApis::default_for_plugin();

        assert!(apis.console);
        assert!(apis.fetch);
        assert!(apis.xhr);
        assert!(apis.post_message);
        assert!(!apis.websocket);
        assert!(!apis.local_storage);
        assert!(!apis.session_storage);
        assert!(!apis.indexed_db);
        assert!(!apis.parent_access);
    }

    #[test]
    fn test_allowed_apis_all() {
        let apis = AllowedApis::all_allowed();

        assert!(apis.console);
        assert!(apis.fetch);
        assert!(apis.xhr);
        assert!(apis.websocket);
        assert!(apis.local_storage);
        assert!(apis.session_storage);
        assert!(apis.indexed_db);
        assert!(apis.parent_access);
        assert!(apis.post_message);
    }

    #[test]
    fn test_sandbox_csp_with_network() {
        let perms = PluginPermissions {
            network: Some(NetworkPermissions {
                domains: Some(vec!["api.example.com".to_string()]),
            }),
            ..Default::default()
        };

        let sandbox = PluginSandbox::new(perms);
        let csp = sandbox.generate_csp();

        assert!(csp.contains("default-src 'self'"));
        assert!(csp.contains("connect-src 'self' api.example.com"));
    }

    #[test]
    fn test_sandbox_csp_no_network() {
        let perms = PluginPermissions::default();
        let sandbox = PluginSandbox::new(perms);
        let csp = sandbox.generate_csp();

        assert!(csp.contains("connect-src 'none'"));
    }

    // ========== Sandbox Manager Tests ==========

    #[test]
    fn test_sandbox_manager_register_get() {
        let mut manager = SandboxManager::new();

        let perms = PluginPermissions::default();
        let sandbox = PluginSandbox::new(perms);

        manager.register("test-plugin".to_string(), sandbox);

        let retrieved = manager.get("test-plugin");
        assert!(retrieved.is_some());
    }

    #[test]
    fn test_sandbox_manager_remove() {
        let mut manager = SandboxManager::new();

        let perms = PluginPermissions::default();
        let sandbox = PluginSandbox::new(perms);

        manager.register("test-plugin".to_string(), sandbox);
        manager.remove("test-plugin");

        let retrieved = manager.get("test-plugin");
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_sandbox_manager_check_permission() {
        let mut manager = SandboxManager::new();

        let perms = PluginPermissions {
            network: Some(NetworkPermissions {
                domains: Some(vec!["example.com".to_string()]),
            }),
            ..Default::default()
        };
        let sandbox = PluginSandbox::new(perms);

        manager.register("test-plugin".to_string(), sandbox);

        assert!(manager.check_permission("test-plugin", &PermissionCheck::Domain("example.com")));
        assert!(!manager.check_permission("test-plugin", &PermissionCheck::Domain("evil.com")));
    }

    #[test]
    fn test_sandbox_manager_unknown_plugin() {
        let manager = SandboxManager::new();

        assert!(!manager.check_permission("unknown-plugin", &PermissionCheck::Api("console")));
    }

    // ========== Types Tests ==========

    #[test]
    fn test_plugin_new() {
        let manifest = PluginManifest {
            id: "test-plugin".to_string(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: None,
            author: None,
            icon: None,
            main: None,
            contributes: PluginContributes::default(),
            dependencies: None,
            activation_events: None,
        };

        let path = std::path::PathBuf::from("/path/to/plugin");
        let plugin = Plugin::new(manifest, path.clone());

        assert_eq!(plugin.manifest.id, "test-plugin");
        assert!(plugin.enabled);
        assert_eq!(plugin.path, path);
    }

    #[test]
    fn test_panel_position_default() {
        let position: PanelPosition = Default::default();
        assert_eq!(position, PanelPosition::Sidebar);
    }

    #[test]
    fn test_plugin_permissions_default() {
        let perms: PluginPermissions = Default::default();

        assert!(perms.filesystem.is_none());
        assert!(perms.network.is_none());
        assert!(perms.gateway.is_none());
        assert!(perms.ui.is_none());
    }

    #[test]
    fn test_filesystem_permissions_defaults() {
        let fs_perms = FilesystemPermissions::default();

        assert!(!fs_perms.read);
        assert!(!fs_perms.write);
        assert!(fs_perms.paths.is_none());
    }
}
