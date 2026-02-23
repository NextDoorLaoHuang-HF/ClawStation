/**
 * ClawStation Plugin Manager
 * 
 * 插件管理器 - 负责插件的生命周期管理
 */

import type {
  Plugin,
  PluginId,
  PluginInfo,
  PluginContext,
  PluginManifest,
  PluginChangeEvent,
  CommandDefinition,
  CommandContext,
  PanelDefinition,
  WidgetDefinition,
  ThemeDefinition,
  CanvasRendererDefinition,
  ServiceDefinition,
  Disposable,
  IPluginManager,
  LoadedPlugin,
  MessageType,
} from '../types/plugin';
import type { IPluginLoader } from './PluginLoader';
import type { IPluginSandbox } from './PluginSandbox';

/**
 * 插件条目 - 内部使用的完整插件信息
 */
interface PluginEntry {
  info: PluginInfo;
  manifest?: PluginManifest;
  instance?: Plugin;
  context?: PluginContext;
  disposables: Disposable[];
}

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
  /** 插件目录 */
  pluginsDir: string;
  
  /** 是否启用沙箱 */
  enableSandbox: boolean;
  
  /** 自动激活内置插件 */
  autoActivateBuiltins: boolean;
  
  /** 插件加载器 */
  loader: IPluginLoader;
  
  /** 沙箱工厂 */
  sandboxFactory?: (manifest: PluginManifest) => IPluginSandbox;
}

/**
 * 插件管理器
 */
export class PluginManager implements IPluginManager {
  /** 插件注册表 */
  private plugins: Map<PluginId, PluginEntry> = new Map();
  
  /** 命令注册表 */
  private commands: Map<string, { command: CommandDefinition; pluginId: PluginId }> = new Map();
  
  /** 面板注册表 */
  private panels: Map<string, { panel: PanelDefinition; pluginId: PluginId }> = new Map();
  
  /** 小部件注册表 */
  private widgets: Map<string, { widget: WidgetDefinition; pluginId: PluginId }> = new Map();
  
  /** 主题注册表 */
  private themes: Map<string, { theme: ThemeDefinition; pluginId: PluginId }> = new Map();
  
  /** Canvas 渲染器注册表 */
  private canvasRenderers: Map<string, { renderer: CanvasRendererDefinition; pluginId: PluginId }> = new Map();
  
  /** 服务注册表 */
  private services: Map<string, { service: ServiceDefinition; pluginId: PluginId }> = new Map();
  
  /** 变更监听器 */
  private changeListeners: Set<(event: PluginChangeEvent) => void> = new Set();
  
  /** 配置 */
  private config: PluginManagerConfig;
  
  /** 全局 Gateway API (由外部注入) */
  private gatewayAPI: PluginContext['gateway'];
  
  /** 全局 Workspace API (由外部注入) */
  private workspaceAPI: PluginContext['workspace'];

  constructor(config: PluginManagerConfig) {
    this.config = config;
    
    // 初始化默认 API (会被外部设置覆盖)
    this.gatewayAPI = {
      invoke: async () => { throw new Error('Gateway API not initialized'); },
      subscribe: () => ({ dispose: () => {} }),
    };
    
    this.workspaceAPI = {
      readFile: async () => { throw new Error('Workspace API not initialized'); },
      writeFile: async () => { throw new Error('Workspace API not initialized'); },
      exists: async () => false,
      listDirectory: async () => [],
      getCurrentDirectory: () => '/',
    };
  }

  /**
   * 设置 Gateway API
   */
  setGatewayAPI(api: PluginContext['gateway']): void {
    this.gatewayAPI = api;
  }

  /**
   * 设置 Workspace API
   */
  setWorkspaceAPI(api: PluginContext['workspace']): void {
    this.workspaceAPI = api;
  }

  /**
   * 初始化插件管理器
   */
  async initialize(): Promise<void> {
    // 加载已安装的插件列表
    await this.loadInstalledPlugins();
    
    // 自动激活内置插件
    if (this.config.autoActivateBuiltins) {
      await this.activateBuiltinPlugins();
    }
  }

