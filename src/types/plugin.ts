/**
 * ClawStation Plugin System - Type Definitions
 * 
 * 插件系统核心类型定义
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 插件唯一标识 */
export type PluginId = string;

/** 插件版本号 */
export type PluginVersion = string;

/** 插件类型 */
export type PluginType = 'ui' | 'command' | 'canvas' | 'integration' | 'theme';

/** 面板位置 */
export type PanelPosition = 'sidebar' | 'main' | 'bottom' | 'floating';

/** 小部件尺寸 */
export type WidgetSize = 'small' | 'medium' | 'large';

/** 消息类型 */
export type MessageType = 'info' | 'warning' | 'error' | 'success';

// ============================================================================
// 插件清单 (Manifest)
// ============================================================================

/**
 * 插件清单 - 描述插件的元数据和扩展点
 */
export interface PluginManifest {
  /** 插件唯一标识 */
  id: PluginId;
  
  /** 插件显示名称 */
  name: string;
  
  /** 插件版本 */
  version: PluginVersion;
  
  /** 插件描述 */
  description?: string;
  
  /** 插件作者 */
  author?: string;
  
  /** 插件图标 */
  icon?: string;
  
  /** 扩展点声明 */
  contributes: PluginContributes;
  
  /** 依赖声明 */
  dependencies?: PluginDependencies;
  
  /** 激活事件 */
  activationEvents?: string[];
  
  /** 权限配置 */
  permissions?: PluginPermissions;
}

/**
 * 插件扩展点声明
 */
export interface PluginContributes {
  /** 面板扩展 */
  panels?: PanelDefinition[];
  
  /** 小部件扩展 */
  widgets?: WidgetDefinition[];
  
  /** 主题扩展 */
  themes?: ThemeDefinition[];
  
  /** 命令扩展 */
  commands?: CommandDefinition[];
  
  /** Canvas 渲染器扩展 */
  canvasRenderers?: CanvasRendererDefinition[];
  
  /** 服务集成扩展 */
  services?: ServiceDefinition[];
}

/**
 * 插件依赖声明
 */
export interface PluginDependencies {
  /** 依赖的其他插件 */
  otherPlugins?: string[];
  
  /** 依赖的 npm 包 */
  nodeModules?: string[];
  
  /** 最低 ClawStation 版本 */
  clawstation?: string;
}

// ============================================================================
// UI 扩展定义
// ============================================================================

/**
 * 面板定义
 */
export interface PanelDefinition {
  /** 面板唯一标识 */
  id: string;
  
  /** 面板标题 */
  title: string;
  
  /** 面板图标 */
  icon: string;
  
  /** 面板位置 */
  position: PanelPosition;
  
  /** 组件路径或 URL */
  component: string;
  
  /** 默认是否打开 */
  defaultOpen?: boolean;
  
  /** 排序权重 */
  order?: number;
}

/**
 * 小部件定义
 */
export interface WidgetDefinition {
  /** 小部件唯一标识 */
  id: string;
  
  /** 小部件名称 */
  name: string;
  
  /** 小部件尺寸 */
  size: WidgetSize;
  
  /** 组件路径或 URL */
  component: string;
  
  /** 默认位置 */
  defaultPosition?: { x: number; y: number };
}

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * 主题字体配置
 */
export interface ThemeFonts {
  sans?: string;
  mono?: string;
  serif?: string;
}

/**
 * 主题定义
 */
export interface ThemeDefinition {
  /** 主题唯一标识 */
  id: string;
  
  /** 主题名称 */
  name: string;
  
  /** 颜色配置 */
  colors: ThemeColors;
  
  /** 字体配置 */
  fonts?: ThemeFonts;
  
  /** 是否为暗色主题 */
  isDark?: boolean;
}

// ============================================================================
// 命令扩展定义
// ============================================================================

/**
 * 命令定义
 */
export interface CommandDefinition {
  /** 命令唯一标识 */
  id: string;
  
  /** 命令显示名称 */
  name: string;
  
  /** 命令描述 */
  description?: string;
  
  /** 命令分类 */
  category?: string;
  
  /** 快捷键绑定 */
  keybinding?: string;
  
  /** 执行处理器 */
  handler: (context: CommandContext) => Promise<void> | void;
  
