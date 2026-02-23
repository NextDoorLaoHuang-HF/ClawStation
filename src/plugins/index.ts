/**
 * ClawStation Plugin System
 * 
 * 插件系统入口
 */

// 导出类型
export type {
  // 基础类型
  PluginId,
  PluginVersion,
  PluginType,
  PanelPosition,
  WidgetSize,
  MessageType,
  
  // 清单类型
  PluginManifest,
  PluginContributes,
  PluginDependencies,
  
  // UI 类型
  PanelDefinition,
  WidgetDefinition,
  ThemeDefinition,
  ThemeColors,
  ThemeFonts,
  
  // 命令类型
  CommandDefinition,
  CommandUIConfig,
  CommandContext,
  
  // Canvas 类型
  CanvasRendererDefinition,
  CanvasRenderContext,
  
  // 服务类型
  ServiceDefinition,
  ServiceConnection,
  ServiceCapability,
  JSONSchema,
  
  // 权限类型
  PluginPermissions,
  FileSystemPermissions,
  NetworkPermissions,
  GatewayPermissions,
  UIPermissions,
  
  // 上下文类型
  PluginContext,
  WorkspaceAPI,
  GatewayAPI,
  Disposable,
  
  // 插件接口
  Plugin,
  PluginConstructor,
  
  // 管理器类型
  PluginInfo,
  PluginState,
  IPluginManager,
  PluginChangeEvent,
  
  // 沙箱类型
  SandboxConfig,
  SandboxLimits,
  SandboxRuntime,
  IPluginSandbox,
  
  // 加载器类型
  PluginSource,
  PluginSourceType,
  LoadedPlugin,
  IPluginLoader,
  
  // 内置插件
  BuiltinPluginId,
  
  // 事件类型
  PluginEventMap,
} from '../types/plugin';

// 导出管理器
export {
  PluginManager,
  type PluginManagerConfig,
  createPluginManager,
} from './PluginManager';

// 导出加载器
export {
  PluginLoader,
  type PluginLoaderConfig,
  PluginLoadError,
  ManifestValidationError,
  createPluginLoader,
} from './PluginLoader';

// 导出沙箱
export {
  PluginSandbox,
  type SandboxOptions,
  type SandboxFactory,
  SandboxError,
  PermissionError,
  ResourceLimitError,
  createPluginSandbox,
  createSandboxFactory,
} from './PluginSandbox';

// 导出默认实例创建函数
import { createPluginManager } from './PluginManager';
import { createPluginLoader } from './PluginLoader';
import { createSandboxFactory } from './PluginSandbox';

/**
 * 创建完整的插件系统
 */
export function createPluginSystem(options: {
  pluginsDir?: string;
  enableSandbox?: boolean;
  autoActivateBuiltins?: boolean;
} = {}) {
  const {
    pluginsDir = '~/.clawstation/plugins',
    enableSandbox = true,
    autoActivateBuiltins = true,
  } = options;

  // 标记为已使用
  void autoActivateBuiltins;

  // 创建加载器
  const loader = createPluginLoader({
    userPluginsDir: pluginsDir,
  });

  // 创建沙箱工厂
  const sandboxFactory = enableSandbox ? createSandboxFactory() : undefined;

  // 创建管理器
  const manager = createPluginManager(loader, pluginsDir);

  return {
    manager,
    loader,
    sandboxFactory,
  };
}