  /**
   * 列出所有插件
   */
  list(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(entry => entry.info);
  }

  /**
   * 获取插件信息
   */
  get(pluginId: PluginId): PluginInfo | undefined {
    return this.plugins.get(pluginId)?.info;
  }

  /**
   * 安装插件
   */
  async install(source: string): Promise<void> {
    try {
      let loaded: LoadedPlugin;
      
      // 根据 source 类型选择加载方式
      if (source.startsWith('http://') || source.startsWith('https://')) {
        loaded = await this.config.loader.loadFromURL(source);
      } else if (source.startsWith('npm:')) {
        const packageName = source.slice(4);
        loaded = await this.config.loader.loadFromNPM(packageName);
      } else {
        loaded = await this.config.loader.loadFromLocal(source);
      }

      const { manifest, plugin } = loaded;
      
      // 检查插件是否已存在
      if (this.plugins.has(manifest.id)) {
        throw new Error(`Plugin ${manifest.id} is already installed`);
      }

      // 创建插件条目
      const entry: PluginEntry = {
        info: {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          enabled: false,
          installed: true,
          state: 'inactive',
          updateAvailable: false,
        },
        manifest,
        instance: plugin,
        disposables: [],
      };

      this.plugins.set(manifest.id, entry);
      
      // 触发事件
      this.emitChange({
        type: 'installed',
        pluginId: manifest.id,
        plugin: entry.info,
      });

    } catch (error) {
      console.error('Failed to install plugin:', error);
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: PluginId): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // 如果插件处于激活状态，先停用
    if (entry.info.state === 'active') {
      await this.disable(pluginId);
    }

    // 清理资源
    this.cleanupPlugin(entry);
    
    // 从注册表中移除
    this.plugins.delete(pluginId);

    // 触发事件
    this.emitChange({
      type: 'uninstalled',
      pluginId,
    });
  }

  /**
   * 启用插件 (激活)
   */
  async enable(pluginId: PluginId): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (entry.info.enabled) {
      return; // 已经启用
    }

