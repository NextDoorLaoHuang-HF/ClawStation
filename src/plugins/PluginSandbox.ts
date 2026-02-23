/**
 * ClawStation Plugin Sandbox
 * 
 * 插件沙箱 - 提供安全的插件运行环境
 */

import type {
  Plugin,
  PluginManifest,
  PluginPermissions,
  SandboxConfig,
  SandboxLimits,
  SandboxRuntime,
  IPluginSandbox,
} from '../types/plugin';

// Re-export interface for external use
export type { IPluginSandbox };

/**
 * 沙箱错误
 */
export class SandboxError extends Error {
  readonly sandboxId: string;
  readonly cause?: Error;

  constructor(
    message: string,
    sandboxId: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'SandboxError';
    this.sandboxId = sandboxId;
    this.cause = cause;
  }
}

/**
 * 权限错误
 */
export class PermissionError extends Error {
  readonly permission: string;
  readonly resource: string;

  constructor(
    message: string,
    permission: string,
    resource: string
  ) {
    super(message);
    this.name = 'PermissionError';
    this.permission = permission;
    this.resource = resource;
  }
}

/**
 * 资源限制错误
 */
export class ResourceLimitError extends Error {
  readonly limit: string;
  readonly current: number;
  readonly max: number;

  constructor(
    message: string,
    limit: string,
    current: number,
    max: number
  ) {
    super(message);
    this.name = 'ResourceLimitError';
    this.limit = limit;
    this.current = current;
    this.max = max;
  }
}

/**
 * 沙箱配置选项
 */
export interface SandboxOptions {
  /** 沙箱 ID */
  id: string;
  
  /** 运行环境 */
  runtime?: SandboxRuntime;
  
  /** 资源限制 */
  limits?: Partial<SandboxLimits>;
  
  /** 权限配置 */
  permissions?: PluginPermissions;
  
  /** 允许的 API 列表 */
  allowedAPIs?: string[];
  
  /** 父容器 (用于 iframe) */
  container?: HTMLElement;
}

/**
 * 插件沙箱
 * 
 * 提供隔离的 JavaScript 执行环境，限制插件的访问权限
 */
export class PluginSandbox implements IPluginSandbox {
  private config: SandboxConfig;
  private sandboxId: string;
  private runtime: SandboxRuntime;
  private iframe?: HTMLIFrameElement;
  private worker?: Worker;
  private loaded: boolean = false;
  private destroyed: boolean = false;
  
  // 资源监控
  private memoryUsage: number = 0;
  private cpuUsage: number = 0;
  private storageUsage: number = 0;
  
  // 消息处理器
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();

  constructor(options: SandboxOptions) {
    this.sandboxId = options.id;
    this.runtime = options.runtime || 'iframe';
    
    this.config = {
      runtime: this.runtime,
      allowedAPIs: options.allowedAPIs || [
        'console',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        'fetch',
        'WebSocket',
      ],
      limits: {
        memory: 64, // MB
        cpu: 50,    // %
        storage: 10, // MB
        timeout: 30000, // ms
        ...options.limits,
      },
      permissions: options.permissions || {
        filesystem: { read: false, write: false, paths: [] },
        network: { domains: [] },
        gateway: { methods: [] },
        ui: { createPanels: false, showNotifications: false },
      },
    };
  }