  /** UI 配置 */
  ui?: CommandUIConfig;
  
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 命令 UI 配置
 */
export interface CommandUIConfig {
  /** 在命令面板中显示 */
  showInPalette: boolean;
  
  /** 在菜单中显示 */
  showInMenu: boolean;
  
  /** 菜单路径 */
  menuPath?: string[];
  
  /** 图标 */
  icon?: string;
}

/**
 * 命令执行上下文
 */
export interface CommandContext {
  /** 当前会话密钥 */
  sessionKey: string;
  
  /** 当前 Agent ID */
  agentId: string;
  
  /** 当前选中的内容 */
  selection?: unknown;
  
  /** 工作区访问 */
  workspace: WorkspaceAPI;
  
  /** Gateway 访问 */
  gateway: GatewayAPI;
  
  /** 显示消息 */
  showMessage: (message: string, type?: MessageType) => void;
}

// ============================================================================
// Canvas 扩展定义
// ============================================================================

/**
 * Canvas 渲染器定义
 */
export interface CanvasRendererDefinition {
  /** 渲染器唯一标识 */
  id: string;
  
  /** 渲染器名称 */
  name: string;
  
  /** 支持的 MIME 类型 */
  mimeType: string;
  
  /** 支持的文件扩展名 */
  fileExtensions?: string[];
  
  /** 渲染函数 */
  render: (data: unknown, container: HTMLElement, context: CanvasRenderContext) => void | Promise<void>;
  
  /** 组件映射 */
  componentMapping?: Record<string, string>;
}

/**
 * Canvas 渲染上下文
 */
export interface CanvasRenderContext {
  /** 主题 */
  theme: ThemeDefinition;
  
  /** 宽度 */
  width: number;
  
  /** 高度 */
  height: number;
  
  /** 缩放级别 */
  scale: number;
}

// ============================================================================
// 服务集成定义
// ============================================================================

/**
 * 服务定义
 */
export interface ServiceDefinition {
  /** 服务唯一标识 */
  id: string;
  
  /** 服务名称 */
  name: string;
  
  /** 服务图标 */
  icon: string;
  
  /** 配置 Schema */
  configSchema: JSONSchema;
  
  /** 连接函数 */
  connect: (config: unknown) => Promise<ServiceConnection>;
  
  /** 提供的能力 */
  capabilities: ServiceCapability[];
}

/**
 * JSON Schema 类型 (简化版)
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  default?: unknown;
}

/**
 * 服务连接
 */
export interface ServiceConnection {
  /** 连接状态 */
  status: 'connected' | 'disconnected' | 'error';
  
  /** 断开连接 */
  disconnect: () => void;
  
  /** 错误信息 */
  error?: string;
}

/**
 * 服务能力
 */
export interface ServiceCapability {
  /** 能力类型 */
  type: 'read' | 'write' | 'subscribe' | 'execute';
  
  /** 能力名称 */
  name: string;
  
  /** 能力描述 */
  description?: string;
  
  /** 处理函数 */
  handler: (params: unknown) => Promise<unknown>;
}

// ============================================================================
// 插件权限
// ============================================================================

/**
 * 插件权限配置
 */
export interface PluginPermissions {
  /** 文件系统访问权限 */
  filesystem?: FileSystemPermissions;
  
  /** 网络访问权限 */
  network?: NetworkPermissions;
  
  /** Gateway 访问权限 */
  gateway?: GatewayPermissions;
  
  /** UI 访问权限 */
  ui?: UIPermissions;
}

/**
 * 文件系统权限
 */
export interface FileSystemPermissions {
  /** 允许读取 */
  read: boolean;
  
  /** 允许写入 */
  write: boolean;
  
  /** 允许的路径模式 */
  paths: string[];
}

/**
 * 网络权限
 */
export interface NetworkPermissions {
  /** 允许的域名 */
  domains: string[];
  
  /** 允许所有域名 */
  allowAll?: boolean;
}

/**
 * Gateway 权限
 */
export interface GatewayPermissions {
  /** 允许调用的方法 */
  methods: string[];
  
  /** 允许所有方法 */
  allowAll?: boolean;
}

/**
 * UI 权限
 */
export interface UIPermissions {
  /** 创建面板 */
  createPanels: boolean;
  
  /** 显示通知 */
  showNotifications: boolean;
  