    try {
      entry.info.state = 'activating';
      
      // 检查依赖
      await this.checkDependencies(entry.manifest!);

      // 创建插件上下文
      const context = this.createPluginContext(entry.manifest!);
      entry.context = context;

      // 激活插件
      if (entry.instance) {
        await entry.instance.activate(context);
      }

      entry.info.enabled = true;
      entry.info.state = 'active';

      // 触发事件
      this.emitChange({
        type: 'enabled',
        pluginId,
        plugin: entry.info,
      });
      
      this.emitChange({
        type: 'activated',
        pluginId,
        plugin: entry.info,
      });

    } catch (error) {
      entry.info.state = 'error';
      entry.info.error = error instanceof Error ? error.message : String(error);
      
      this.emitChange({
        type: 'error',
        pluginId,
        error: entry.info.error,
      });
      
      throw error;
    }
  }

  /**
   * 禁用插件 (停用)
   */
  async disable(pluginId: PluginId): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!entry.info.enabled) {
      return; // 已经禁用
    }

    try {
      entry.info.state = 'deactivating';

      // 调用插件的 deactivate 方法
      if (entry.instance?.deactivate) {
        await entry.instance.deactivate();
      }

      // 清理资源
      this.cleanupPlugin(entry);

      entry.info.enabled = false;
      entry.info.state = 'inactive';
      entry.info.error = undefined;

      // 触发事件
      this.emitChange({
        type: 'disabled',
        pluginId,
        plugin: entry.info,
      });
      
      this.emitChange({
        type: 'deactivated',
        pluginId,
      });

    } catch (error) {
      entry.info.state = 'error';
      entry.info.error = error instanceof Error ? error.message : String(error);
      
      this.emitChange({
        type: 'error',
        pluginId,
        error: entry.info.error,
      });
      
      throw error;
    }
  }

  /**
   * 更新插件
   */
  async update(pluginId: PluginId): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const wasEnabled = entry.info.enabled;
    const oldVersion = entry.info.version;

    // 禁用旧版本
    if (wasEnabled) {
      await this.disable(pluginId);
    }

    // 重新加载插件
    // TODO: 实现实际的更新逻辑
    void oldVersion; // 标记为已使用
    
    // 重新启用
    if (wasEnabled) {
      await this.enable(pluginId);
    }

    // 触发事件
    this.emitChange({
      type: 'updated',
      pluginId,
      plugin: entry.info,
    });
  }

  /**
   * 重新加载插件
   */
  async reload(pluginId: PluginId): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const wasEnabled = entry.info.enabled;

    // 禁用
    if (wasEnabled) {
      await this.disable(pluginId);
    }

    // 重新加载
    // TODO: 实现实际的重载逻辑

    // 重新启用
    if (wasEnabled) {
      await this.enable(pluginId);
    }
  }

  /**
   * 检查插件是否已激活
   */
  isActive(pluginId: PluginId): boolean {
    return this.plugins.get(pluginId)?.info.state === 'active';
  }

  /**
   * 获取已激活的插件实例
   */
  getPluginInstance(pluginId: PluginId): Plugin | undefined {
    return this.plugins.get(pluginId)?.instance;
  }

  /**
   * 获取所有已注册的命令
   */
  getCommands(): CommandDefinition[] {
    return Array.from(this.commands.values()).map(c => c.command);
  }

  /**
   * 获取所有已注册的面板
   */
  getPanels(): PanelDefinition[] {
    return Array.from(this.panels.values()).map(p => p.panel);
  }

  /**
   * 获取所有已注册的主题
   */
  getThemes(): ThemeDefinition[] {
    return Array.from(this.themes.values()).map(t => t.theme);
  }

  /**
   * 执行命令
   */
  async executeCommand(
    commandId: string,
    context: Partial<CommandContext> = {}
  ): Promise<void> {
    const registered = this.commands.get(commandId);
    if (!registered) {
      throw new Error(`Command ${commandId} not found`);
    }

    const { command } = registered;
    
    // 构建完整的命令上下文
    const fullContext = {
      sessionKey: context.sessionKey || 'default',
      agentId: context.agentId || 'default',
      selection: context.selection,
      workspace: context.workspace || this.workspaceAPI,
      gateway: context.gateway || this.gatewayAPI,
      showMessage: (message: string, type?: MessageType) => {
        console.log(`[${type || 'info'}] ${message}`);
      },
    };

    await command.handler(fullContext);
  }

  /**
   * 订阅插件变更事件
   */
  onChange(handler: (event: PluginChangeEvent) => void): Disposable {
    this.changeListeners.add(handler);
    
    return {
      dispose: () => {
        this.changeListeners.delete(handler);
      },
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 加载已安装的插件列表
   */
  private async loadInstalledPlugins(): Promise<void> {
    // TODO: 从配置文件加载已安装插件列表
    // 目前先加载内置插件
  }

  /**
   * 激活内置插件
   */
  private async activateBuiltinPlugins(): Promise<void> {
    const builtinPlugins = [
      'chat',
      'canvas',
      'file-browser',
      'agent-manager',
      'session-manager',
      'theme-default',
    ];

    for (const pluginId of builtinPlugins) {
      try {
        const loaded = await this.config.loader.loadBuiltin(pluginId);
        
        const entry: PluginEntry = {
          info: {
            id: loaded.manifest.id,
            name: loaded.manifest.name,
            version: loaded.manifest.version,
            enabled: false,
            installed: true,
            state: 'inactive',
            updateAvailable: false,
          },
          manifest: loaded.manifest,
          instance: loaded.plugin,
          disposables: [],
        };

        this.plugins.set(loaded.manifest.id, entry);
        
        // 自动启用
        await this.enable(loaded.manifest.id);
        
      } catch (error) {
        console.error(`Failed to load builtin plugin ${pluginId}:`, error);
      }
    }
  }

  /**
   * 检查插件依赖
   */
  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies?.otherPlugins) {
      return;
    }

    for (const depId of manifest.dependencies.otherPlugins) {
      const dep = this.plugins.get(depId);
      if (!dep || !dep.info.enabled) {
        throw new Error(`Plugin ${manifest.id} requires plugin ${depId} which is not enabled`);
      }
    }
  }

  /**
   * 创建插件上下文
   */
  private createPluginContext(manifest: PluginManifest): PluginContext {
    const disposables: Disposable[] = [];
    const pluginId = manifest.id;

    return {
      manifest,
      subscriptions: disposables,
      
      registerCommand: (command: CommandDefinition) => {
        this.commands.set(command.id, { command, pluginId });
        
        this.emitChange({
          type: 'activated',
          pluginId,
        });
      },
      
      registerPanel: (panel: PanelDefinition) => {
        this.panels.set(panel.id, { panel, pluginId });
      },
      
      registerWidget: (widget: WidgetDefinition) => {
        this.widgets.set(widget.id, { widget, pluginId });
      },
      
      registerTheme: (theme: ThemeDefinition) => {
        this.themes.set(theme.id, { theme, pluginId });
      },
      
      registerCanvasRenderer: (renderer: CanvasRendererDefinition) => {
        this.canvasRenderers.set(renderer.id, { renderer, pluginId });
      },
      
      registerService: (service: ServiceDefinition) => {
        this.services.set(service.id, { service, pluginId });
      },
      
      showMessage: (message: string, _type?: MessageType) => {
        console.log(`[Plugin ${pluginId}] [${_type || 'info'}] ${message}`);
      },
      
      showNotification: (title: string, message: string, _type?: MessageType) => {
        console.log(`[Notification] ${title}: ${message}`);
        // TODO: 集成到 UI 通知系统
      },
      
      workspace: this.workspaceAPI,
      gateway: this.gatewayAPI,
      
      getStoragePath: () => {
        return `${this.config.pluginsDir}/${pluginId}/data`;
      },
      
      getConfig: <T = unknown>(): T | undefined => {
        // TODO: 从配置文件读取
        return undefined;
      },
      
      setConfig: async <T = unknown>(config: T): Promise<void> => {
        // TODO: 保存到配置文件
        console.log(`Saving config for plugin ${pluginId}:`, config);
      },
    };
  }

  /**
   * 清理插件资源
   */
  private cleanupPlugin(entry: PluginEntry): void {
    // 清理订阅
    entry.disposables.forEach(d => d.dispose());
    entry.disposables = [];

    // 清理注册的命令
    for (const [id, cmd] of this.commands.entries()) {
      if (cmd.pluginId === entry.info.id) {
        this.commands.delete(id);
      }
    }

    // 清理注册的面板
    for (const [id, panel] of this.panels.entries()) {
      if (panel.pluginId === entry.info.id) {
        this.panels.delete(id);
      }
    }

    // 清理注册的小部件
    for (const [id, widget] of this.widgets.entries()) {
      if (widget.pluginId === entry.info.id) {
        this.widgets.delete(id);
      }
    }

    // 清理注册的主题
    for (const [id, theme] of this.themes.entries()) {
      if (theme.pluginId === entry.info.id) {
        this.themes.delete(id);
      }
    }

    // 清理注册的渲染器
    for (const [id, renderer] of this.canvasRenderers.entries()) {
      if (renderer.pluginId === entry.info.id) {
        this.canvasRenderers.delete(id);
      }
    }

    // 清理注册的服务
    for (const [id, service] of this.services.entries()) {
      if (service.pluginId === entry.info.id) {
        this.services.delete(id);
      }
    }

    // 清理上下文
    entry.context = undefined;
  }

  /**
   * 触发变更事件
   */
  private emitChange(event: PluginChangeEvent): void {
    this.changeListeners.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in plugin change handler:', error);
      }
    });
  }
}

/**
 * 创建默认的插件管理器
 */
export function createPluginManager(
  loader: IPluginLoader,
  pluginsDir: string = '~/.clawstation/plugins'
): PluginManager {
  return new PluginManager({
    pluginsDir,
    enableSandbox: true,
    autoActivateBuiltins: true,
    loader,
  });
}
