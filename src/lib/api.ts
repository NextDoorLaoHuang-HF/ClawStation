// ClawStation Frontend API Client
// Version: 1.0.0
// Generated: 2026-02-23

import { invoke } from '@tauri-apps/api/core';
import type * as types from '../types';
import type { GatewayProfile } from '../types/gateway';

// Mock invoke function for development - use real invoke in production
export const tauriInvoke = async <T>(_command: string, _args?: Record<string, unknown>): Promise<T> => {
  // TODO: Enable real Tauri backend
  // return invoke<T>(_command, _args);
  throw new Error('Tauri backend not implemented yet');
};

// ============================================
// Gateway API (Profile Management)
// ============================================

export const gateway = {
  // Profile management
  listProfiles: (): Promise<GatewayProfile[]> =>
    invoke<GatewayProfile[]>('list_gateway_profiles'),
  
  addProfile: (profile: Omit<GatewayProfile, 'id'>): Promise<GatewayProfile> =>
    invoke<GatewayProfile>('add_gateway_profile', { profile: { ...profile, id: '' } }),
  
  updateProfile: (profile: GatewayProfile): Promise<GatewayProfile> =>
    invoke<GatewayProfile>('update_gateway_profile', { profile }),
  
  removeProfile: (id: string): Promise<void> =>
    invoke('remove_gateway_profile', { id }),
  
  setDefault: (id: string): Promise<void> =>
    invoke('set_default_gateway', { id }),
  
  getDefault: (): Promise<GatewayProfile | null> =>
    invoke<GatewayProfile | null>('get_default_gateway_profile'),
  
  // Connection
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
    tauriInvoke('list_sessions', params ?? {}),
  
  getHistory: (sessionKey: string, limit?: number, includeTools?: boolean): Promise<types.Message[]> => 
    tauriInvoke('get_history', { sessionKey, limit, includeTools }),
  
  send: (sessionKey: string, message: string, attachments?: types.Attachment[]): Promise<void> => 
    tauriInvoke('send_message', { sessionKey, message, attachments }),
  
  abort: (sessionKey: string): Promise<{ stopped: number }> => 
    tauriInvoke('abort_session', { sessionKey }),
  
  create: (agentId: string, model?: string): Promise<{ sessionKey: string }> => 
    tauriInvoke('create_session', { agentId, model }),
  
  spawnSubAgent: (params: {
    task: string;
    agentId: string;
    timeoutSeconds?: number;
    model?: string;
    cleanup?: 'delete' | 'keep';
  }): Promise<{ sessionKey: string; runId: string; status: string }> => 
    tauriInvoke('spawn_subagent', params),
};

// ============================================
// Canvas API
// ============================================

export const canvas = {
  present: (sessionId: string, url?: string): Promise<types.CanvasState> => 
    tauriInvoke('canvas_present', { sessionId, url }),
  
  navigate: (sessionId: string, url: string): Promise<void> => 
    tauriInvoke('canvas_navigate', { sessionId, url }),
  
  eval: (sessionId: string, javascript: string): Promise<unknown> => 
    tauriInvoke('canvas_eval', { sessionId, javascript }),
  
  snapshot: (sessionId: string, format?: 'png' | 'jpeg'): Promise<number[]> => 
    tauriInvoke('canvas_snapshot', { sessionId, format }),
  
  pushA2UI: (sessionId: string, commands: types.A2UICommand[]): Promise<void> => 
    tauriInvoke('a2ui_push', { sessionId, commands }),
};

// ============================================
// Files API
// ============================================

export const files = {
  list: (agentId: string, path?: string): Promise<types.FileInfo[]> => 
    tauriInvoke('list_workspace', { agentId, path }),
  
  readText: (agentId: string, path: string, offset?: number, limit?: number): Promise<string> => 
    tauriInvoke('read_file', { agentId, path, offset, limit }),
  
  readImage: (agentId: string, path: string): Promise<{ data: number[]; width: number; height: number; mimeType: string }> => 
    tauriInvoke('read_image', { agentId, path }),
  
  watch: (agentId: string, path: string): Promise<void> => 
    tauriInvoke('watch_directory', { agentId, path }),
  
  unwatch: (agentId: string, path: string): Promise<void> => 
    tauriInvoke('unwatch_directory', { agentId, path }),
};

// ============================================
// Agents API
// ============================================

export const agents = {
  list: (): Promise<types.AgentInfo[]> => 
    tauriInvoke('list_agents'),
  
  switch: (agentId: string): Promise<{ previousAgentId: string; currentAgentId: string }> => 
    tauriInvoke('switch_agent', { agentId }),
  
  getConfig: (agentId: string): Promise<types.AgentConfig> => 
    tauriInvoke('get_agent_config', { agentId }),
};

// ============================================
// Settings API
// ============================================

export const settings = {
  get: (): Promise<types.AppSettings> => 
    tauriInvoke('get_settings'),
  
  update: (settings: Partial<types.AppSettings>): Promise<void> => 
    tauriInvoke('update_settings', { settings }),
};

// ============================================
// System API
// ============================================

export const system = {
  getInfo: (): Promise<types.AppInfo> => 
    tauriInvoke('get_app_info'),
  
  openExternal: (url: string): Promise<void> => 
    tauriInvoke('open_external', { url }),
  
  checkUpdate: (): Promise<types.UpdateInfo> => 
    tauriInvoke('check_update'),
  
  installUpdate: (): Promise<void> => 
    tauriInvoke('install_update'),
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
    tauriInvoke('list_plugins'),

  install: (source: string): Promise<void> =>
    tauriInvoke('install_plugin', { source }),

  uninstall: (id: string): Promise<void> =>
    tauriInvoke('uninstall_plugin', { id }),

  enable: (id: string): Promise<void> =>
    tauriInvoke('enable_plugin', { id }),

  disable: (id: string): Promise<void> =>
    tauriInvoke('disable_plugin', { id }),

  reload: (id: string): Promise<void> =>
    tauriInvoke('reload_plugin', { id }),

  getContributions: (id: string): Promise<PluginContributions> =>
    tauriInvoke('get_plugin_contributions', { id }),
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
    return await tauriInvoke<T>(command, args);
  } catch (error) {
    throw new ApiError(String(error), command);
  }
}