  /** 修改主题 */
  modifyTheme?: boolean;
}

// ============================================================================
// 插件上下文
// ============================================================================

/**
 * 可释放资源
 */
export interface Disposable {
  dispose(): void;
}

/**
 * 工作区 API
 */
export interface WorkspaceAPI {
  /** 读取文件 */
  readFile: (path: string) => Promise<string>;
  
  /** 写入文件 */
  writeFile: (path: string, content: string) => Promise<void>;
  
  /** 检查文件是否存在 */
  exists: (path: string) => Promise<boolean>;
  
  /** 列出目录 */
  listDirectory: (path: string) => Promise<string[]>;
  
  /** 获取当前工作目录 */
  getCurrentDirectory: () => string;
}

/**
 * Gateway API
 */
export interface GatewayAPI {
  /** 调用 Gateway 方法 */
  invoke: (method: string, params: unknown) => Promise<unknown>;
  
  /** 订阅事件 */
  subscribe: (event: string, handler: (data: unknown) => void) => Disposable;
}

/**
 * 插件上下文 - 插件激活时传入
 */
export interface PluginContext {
  /** 插件清单 */
  manifest: PluginManifest;
  
  /** 订阅列表 (自动清理) */
  subscriptions: Disposable[];
  
  /** 注册命令 */
  registerCommand: (command: CommandDefinition) => void;
  
  /** 注册面板 */
  registerPanel: (panel: PanelDefinition) => void;
  
  /** 注册小部件 */
  registerWidget: (widget: WidgetDefinition) => void;
  
  /** 注册主题 */
  registerTheme: (theme: ThemeDefinition) => void;
  
  /** 注册 Canvas 渲染器 */
  registerCanvasRenderer: (renderer: CanvasRendererDefinition) => void;
  
  /** 注册服务 */
  registerService: (service: ServiceDefinition) => void;
  
  /** 显示消息 */
  showMessage: (message: string, type?: MessageType) => void;
  
  /** 显示通知 */
  showNotification: (title: string, message: string, type?: MessageType) => void;
  
  /** 访问工作区 */
  workspace: WorkspaceAPI;
  
  /** 访问 Gateway */
  gateway: GatewayAPI;
  
  /** 获取插件数据存储路径 */
  getStoragePath: () => string;
  
  /** 获取插件配置 */
  getConfig: <T = unknown>() => T | undefined;
  
  /** 设置插件配置 */
  setConfig: <T = unknown>(config: T) => Promise<void>;
}

// ============================================================================
// 插件接口
// ============================================================================

/**
 * 插件接口 - 所有插件必须实现
 */
export interface Plugin {
  /** 插件清单 */
  manifest: PluginManifest;
  
  /**
   * 激活插件
   * @param context 插件上下文
   */
  activate(context: PluginContext): Promise<void> | void;
  
  /**
   * 停用插件 (可选)
   */
  deactivate?(): Promise<void> | void;
}

/**
 * 插件构造函数
 */
export type PluginConstructor = new () => Plugin;

// ============================================================================
// 插件管理器类型
// ============================================================================

/**
 * 插件状态
 */
export type PluginState = 'inactive' | 'activating' | 'active' | 'deactivating' | 'error';

/**
 * 插件信息
 */
export interface PluginInfo {
  /** 插件 ID */
  id: PluginId;
  
  /** 插件名称 */
  name: string;
  
  /** 插件版本 */
  version: PluginVersion;
  
  /** 是否已启用 */
  enabled: boolean;
  
  /** 是否已安装 */
  installed: boolean;
  
  /** 当前状态 */
  state: PluginState;
  
  /** 是否有可用更新 */
  updateAvailable: boolean;
  
  /** 错误信息 */
  error?: string;
}

/**
 * 插件管理器接口
 */
export interface IPluginManager {
  /** 列出所有插件 */
  list(): PluginInfo[];
  
  /** 获取插件信息 */
  get(pluginId: PluginId): PluginInfo | undefined;
  
  /** 安装插件 */
  install(source: string): Promise<void>;
  
  /** 卸载插件 */
  uninstall(pluginId: PluginId): Promise<void>;
  
  /** 启用插件 */
  enable(pluginId: PluginId): Promise<void>;
  
  /** 禁用插件 */
  disable(pluginId: PluginId): Promise<void>;
  
  /** 更新插件 */
  update(pluginId: PluginId): Promise<void>;
  
  /** 重新加载插件 */
  reload(pluginId: PluginId): Promise<void>;
  
