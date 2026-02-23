/**
 * ClawStation Plugin Loader
 * 
 * 插件加载器 - 负责从不同来源加载插件
 */

import type {
  Plugin,
  PluginManifest,
  LoadedPlugin,
  IPluginLoader,
  PanelDefinition,
  CommandDefinition,
  ThemeDefinition,
} from '../types/plugin';

// Re-export interface for external use
export type { IPluginLoader };

/**
 * 插件加载错误
 */
export class PluginLoadError extends Error {
  readonly source: string;
  readonly cause?: Error;

  constructor(
    message: string,
    source: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'PluginLoadError';
    this.source = source;
    this.cause = cause;
  }
}

/**
 * 插件清单验证错误
 */
export class ManifestValidationError extends Error {
  readonly manifest: unknown;
  readonly errors: string[];

  constructor(
    message: string,
    manifest: unknown,
    errors: string[]
  ) {
    super(message);
    this.name = 'ManifestValidationError';
    this.manifest = manifest;
    this.errors = errors;
  }
}

/**
 * 插件加载器配置
 */
export interface PluginLoaderConfig {
  /** 内置插件目录 */
  builtinPluginsDir?: string;
  
  /** 用户插件目录 */
  userPluginsDir?: string;
  
  /** 是否允许从 URL 加载 */
  allowURLLoading?: boolean;
  
  /** 是否允许从 npm 加载 */
  allowNPMLoading?: boolean;
  
  /** 请求超时 (ms) */
  timeout?: number;
}

/**
 * 插件加载器
 */
export class PluginLoader implements IPluginLoader {
  private config: PluginLoaderConfig;
  private builtinPlugins: Map<string, Plugin> = new Map();

  constructor(config: PluginLoaderConfig = {}) {
    this.config = {
      builtinPluginsDir: '/builtin-plugins',
      userPluginsDir: '~/.clawstation/plugins',
      allowURLLoading: true,
      allowNPMLoading: false,
      timeout: 30000,
      ...config,
    };
    
    // 注册内置插件
    this.registerBuiltinPlugins();
  }

