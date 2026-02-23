// ClawStation Frontend API Client
// Version: 1.0.0
// Generated: 2026-02-23

// 注意：Tauri API 将在后端实现后启用
// import { invoke } from '@tauri-apps/api/core';
// import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type * as types from '../types';

// Mock invoke 函数
const invoke = async <T>(_command: string, _args?: Record<string, unknown>): Promise<T> => {
  throw new Error('Tauri backend not implemented yet');
};

// ============================================
// Gateway API
// ============================================

export const gateway = {
  connect: (config: types.GatewayConfig): Promise<void> => 
    invoke('connect', { config }),
  
  disconnect: (): Promise<void> => 
    invoke('disconnect'),
  
  getStatus: (): Promise<types.GatewayStatus> => 
    invoke('get_status'),
};

// ============================================
// Sessions API
// ============================================

export const sessions = {
  list: (params?: { agentId?: string; activeMinutes?: number; limit?: number }): Promise<types.Session[]> => 
    invoke('list_sessions', params ?? {}),
  
  getHistory: (sessionKey: string, limit?: number, includeTools?: boolean): Promise<types.Message[]> => 
    invoke('get_history', { sessionKey, limit, includeTools }),
  
  send: (sessionKey: string, message: string, attachments?: types.Attachment[]): Promise<void> => 
    invoke('send_message', { sessionKey, message, attachments }),
  
  abort: (sessionKey: string): Promise<{ stopped: number }> => 
    invoke('abort_session', { sessionKey }),
  
  create: (agentId: string, model?: string): Promise<{ sessionKey: string }> => 
    invoke('create_session', { agentId, model }),
  
  spawnSubAgent: (params: {
    task: string;
    agentId: string;
    timeoutSeconds?: number;
    model?: string;
    cleanup?: 'delete' | 'keep';
  }): Promise<{ sessionKey: string; runId: string; status: string }> => 
    invoke('spawn_subagent', params),
};

// ============================================
// Canvas API
// ============================================

export const canvas = {
  present: (sessionId: string, url?: string): Promise<types.CanvasState> => 
    invoke('canvas_present', { sessionId, url }),
  
  navigate: (sessionId: string, url: string): Promise<void> => 
    invoke('canvas_navigate', { sessionId, url }),
  
  eval: (sessionId: string, javascript: string): Promise<unknown> => 
    invoke('canvas_eval', { sessionId, javascript }),
  
  snapshot: (sessionId: string, format?: 'png' | 'jpeg'): Promise<number[]> => 
    invoke('canvas_snapshot', { sessionId, format }),
  
  pushA2UI: (sessionId: string, commands: types.A2UICommand[]): Promise<void> => 
    invoke('a2ui_push', { sessionId, commands }),
};

// ============================================
// Files API
// ============================================

export const files = {
  list: (agentId: string, path?: string): Promise<types.FileInfo[]> => 
    invoke('list_workspace', { agentId, path }),
  
  readText: (agentId: string, path: string, offset?: number, limit?: number): Promise<string> => 
    invoke('read_file', { agentId, path, offset, limit }),
  
  readImage: (agentId: string, path: string): Promise<{ data: number[]; width: number; height: number; mimeType: string }> => 
    invoke('read_image', { agentId, path }),
  
  watch: (agentId: string, path: string): Promise<void> => 
    invoke('watch_directory', { agentId, path }),
  
  unwatch: (agentId: string, path: string): Promise<void> => 
    invoke('unwatch_directory', { agentId, path }),
};

// ============================================
// Agents API
// ============================================

export const agents = {
  list: (): Promise<types.AgentInfo[]> => 
    invoke('list_agents'),
  
  switch: (agentId: string): Promise<{ previousAgentId: string; currentAgentId: string }> => 
    invoke('switch_agent', { agentId }),
  
  getConfig: (agentId: string): Promise<types.AgentConfig> => 
    invoke('get_agent_config', { agentId }),
};

// ============================================
// Settings API
// ============================================

export const settings = {
  get: (): Promise<types.AppSettings> => 
    invoke('get_settings'),
  
  update: (settings: Partial<types.AppSettings>): Promise<void> => 
    invoke('update_settings', { settings }),
};

// ============================================
// System API
// ============================================

export const system = {
  getInfo: (): Promise<types.AppInfo> => 
    invoke('get_app_info'),
  
  openExternal: (url: string): Promise<void> => 
    invoke('open_external', { url }),
  
  checkUpdate: (): Promise<types.UpdateInfo> => 
    invoke('check_update'),
  
  installUpdate: (): Promise<void> => 
    invoke('install_update'),
};

// ============================================
// Event Listeners
// ============================================

export type UnlistenFn = () => void;

export const events = {
  onGateway: (_handler: (event: types.GatewayEvent) => void): Promise<UnlistenFn> => 
    Promise.resolve(() => {}),
  
  onAgent: (_handler: (event: types.AgentEvent) => void): Promise<UnlistenFn> => 
    Promise.resolve(() => {}),
  
  onSubAgent: (_handler: (result: types.SubAgentResult) => void): Promise<UnlistenFn> => 
    Promise.resolve(() => {}),
  
  onFileWatch: (_handler: (event: types.FileWatchEvent) => void): Promise<UnlistenFn> => 
    Promise.resolve(() => {}),
  
  onUpdate: (_handler: (event: types.UpdateEvent) => void): Promise<UnlistenFn> => 
    Promise.resolve(() => {}),
};

// ============================================
// Plugins API
// ============================================

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  loaded: boolean;
  path: string;
}

export interface PluginCommand {
  id: string;
  name: string;
  description: string;
}

export interface PluginContributions {
  commands?: PluginCommand[];
}

export const plugins = {
  list: (): Promise<PluginInfo[]> =>
    invoke('list_plugins'),

  install: (source: string): Promise<void> =>
    invoke('install_plugin', { source }),

  uninstall: (id: string): Promise<void> =>
    invoke('uninstall_plugin', { id }),

  enable: (id: string): Promise<void> =>
    invoke('enable_plugin', { id }),

  disable: (id: string): Promise<void> =>
    invoke('disable_plugin', { id }),

  reload: (id: string): Promise<void> =>
    invoke('reload_plugin', { id }),

  getContributions: (id: string): Promise<PluginContributions> =>
    invoke('get_plugin_contributions', { id }),
};

// ============================================
// Error Handling Helper
// ============================================

export class ApiError extends Error {
  command?: string;
  
  constructor(message: string, command?: string) {
    super(message);
    this.name = 'ApiError';
    this.command = command;
  }
}

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new ApiError(String(error), command);
  }
}