  /** 检查插件是否已激活 */
  isActive(pluginId: PluginId): boolean;
  
  /** 获取已激活的插件实例 */
  getPluginInstance(pluginId: PluginId): Plugin | undefined;
  
  /** 获取所有已注册的命令 */
  getCommands(): CommandDefinition[];
  
  /** 获取所有已注册的面板 */
  getPanels(): PanelDefinition[];
  
  /** 获取所有已注册的主题 */
  getThemes(): ThemeDefinition[];
  
  /** 执行命令 */
  executeCommand(commandId: string, context: Partial<CommandContext>): Promise<void>;
  
  /** 订阅插件变更事件 */
  onChange(handler: (event: PluginChangeEvent) => void): Disposable;
}

/**
 * 插件变更事件
 */
export interface PluginChangeEvent {
  type: 'installed' | 'uninstalled' | 'enabled' | 'disabled' | 'activated' | 'deactivated' | 'updated' | 'error';
  pluginId: PluginId;
  plugin?: PluginInfo;
  error?: string;
}

// ============================================================================
// 沙箱类型
// ============================================================================

/**
 * 沙箱运行环境
 */
export type SandboxRuntime = 'iframe' | 'webworker' | 'isolated-world';

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  /** 运行环境 */
  runtime: SandboxRuntime;
  
  /** 允许的 API */
  allowedAPIs: string[];
  
  /** 资源限制 */
  limits: SandboxLimits;
  
  /** 权限配置 */
  permissions: PluginPermissions;
}

/**
 * 沙箱资源限制
 */
export interface SandboxLimits {
  /** 内存限制 (MB) */
  memory: number;
  
  /** CPU 限制 (百分比) */
  cpu: number;
  
  /** 存储限制 (MB) */
  storage: number;
  
  /** 执行超时 (ms) */
  timeout?: number;
}

/**
 * 沙箱接口
 */
export interface IPluginSandbox {
  /** 加载插件 */
  load(manifest: PluginManifest, code: string): Promise<Plugin>;
  
  /** 卸载插件 */
  unload(): void;
  
  /** 执行代码 */
  execute<T = unknown>(code: string, context?: Record<string, unknown>): Promise<T>;
  
  /** 销毁沙箱 */
  destroy(): void;
}

// ============================================================================
// 加载器类型
// ============================================================================

/**
 * 插件源类型
 */
export type PluginSourceType = 'local' | 'url' | 'npm' | 'builtin';

/**
 * 插件源
 */
export interface PluginSource {
  type: PluginSourceType;
  location: string;
  version?: string;
}

/**
 * 加载的插件
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  plugin: Plugin;
  source: PluginSource;
}

/**
 * 插件加载器接口
 */
export interface IPluginLoader {
  /** 从本地路径加载 */
  loadFromLocal(path: string): Promise<LoadedPlugin>;
  
  /** 从 URL 加载 */
  loadFromURL(url: string): Promise<LoadedPlugin>;
  
  /** 从 npm 包加载 */
  loadFromNPM(packageName: string, version?: string): Promise<LoadedPlugin>;
  
  /** 加载内置插件 */
  loadBuiltin(pluginId: string): Promise<LoadedPlugin>;
  
  /** 验证插件清单 */
  validateManifest(manifest: unknown): PluginManifest;
}

// ============================================================================
// 内置插件类型
// ============================================================================

/**
 * 内置插件标识
 */
export type BuiltinPluginId = 
  | 'chat'
  | 'canvas'
  | 'file-browser'
  | 'agent-manager'
  | 'session-manager'
  | 'theme-default';

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 插件事件
 */
export interface PluginEventMap {
  'plugin:installed': { pluginId: PluginId };
  'plugin:uninstalled': { pluginId: PluginId };
  'plugin:enabled': { pluginId: PluginId };
  'plugin:disabled': { pluginId: PluginId };
  'plugin:activated': { pluginId: PluginId; plugin: Plugin };
  'plugin:deactivated': { pluginId: PluginId };
  'plugin:error': { pluginId: PluginId; error: Error };
  'plugin:updated': { pluginId: PluginId; oldVersion: string; newVersion: string };
  'command:registered': { commandId: string; pluginId: PluginId };
  'panel:registered': { panelId: string; pluginId: PluginId };
  'theme:changed': { themeId: string };
}