  /**
   * 从本地路径加载插件
   */
  async loadFromLocal(path: string): Promise<LoadedPlugin> {
    try {
      // 读取 manifest.json
      const manifest = await this.loadManifestFromPath(path);
      
      // 加载插件代码
      const plugin = await this.loadPluginCode(path, manifest);
      
      return {
        manifest,
        plugin,
        source: { type: 'local', location: path },
      };
    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin from local path: ${path}`,
        path,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 从 URL 加载插件
   */
  async loadFromURL(url: string): Promise<LoadedPlugin> {
    if (!this.config.allowURLLoading) {
      throw new PluginLoadError('URL loading is not allowed', url);
    }

    try {
      // 获取 manifest
      const manifestUrl = url.endsWith('/manifest.json') 
        ? url 
        : `${url.replace(/\/$/, '')}/manifest.json`;
      
      const manifest = await this.fetchManifest(manifestUrl);
      
      // 获取插件代码
      const codeUrl = `${url.replace(/\/$/, '')}/index.js`;
      const plugin = await this.loadPluginFromURL(codeUrl, manifest);
      
      return {
        manifest,
        plugin,
        source: { type: 'url', location: url },
      };
    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin from URL: ${url}`,
        url,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 从 npm 包加载插件
   */
  async loadFromNPM(packageName: string, _version?: string): Promise<LoadedPlugin> {
    if (!this.config.allowNPMLoading) {
      throw new PluginLoadError('NPM loading is not allowed', `npm:${packageName}`);
    }

    try {
      // TODO: 实现 npm 包加载逻辑
      // 1. 下载或引用 npm 包
      // 2. 读取 package.json 和 manifest.json
      // 3. 加载插件代码
      
      throw new Error('NPM loading not yet implemented');
    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin from NPM: ${packageName}`,
        `npm:${packageName}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 加载内置插件
   */
  async loadBuiltin(pluginId: string): Promise<LoadedPlugin> {
    const plugin = this.builtinPlugins.get(pluginId);
    
    if (!plugin) {
      throw new PluginLoadError(
        `Builtin plugin not found: ${pluginId}`,
        `builtin:${pluginId}`
      );
    }

    return {
      manifest: plugin.manifest,
      plugin,
      source: { type: 'builtin', location: `builtin:${pluginId}` },
    };
  }

  /**
   * 验证插件清单
   */
  validateManifest(manifest: unknown): PluginManifest {
    const errors: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      throw new ManifestValidationError(
        'Manifest must be an object',
        manifest,
        ['Manifest is not an object']
      );
    }

    const m = manifest as Record<string, unknown>;

    // 验证必需字段
    if (!m.id || typeof m.id !== 'string') {
      errors.push('Missing or invalid "id" field');
    }

    if (!m.name || typeof m.name !== 'string') {
      errors.push('Missing or invalid "name" field');
    }

    if (!m.version || typeof m.version !== 'string') {
      errors.push('Missing or invalid "version" field');
    }

    if (!m.contributes || typeof m.contributes !== 'object') {
      errors.push('Missing or invalid "contributes" field');
    }

    // 验证版本号格式 (简化检查)
    if (m.version && !/^\d+\.\d+\.\d+/.test(m.version as string)) {
      errors.push('Invalid version format (expected semver like 1.0.0)');
    }

    // 验证 ID 格式
    if (m.id && !/^[a-z0-9-]+$/.test(m.id as string)) {
      errors.push('Invalid id format (only lowercase letters, numbers, and hyphens allowed)');
    }

    if (errors.length > 0) {
      throw new ManifestValidationError(
        'Manifest validation failed',
        manifest,
        errors
      );
    }

    return manifest as PluginManifest;
  }

  /**
   * 注册内置插件
   */
  registerBuiltinPlugin(pluginId: string, plugin: Plugin): void {
    this.builtinPlugins.set(pluginId, plugin);
  }

  /**
   * 获取所有内置插件 ID
   */
  getBuiltinPluginIds(): string[] {
    return Array.from(this.builtinPlugins.keys());
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 从路径加载 manifest
   */
  private async loadManifestFromPath(path: string): Promise<PluginManifest> {
    // 在浏览器环境中，我们需要使用 fetch
    // 在 Node 环境中，我们需要使用 fs
    
    try {
      // 尝试作为 URL 加载
      const manifestUrl = path.endsWith('/manifest.json') 
        ? path 
        : `${path}/manifest.json`;
      
      return await this.fetchManifest(manifestUrl);
    } catch {
      // 如果 URL 加载失败，尝试使用文件系统 API
      // 这在 Tauri 环境中可用
      if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: boolean }).__TAURI__) {
        // 使用 Tauri API 读取文件
        const manifestPath = path.endsWith('/manifest.json')
          ? path
          : `${path}/manifest.json`;
        
        // 使用 fetch 读取本地文件
        const response = await fetch(`file://${manifestPath}`);
        if (!response.ok) {
          throw new Error(`Failed to read manifest: ${response.statusText}`);
        }
        const content = await response.text();
        const manifest = JSON.parse(content);
        return this.validateManifest(manifest);
      }
      
      throw new Error(`Cannot load manifest from path: ${path}`);
    }
  }

  /**
   * 获取 manifest 从 URL
   */
  private async fetchManifest(url: string): Promise<PluginManifest> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const manifest = await response.json();
    return this.validateManifest(manifest);
  }

  /**
   * 加载插件代码
   */
  private async loadPluginCode(path: string, manifest: PluginManifest): Promise<Plugin> {
    // 尝试加载 index.js 或 index.ts
    const entryFiles = ['index.js', 'index.ts', 'index.mjs'];
    
    for (const entryFile of entryFiles) {
      try {
        const entryPath = path.endsWith(entryFile)
          ? path
          : `${path}/${entryFile}`;
        
        // 动态导入插件模块
        const module = await import(/* @vite-ignore */ entryPath);
        
        // 获取默认导出或命名导出
        const plugin = module.default || module.plugin || module;
        
        // 验证插件对象
        this.validatePlugin(plugin, manifest);
        
        return plugin;
      } catch {
        // 继续尝试下一个文件
        continue;
      }
    }
    
    throw new Error(`Cannot find plugin entry file in ${path}`);
  }

  /**
   * 从 URL 加载插件代码
   */
  private async loadPluginFromURL(url: string, manifest: PluginManifest): Promise<Plugin> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const code = await response.text();
    
    // 使用动态导入加载模块
    // 创建一个 Blob URL 来加载代码
    const blob = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    
    try {
      const module = await import(/* @vite-ignore */ blobUrl);
      const plugin = module.default || module.plugin || module;
      
      this.validatePlugin(plugin, manifest);
      
      return plugin;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  /**
   * 验证插件对象
   */
  private validatePlugin(plugin: unknown, _manifest: PluginManifest): asserts plugin is Plugin {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }

    const p = plugin as Record<string, unknown>;

    // 检查 manifest
    if (!p.manifest) {
      throw new Error('Plugin must have a manifest property');
    }

    // 检查 activate 方法
    if (typeof p.activate !== 'function') {
      throw new Error('Plugin must have an activate method');
    }

    // 可选：检查 deactivate 方法
    if (p.deactivate !== undefined && typeof p.deactivate !== 'function') {
      throw new Error('Plugin deactivate must be a function if provided');
    }
  }