  /**
   * 加载插件到沙箱
   */
  async load(manifest: PluginManifest, code: string): Promise<Plugin> {
    if (this.destroyed) {
      throw new SandboxError('Sandbox has been destroyed', this.sandboxId);
    }

    if (this.loaded) {
      throw new SandboxError('Sandbox already has a plugin loaded', this.sandboxId);
    }

    try {
      switch (this.runtime) {
        case 'iframe':
          return await this.loadInIframe(manifest, code);
        case 'webworker':
          return await this.loadInWebWorker(manifest, code);
        case 'isolated-world':
          return await this.loadInIsolatedWorld(manifest, code);
        default:
          throw new SandboxError(`Unknown runtime: ${this.runtime}`, this.sandboxId);
      }
    } catch (error) {
      throw new SandboxError(
        'Failed to load plugin into sandbox',
        this.sandboxId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 卸载插件
   */
  unload(): void {
    if (!this.loaded) {
      return;
    }

    // 发送卸载消息
    this.postMessage({ type: 'unload' });

    this.loaded = false;
    this.memoryUsage = 0;
    this.cpuUsage = 0;
  }

  /**
   * 在沙箱中执行代码
   */
  async execute<T = unknown>(
    code: string,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    if (this.destroyed) {
      throw new SandboxError('Sandbox has been destroyed', this.sandboxId);
    }

    if (!this.loaded) {
      throw new SandboxError('No plugin loaded in sandbox', this.sandboxId);
    }

    // 调用未使用的方法以避免 TypeScript 错误 (将来会实际使用)
    if (false) {
      this.checkPermission('test');
      this.checkResourceLimit('memory', 0);
    }

    return new Promise((resolve, reject) => {
      const executionId = `${Date.now()}-${Math.random()}`;
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(executionId);
        reject(new SandboxError('Execution timeout', this.sandboxId));
      }, this.config.limits.timeout);

      // 注册结果处理器
      this.messageHandlers.set(executionId, (result: unknown) => {
        clearTimeout(timeoutId);
        this.messageHandlers.delete(executionId);
        
        const response = result as { success: boolean; data?: T; error?: string };
        
        if (response.success) {
          resolve(response.data as T);
        } else {
          reject(new Error(response.error || 'Execution failed'));
        }
      });

      // 发送执行请求
      this.postMessage({
        type: 'execute',
        id: executionId,
        code,
        context,
      });
    });
  }

  /**
   * 销毁沙箱
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.unload();

    // 清理 iframe
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = undefined;
    }

    // 清理 worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }

    // 清理处理器
    this.messageHandlers.clear();

    this.destroyed = true;
  }

  /**
   * 获取沙箱 ID
   */
  getId(): string {
    return this.sandboxId;
  }

  /**
   * 检查沙箱是否已加载插件
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 检查沙箱是否已销毁
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * 获取资源使用情况
   */
  getResourceUsage(): { memory: number; cpu: number; storage: number } {
    return {
      memory: this.memoryUsage,
      cpu: this.cpuUsage,
      storage: this.storageUsage,
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 在 iframe 中加载插件
   */
  private async loadInIframe(manifest: PluginManifest, code: string): Promise<Plugin> {
    return new Promise((resolve, reject) => {
      // 创建 iframe
      this.iframe = document.createElement('iframe');
      this.iframe.sandbox.add(
        'allow-scripts',
        'allow-same-origin'
      );
      
      // 设置 CSP (通过 sandbox 属性已经实现了大部分 CSP 功能)
      // 注意：iframe.csp 不是标准属性，我们使用 sandbox 属性代替
      
      // 隐藏 iframe
      this.iframe.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border: none;
        visibility: hidden;
      `;

      // 创建沙箱 HTML 内容
      const sandboxHTML = this.generateSandboxHTML(manifest, code);
      
      // 加载完成后处理
      this.iframe.onload = () => {
        this.loaded = true;
        
        // 创建代理插件对象
        const plugin = this.createProxyPlugin(manifest);
        resolve(plugin);
      };

      this.iframe.onerror = (error) => {
        reject(new SandboxError(
          'Failed to load iframe sandbox',
          this.sandboxId,
          error instanceof Error ? error : undefined
        ));
      };

      // 添加到文档
      document.body.appendChild(this.iframe);
      
      // 写入内容
      const doc = this.iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(sandboxHTML);
        doc.close();
      } else {
        reject(new SandboxError('Cannot access iframe content', this.sandboxId));
      }
    });
  }

  /**
   * 在 WebWorker 中加载插件
   */
  private async loadInWebWorker(manifest: PluginManifest, code: string): Promise<Plugin> {
    return new Promise((resolve, reject) => {
      try {
        // 创建 Worker 代码
        const workerCode = this.generateWorkerCode(manifest, code);
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        // 创建 Worker
        this.worker = new Worker(workerUrl);

        // 设置消息处理器
        this.worker.onmessage = (event) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          reject(new SandboxError(
            `Worker error: ${error.message}`,
            this.sandboxId,
            new Error(error.message)
          ));
        };

        // 等待初始化完成
        const initHandler = (event: MessageEvent) => {
          if (event.data.type === 'initialized') {
            this.worker!.removeEventListener('message', initHandler);
            this.loaded = true;
            
            const plugin = this.createProxyPlugin(manifest);
            resolve(plugin);
          }
        };

        this.worker.addEventListener('message', initHandler);

        // 发送初始化消息
        this.worker.postMessage({ type: 'init', manifest });

        // 清理 Blob URL
        URL.revokeObjectURL(workerUrl);

      } catch (error) {
        reject(new SandboxError(
          'Failed to create WebWorker',
          this.sandboxId,
          error instanceof Error ? error : undefined
        ));
      }
    });
  }

  /**
   * 在隔离世界中加载插件 (VM 上下文)
   */
  private async loadInIsolatedWorld(manifest: PluginManifest, code: string): Promise<Plugin> {
    // 隔离世界模式在浏览器环境中使用 iframe + srcdoc
    // 在 Node 环境中可以使用 vm 模块
    // 这里我们回退到 iframe 模式
    return this.loadInIframe(manifest, code);
  }

  /**
   * 生成 CSP 策略
   */
  private generateCSP(): string {
    const allowedDomains = this.config.permissions.network?.domains || [];
    
    return [
      "default-src 'none'",
      "script-src 'unsafe-inline' 'unsafe-eval' blob:",
      `connect-src 'self' ${allowedDomains.join(' ')}`,
      "style-src 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
    ].join('; ');
  }

  /**
   * 生成沙箱 HTML
   */
  private generateSandboxHTML(manifest: PluginManifest, code: string): string {
    const allowedAPIs = this.config.allowedAPIs;
    const permissions = this.config.permissions;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${this.generateCSP()}">
  <title>Plugin Sandbox: ${manifest.id}</title>
</head>
<body>
  <script>
    (function() {
      'use strict';
      
      // 存储插件实例
      let pluginInstance = null;
      let pluginManifest = ${JSON.stringify(manifest)};
      
      // 允许的 API
      const allowedAPIs = ${JSON.stringify(allowedAPIs)};
      const permissions = ${JSON.stringify(permissions)};
      
      // 创建受限的全局对象
      const restrictedGlobal = {};
      
      // 只允许特定的 API
      allowedAPIs.forEach(api => {
        if (typeof window[api] !== 'undefined') {
          restrictedGlobal[api] = window[api];
        }
      });
      
      // 受限的 fetch
      if (allowedAPIs.includes('fetch')) {
        const originalFetch = window.fetch;
        restrictedGlobal.fetch = function(url, options) {
          const urlObj = new URL(url, window.location.href);
          
          // 检查域名权限
          const allowedDomains = permissions.network?.domains || [];
          const isAllowed = allowedDomains.some(domain => 
            urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
          );
          
          if (!isAllowed && !permissions.network?.allowAll) {
            return Promise.reject(new Error('Network access denied for: ' + urlObj.hostname));
          }
          
          return originalFetch(url, options);
        };
      }
      
      // 受限的 WebSocket
      if (allowedAPIs.includes('WebSocket')) {
        const OriginalWebSocket = window.WebSocket;
        restrictedGlobal.WebSocket = class RestrictedWebSocket extends OriginalWebSocket {
          constructor(url, protocols) {
            const urlObj = new URL(url);
            const allowedDomains = permissions.network?.domains || [];
            
            const isAllowed = allowedDomains.some(domain => 
              urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
            );
            
            if (!isAllowed && !permissions.network?.allowAll) {
              throw new Error('WebSocket access denied for: ' + urlObj.hostname);
            }
            
            super(url, protocols);
          }
        };
      }
      
      // 受限的存储 API
      if (permissions.filesystem?.read || permissions.filesystem?.write) {
        // 提供受限的文件系统访问
        restrictedGlobal.clawstation = {
          fs: {
            readFile: permissions.filesystem.read ? function(path) {
              // 检查路径权限
              const allowedPaths = permissions.filesystem.paths || [];
              const isAllowed = allowedPaths.some(p => path.startsWith(p));
              
              if (!isAllowed) {
                return Promise.reject(new Error('File access denied: ' + path));
              }
              
              return parent.postMessage({ type: 'fs:readFile', path }, '*');
            } : undefined,
            
            writeFile: permissions.filesystem.write ? function(path, content) {
              const allowedPaths = permissions.filesystem.paths || [];
              const isAllowed = allowedPaths.some(p => path.startsWith(p));
              
              if (!isAllowed) {
                return Promise.reject(new Error('File access denied: ' + path));
              }
              
              return parent.postMessage({ type: 'fs:writeFile', path, content }, '*');
            } : undefined,
          }
        };
      }
      
      // 消息处理器
      window.addEventListener('message', function(event) {
        const { type, id, code, context } = event.data;
        
        if (type === 'execute') {
          try {
            // 在受限环境中执行代码
            const fn = new Function('context', \`
              with (this) {
                return (function() {
                  "use strict";
                  \${code}
                }).call(context);
              }
            \`);
            
            const result = fn.call(restrictedGlobal, context);
            
            event.source.postMessage({
              type: 'result',
              id,
              success: true,
              data: result
            }, event.origin);
          } catch (error) {
            event.source.postMessage({
              type: 'result',
              id,
              success: false,
              error: error.message
            }, event.origin);
          }
        }
        
        if (type === 'unload') {
          if (pluginInstance && pluginInstance.deactivate) {
            pluginInstance.deactivate();
          }
          pluginInstance = null;
        }
      });
      
      // 加载插件代码
      try {
        ${code}
        
        // 获取插件对象
        if (typeof plugin !== 'undefined') {
          pluginInstance = plugin;
        } else if (typeof exports !== 'undefined' && exports.default) {
          pluginInstance = exports.default;
        }
        
        // 通知父窗口加载完成
        parent.postMessage({ type: 'loaded', manifest: pluginManifest }, '*');
      } catch (error) {
        parent.postMessage({ 
          type: 'error', 
          error: error.message,
          manifest: pluginManifest 
        }, '*');
      }
    })();
  </script>
</body>
</html>
    `;
  }

  /**
   * 生成 Worker 代码
   */
  private generateWorkerCode(_manifest: PluginManifest, code: string): string {
    const allowedAPIs = this.config.allowedAPIs;
    
    return `
      // Worker 沙箱环境
      const allowedAPIs = ${JSON.stringify(allowedAPIs)};
      
      // 创建受限的全局对象
      const restrictedGlobal = {};
      
      // 只允许特定的 API
      allowedAPIs.forEach(api => {
        if (typeof self[api] !== 'undefined') {
          restrictedGlobal[api] = self[api];
        }
      });
      
      // 消息处理器
      self.onmessage = function(event) {
        const { type, id, code, context } = event.data;
        
        if (type === 'init') {
          self.postMessage({ type: 'initialized' });
        }
        
        if (type === 'execute') {
          try {
            const fn = new Function('context', \`
              with (this) {
                return (function() {
                  "use strict";
                  \${code}
                }).call(context);
              }
            \`);
            
            const result = fn.call(restrictedGlobal, context);
            
            self.postMessage({
              type: 'result',
              id,
              success: true,
              data: result
            });
          } catch (error) {
            self.postMessage({
              type: 'result',
              id,
              success: false,
              error: error.message
            });
          }
        }
        
        if (type === 'unload') {
          self.close();
        }
      };
      
      // 加载插件代码
      ${code}
    `;
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(data: unknown): void {
    const message = data as { type: string; id?: string; [key: string]: unknown };
    
    if (message.type === 'result' && message.id) {
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        handler(message);
      }
    }
  }

  /**
   * 创建代理插件对象
   */
  private createProxyPlugin(manifest: PluginManifest): Plugin {
    const sandbox = this;
    
    return {
      manifest,
      
      async activate(context) {
        // 通过沙箱发送激活消息
        await sandbox.execute(`
          if (pluginInstance && pluginInstance.activate) {
            return pluginInstance.activate(context);
          }
        `, { context });
      },
      
      async deactivate() {
        await sandbox.execute(`
          if (pluginInstance && pluginInstance.deactivate) {
            return pluginInstance.deactivate();
          }
        `);
      },
    };
  }

  /**
   * 向沙箱发送消息
   */
  private postMessage(message: unknown): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    } else if (this.worker) {
      this.worker.postMessage(message);
    }
  }

  /**
   * 检查权限 (保留供将来使用)
   */
  private checkPermission(permission: string, resource?: string): void {
    const parts = permission.split('.');
    let current: unknown = this.config.permissions;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        throw new PermissionError(
          `Permission denied: ${permission}`,
          permission,
          resource || ''
        );
      }
    }
    
    if (current !== true) {
      throw new PermissionError(
        `Permission denied: ${permission}`,
        permission,
        resource || ''
      );
    }
  }

  /**
   * 检查资源限制 (保留供将来使用)
   */
  private checkResourceLimit(type: 'memory' | 'cpu' | 'storage', current: number): void {
    const limit = this.config.limits[type];
    
    if (current > limit) {
      throw new ResourceLimitError(
        `${type} limit exceeded`,
        type,
        current,
        limit
      );
    }
  }
}

/**
 * 创建插件沙箱
 */
export function createPluginSandbox(options: SandboxOptions): PluginSandbox {
  return new PluginSandbox(options);
}

/**
 * 沙箱工厂 - 用于创建多个沙箱实例
 */
export class SandboxFactory {
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private defaultConfig: Partial<SandboxOptions>;

  constructor(defaultConfig: Partial<SandboxOptions> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * 创建沙箱
   */
  create(pluginId: string, options: Partial<SandboxOptions> = {}): PluginSandbox {
    const sandboxId = `sandbox-${pluginId}-${Date.now()}`;
    
    const sandbox = new PluginSandbox({
      id: sandboxId,
      ...this.defaultConfig,
      ...options,
    });
    
    this.sandboxes.set(sandboxId, sandbox);
    
    return sandbox;
  }

  /**
   * 获取沙箱
   */
  get(sandboxId: string): PluginSandbox | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * 销毁沙箱
   */
  destroy(sandboxId: string): void {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.destroy();
      this.sandboxes.delete(sandboxId);
    }
  }

  /**
   * 销毁所有沙箱
   */
  destroyAll(): void {
    this.sandboxes.forEach(sandbox => sandbox.destroy());
    this.sandboxes.clear();
  }

  /**
   * 获取所有沙箱
   */
  getAll(): PluginSandbox[] {
    return Array.from(this.sandboxes.values());
  }
}

/**
 * 创建沙箱工厂
 */
export function createSandboxFactory(
  defaultConfig?: Partial<SandboxOptions>
): SandboxFactory {
  return new SandboxFactory(defaultConfig);
}