  /**
   * 注册所有内置插件
   */
  private registerBuiltinPlugins(): void {
    // 注册聊天插件
    this.registerBuiltinPlugin('chat', createChatPlugin());
    
    // 注册 Canvas 插件
    this.registerBuiltinPlugin('canvas', createCanvasPlugin());
    
    // 注册文件浏览器插件
    this.registerBuiltinPlugin('file-browser', createFileBrowserPlugin());
    
    // 注册 Agent 管理插件
    this.registerBuiltinPlugin('agent-manager', createAgentManagerPlugin());
    
    // 注册会话管理插件
    this.registerBuiltinPlugin('session-manager', createSessionManagerPlugin());
    
    // 注册默认主题插件
    this.registerBuiltinPlugin('theme-default', createDefaultThemePlugin());
  }
}

// ============================================================================
// 内置插件工厂函数
// ============================================================================

/**
 * 创建聊天插件
 */
function createChatPlugin(): Plugin {
  const manifest: PluginManifest = {
    id: 'chat',
    name: 'Chat',
    version: '1.0.0',
    description: 'Chat functionality for ClawStation',
    contributes: {
      panels: [
        {
          id: 'chat-panel',
          title: 'Chat',
          icon: 'message-square',
          position: 'main',
          component: './components/chat/ChatPanel',
          defaultOpen: true,
        },
      ],
      commands: [
        {
          id: 'chat.sendMessage',
          name: 'Send Message',
          description: 'Send a message in the chat',
          handler: async () => {
            console.log('Sending message...');
          },
        },
        {
          id: 'chat.clearHistory',
          name: 'Clear Chat History',
          description: 'Clear the chat history',
          handler: async () => {
            console.log('Clearing chat history...');
          },
        },
      ],
    },
  };

  return {
    manifest,
    
    async activate(context) {
      console.log('Chat plugin activated');
      
      // 注册面板
      manifest.contributes?.panels?.forEach((panel: PanelDefinition) => {
        context.registerPanel(panel);
      });
      
      // 注册命令
      manifest.contributes?.commands?.forEach((command: CommandDefinition) => {
        context.registerCommand(command);
      });
    },
    
    async deactivate() {
      console.log('Chat plugin deactivated');
    },
  };
}

/**
 * 创建 Canvas 插件
 */
function createCanvasPlugin(): Plugin {
  const manifest: PluginManifest = {
    id: 'canvas',
    name: 'Canvas',
    version: '1.0.0',
    description: 'Visualization canvas for ClawStation',
    contributes: {
      panels: [
        {
          id: 'canvas-panel',
          title: 'Canvas',
          icon: 'layout',
          position: 'main',
          component: './components/canvas/CanvasPanel',
        },
      ],
      commands: [
        {
          id: 'canvas.addNode',
          name: 'Add Node',
          description: 'Add a node to the canvas',
          handler: async () => {
            console.log('Adding node...');
          },
        },
        {
          id: 'canvas.clear',
          name: 'Clear Canvas',
          description: 'Clear the canvas',
          handler: async () => {
            console.log('Clearing canvas...');
          },
        },
      ],
    },
  };

  return {
    manifest,
    
    async activate(context) {
      console.log('Canvas plugin activated');
      
      manifest.contributes?.panels?.forEach((panel: PanelDefinition) => {
        context.registerPanel(panel);
      });
      
      manifest.contributes?.commands?.forEach((command: CommandDefinition) => {
        context.registerCommand(command);
      });
    },
    
    async deactivate() {
      console.log('Canvas plugin deactivated');
    },
  };
}

/**
 * 创建文件浏览器插件
 */
function createFileBrowserPlugin(): Plugin {
  const manifest: PluginManifest = {
    id: 'file-browser',
    name: 'File Browser',
    version: '1.0.0',
    description: 'File browser for ClawStation',
    contributes: {
      panels: [
        {
          id: 'file-browser-panel',
          title: 'Files',
          icon: 'folder',
          position: 'sidebar',
          component: './components/files/FileBrowser',
        },
      ],
      commands: [
        {
          id: 'files.open',
          name: 'Open File',
          description: 'Open a file',
          keybinding: 'Ctrl+O',
          handler: async () => {
            console.log('Opening file...');
          },
        },
        {
          id: 'files.save',
          name: 'Save File',
          description: 'Save the current file',
          keybinding: 'Ctrl+S',
          handler: async () => {
            console.log('Saving file...');
          },
        },
      ],
    },
  };

  return {
    manifest,
    
    async activate(context) {
      console.log('File Browser plugin activated');
      
      manifest.contributes?.panels?.forEach((panel: PanelDefinition) => {
        context.registerPanel(panel);
      });
      
      manifest.contributes?.commands?.forEach((command: CommandDefinition) => {
        context.registerCommand(command);
      });
    },
    
    async deactivate() {
      console.log('File Browser plugin deactivated');
    },
  };
}

/**
 * 创建 Agent 管理插件
 */
function createAgentManagerPlugin(): Plugin {
  const manifest: PluginManifest = {
    id: 'agent-manager',
    name: 'Agent Manager',
    version: '1.0.0',
    description: 'Agent management for ClawStation',
    contributes: {
      panels: [
        {
          id: 'agent-list-panel',
          title: 'Agents',
          icon: 'users',
          position: 'sidebar',
          component: './components/agent/AgentList',
        },
      ],
      commands: [
        {
          id: 'agents.create',
          name: 'Create Agent',
          description: 'Create a new agent',
          handler: async () => {
            console.log('Creating agent...');
          },
        },
        {
          id: 'agents.delete',
          name: 'Delete Agent',
          description: 'Delete an agent',
          handler: async () => {
            console.log('Deleting agent...');
          },
        },
      ],
    },
  };

  return {
    manifest,
    
    async activate(context) {
      console.log('Agent Manager plugin activated');
      
      manifest.contributes?.panels?.forEach((panel: PanelDefinition) => {
        context.registerPanel(panel);
      });
      
      manifest.contributes?.commands?.forEach((command: CommandDefinition) => {
        context.registerCommand(command);
      });
    },
    
    async deactivate() {
      console.log('Agent Manager plugin deactivated');
    },
  };
}

/**
 * 创建会话管理插件
 */
function createSessionManagerPlugin(): Plugin {
  const manifest: PluginManifest = {
    id: 'session-manager',
    name: 'Session Manager',
    version: '1.0.0',
    description: 'Session management for ClawStation',
    contributes: {
      panels: [
        {
          id: 'session-tabs-panel',
          title: 'Sessions',
          icon: 'tabs',
          position: 'sidebar',
          component: './components/session/SessionTabs',
        },
      ],
      commands: [
        {
          id: 'sessions.new',
          name: 'New Session',
          description: 'Create a new session',
          keybinding: 'Ctrl+N',
          handler: async () => {
            console.log('Creating new session...');
          },
        },
        {
          id: 'sessions.close',
          name: 'Close Session',
          description: 'Close the current session',
          keybinding: 'Ctrl+W',
          handler: async () => {
            console.log('Closing session...');
          },
        },
      ],
    },
  };

  return {
    manifest,
    
    async activate(context) {
      console.log('Session Manager plugin activated');
      
      manifest.contributes?.panels?.forEach((panel: PanelDefinition) => {
        context.registerPanel(panel);
      });
      
      manifest.contributes?.commands?.forEach((command: CommandDefinition) => {
        context.registerCommand(command);
      });
    },
    
    async deactivate() {
      console.log('Session Manager plugin deactivated');
    },
  };
}

/**
 * 创建默认主题插件
 */
function createDefaultThemePlugin(): Plugin {
  const manifest: PluginManifest = {
    id: 'theme-default',
    name: 'Default Theme',
    version: '1.0.0',
    description: 'Default theme for ClawStation',
    contributes: {
      themes: [
        {
          id: 'default-light',
          name: 'Light',
          isDark: false,
          colors: {
            primary: '#3b82f6',
            secondary: '#64748b',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#0f172a',
            textMuted: '#64748b',
            border: '#e2e8f0',
            accent: '#8b5cf6',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
          },
          fonts: {
            sans: 'Inter, system-ui, sans-serif',
            mono: 'JetBrains Mono, monospace',
          },
        },
        {
          id: 'default-dark',
          name: 'Dark',
          isDark: true,
          colors: {
            primary: '#60a5fa',
            secondary: '#94a3b8',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f8fafc',
            textMuted: '#94a3b8',
            border: '#334155',
            accent: '#a78bfa',
            success: '#4ade80',
            warning: '#fbbf24',
            error: '#f87171',
          },
          fonts: {
            sans: 'Inter, system-ui, sans-serif',
            mono: 'JetBrains Mono, monospace',
          },
        },
      ],
    },
  };

  return {
    manifest,
    
    async activate(context) {
      console.log('Default Theme plugin activated');
      
      manifest.contributes?.themes?.forEach((theme: ThemeDefinition) => {
        context.registerTheme(theme);
      });
    },
    
    async deactivate() {
      console.log('Default Theme plugin deactivated');
    },
  };
}

/**
 * 创建默认的插件加载器
 */
export function createPluginLoader(config?: PluginLoaderConfig): PluginLoader {
  return new PluginLoader(config);
}
