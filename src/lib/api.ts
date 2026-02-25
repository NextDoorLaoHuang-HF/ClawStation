// ClawStation Frontend API Client
// Version: 1.0.0
// Generated: 2026-02-23

import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type * as types from '../types';
import type { GatewayEvent, GatewayProfile } from '../types/gateway';

export const isTauriRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Prefer the official check, but keep a fallback that works with @tauri-apps/api/mocks.
  try {
    if (isTauri()) return true;
  } catch {
    // ignore
  }
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
};

export const tauriInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauriRuntime()) {
    throw new Error(`Not running in Tauri runtime (invoke: ${command})`);
  }
  return invoke<T>(command, args);
};

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// ============================================
// Gateway API (Profile Management)
// ============================================

type RustGatewayProfile = {
  id: string;
  name: string;
  url: string;
  token: string | null;
  canvas_port: number;
  is_default: boolean;
};

type RustGatewayStatus = {
  connected: boolean;
  url?: string | null;
  agent_id?: string | null;
  protocol?: number | null;
  last_ping?: number | null;
};

type RustGatewayConfig = {
  url: string;
  token: string;
  agent_id: string;
  canvas_port: number;
};

function toGatewayProfile(p: RustGatewayProfile): GatewayProfile {
  return {
    id: p.id,
    name: p.name,
    url: p.url,
    token: p.token ?? undefined,
    canvasPort: p.canvas_port,
    isDefault: p.is_default,
  };
}

function fromGatewayProfile(p: GatewayProfile): RustGatewayProfile {
  return {
    id: p.id,
    name: p.name,
    url: p.url,
    token: p.token ?? null,
    canvas_port: p.canvasPort,
    is_default: p.isDefault,
  };
}

function toRustGatewayConfig(c: types.GatewayConfig): RustGatewayConfig {
  return {
    url: c.url,
    token: c.token,
    agent_id: c.agentId ?? 'main',
    canvas_port: c.canvasPort ?? 18793,
  };
}

function toGatewayStatus(s: RustGatewayStatus): types.GatewayStatus {
  return {
    connected: s.connected,
    url: s.url ?? undefined,
    agentId: s.agent_id ?? undefined,
    protocol: s.protocol ?? undefined,
    lastPing: s.last_ping ?? undefined,
  };
}

export const gateway = {
  // Profile management
  listProfiles: async (): Promise<GatewayProfile[]> => {
    const raw = await tauriInvoke<RustGatewayProfile[]>('list_gateway_profiles');
    return raw.map(toGatewayProfile);
  },

  addProfile: async (profile: Omit<GatewayProfile, 'id'>): Promise<GatewayProfile> => {
    const raw = await tauriInvoke<RustGatewayProfile>('add_gateway_profile', {
      profile: fromGatewayProfile({ ...profile, id: '' }),
    });
    return toGatewayProfile(raw);
  },

  updateProfile: async (profile: GatewayProfile): Promise<GatewayProfile> => {
    const raw = await tauriInvoke<RustGatewayProfile>('update_gateway_profile', {
      profile: fromGatewayProfile(profile),
    });
    return toGatewayProfile(raw);
  },

  removeProfile: (id: string): Promise<void> =>
    tauriInvoke('remove_gateway_profile', { id }),

  setDefault: (id: string): Promise<void> =>
    tauriInvoke('set_default_gateway', { id }),

  getDefault: async (): Promise<GatewayProfile | null> => {
    const raw = await tauriInvoke<RustGatewayProfile | null>('get_default_gateway_profile');
    return raw ? toGatewayProfile(raw) : null;
  },
  
  // Connection
  connect: (config: types.GatewayConfig): Promise<void> => 
    tauriInvoke('connect', { config: toRustGatewayConfig(config) }),
  
  disconnect: (): Promise<void> => 
    tauriInvoke('disconnect'),
  
  getStatus: async (): Promise<types.GatewayStatus> => {
    const raw = await tauriInvoke<RustGatewayStatus>('get_status');
    return toGatewayStatus(raw);
  },
};

// ============================================
// Sessions API
// ============================================

type RustSession = {
  key: string;
  agent_id: string;
  display_name: string;
  model: string;
  total_tokens: number;
  context_tokens: number;
  updated_at: number;
  kind: types.Session['kind'];
  channel?: string | null;
};

type RustContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string }
  | { type: 'toolcall'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'toolresult'; tool_call_id: string; tool_name: string; content: RustContentPart[] };

type RustMessage = {
  role: 'user' | 'assistant' | 'system' | 'toolresult';
  content: RustContentPart[];
  timestamp: number;
};

function toSession(s: RustSession): types.Session {
  return {
    key: s.key,
    agentId: s.agent_id,
    displayName: s.display_name,
    model: s.model,
    totalTokens: s.total_tokens,
    contextTokens: s.context_tokens,
    updatedAt: s.updated_at,
    kind: s.kind ?? 'other',
    channel: s.channel ?? undefined,
  };
}

function toContentPart(p: RustContentPart): types.ContentPart {
  switch (p.type) {
    case 'text':
      return { type: 'text', text: p.text };
    case 'image':
      return { type: 'image', image: p.image };
    case 'toolcall':
      return { type: 'toolCall', id: p.id, name: p.name, arguments: p.arguments };
    case 'toolresult':
      return {
        type: 'toolResult',
        toolCallId: p.tool_call_id,
        toolName: p.tool_name,
        content: p.content.map(toContentPart),
      };
  }
}

function toMessage(m: RustMessage): types.Message {
  return {
    role: m.role === 'toolresult' ? 'toolResult' : m.role,
    content: m.content.map(toContentPart),
    timestamp: m.timestamp,
  };
}

export const sessions = {
  list: async (params?: { agentId?: string; activeMinutes?: number; limit?: number }): Promise<types.Session[]> => {
    const args = params
      ? {
          params: {
            agent_id: params.agentId,
            active_minutes: params.activeMinutes,
            limit: params.limit,
          },
        }
      : undefined;

    const raw = await tauriInvoke<RustSession[]>('list_sessions', args);
    return raw.map(toSession);
  },

  getHistory: async (sessionKey: string, limit?: number, includeTools?: boolean): Promise<types.Message[]> => {
    const raw = await tauriInvoke<RustMessage[]>('get_history', {
      params: {
        session_key: sessionKey,
        limit,
        include_tools: includeTools ?? false,
      },
    });
    return raw.map(toMessage);
  },

  send: (sessionKey: string, message: string, attachments?: types.Attachment[]): Promise<void> =>
    tauriInvoke('send_message', {
      params: {
        session_key: sessionKey,
        message,
        attachments: attachments ?? [],
      },
    }),

  abort: (sessionKey: string): Promise<{ stopped: number }> =>
    tauriInvoke('abort_session', { params: { session_key: sessionKey } }),

  create: (agentId: string, model?: string): Promise<{ sessionKey: string }> =>
    tauriInvoke('create_session', {
      params: {
        agent_id: agentId,
        model,
      },
    }),
  
  spawnSubAgent: (params: {
    task: string;
    agentId: string;
    timeoutSeconds?: number;
    model?: string;
    cleanup?: 'delete' | 'keep';
  }): Promise<{ sessionKey: string; runId: string; status: string }> => 
    tauriInvoke('spawn_subagent', {
      params: {
        task: params.task,
        agent_id: params.agentId,
        timeout_seconds: params.timeoutSeconds,
        model: params.model,
        cleanup: params.cleanup,
      },
    }),
};

// ============================================
// Canvas API
// ============================================

type RustBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RustCanvasState = {
  session_id: string;
  visible: boolean;
  url?: string | null;
  bounds?: RustBounds | null;
};

function toCanvasState(s: RustCanvasState): types.CanvasState {
  return {
    sessionId: s.session_id,
    visible: s.visible,
    url: s.url ?? undefined,
    bounds: s.bounds ?? undefined,
  };
}

export const canvas = {
  present: async (sessionId: string, url?: string): Promise<types.CanvasState> => {
    const raw = await tauriInvoke<RustCanvasState>('canvas_present', {
      params: stripUndefined({ session_id: sessionId, url }),
    });
    return toCanvasState(raw);
  },
  
  navigate: (sessionId: string, url: string): Promise<void> => 
    tauriInvoke('canvas_navigate', { params: { session_id: sessionId, url } }),
  
  eval: (sessionId: string, javascript: string): Promise<unknown> => 
    tauriInvoke('canvas_eval', { params: { session_id: sessionId, javascript } }),
  
  snapshot: (sessionId: string, format?: 'png' | 'jpeg'): Promise<number[]> => 
    tauriInvoke('canvas_snapshot', { params: stripUndefined({ session_id: sessionId, format }) }),
  
  pushA2UI: (sessionId: string, commands: types.A2UICommand[]): Promise<void> => 
    tauriInvoke('a2ui_push', { params: { session_id: sessionId, commands } }),
};

// ============================================
// Files API
// ============================================

type RustFileInfo = {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number | null;
  modified?: number | null;
  mime_type?: string | null;
};

function toFileInfo(f: RustFileInfo): types.FileInfo {
  return {
    name: f.name,
    path: f.path,
    isDir: f.is_dir,
    size: f.size ?? undefined,
    modified: f.modified ?? undefined,
    mimeType: f.mime_type ?? undefined,
  };
}

export const files = {
  list: async (agentId: string, path?: string): Promise<types.FileInfo[]> => {
    const raw = await tauriInvoke<RustFileInfo[]>('list_workspace', {
      params: stripUndefined({ agent_id: agentId, path }),
    });
    return raw.map(toFileInfo);
  },
  
  readText: (agentId: string, path: string, offset?: number, limit?: number): Promise<string> => 
    tauriInvoke('read_file', { params: stripUndefined({ agent_id: agentId, path, offset, limit }) }),
  
  readImage: (agentId: string, path: string): Promise<{ data: number[]; width: number; height: number; mimeType: string }> => 
    tauriInvoke('read_image', { params: { agent_id: agentId, path } }),
  
  watch: (agentId: string, path: string): Promise<void> => 
    tauriInvoke('watch_directory', { params: { agent_id: agentId, path } }),
  
  unwatch: (agentId: string, path: string): Promise<void> => 
    tauriInvoke('unwatch_directory', { params: { agent_id: agentId, path } }),
};

// ============================================
// Agents API
// ============================================

export const agents = {
  list: (): Promise<types.AgentInfo[]> => 
    tauriInvoke('list_agents'),
  
  switch: (agentId: string): Promise<{ previousAgentId: string; currentAgentId: string }> => 
    tauriInvoke('switch_agent', { params: { agent_id: agentId } }),
  
  getConfig: (agentId: string): Promise<types.AgentConfig> => 
    tauriInvoke('get_agent_config', { agent_id: agentId }),
};

// ============================================
// Settings API
// ============================================

type RustAppSettings = {
  gateway: RustGatewayConfig;
  default_agent: string;
  theme: types.AppSettings['theme'];
  window: {
    width: number;
    height: number;
    x?: number | null;
    y?: number | null;
    maximized: boolean;
  };
  canvas: {
    enabled: boolean;
    port: number;
  };
};

function toAppSettings(s: RustAppSettings): types.AppSettings {
  return {
    gateway: {
      url: s.gateway.url,
      token: s.gateway.token,
      agentId: s.gateway.agent_id,
      canvasPort: s.gateway.canvas_port,
    },
    defaultAgent: s.default_agent,
    theme: s.theme,
    window: {
      width: s.window.width,
      height: s.window.height,
      x: s.window.x ?? undefined,
      y: s.window.y ?? undefined,
      maximized: s.window.maximized,
    },
    canvas: {
      enabled: s.canvas.enabled,
      port: s.canvas.port,
    },
  };
}

function fromAppSettings(s: types.AppSettings): RustAppSettings {
  return {
    gateway: toRustGatewayConfig(s.gateway),
    default_agent: s.defaultAgent,
    theme: s.theme,
    window: stripUndefined({
      width: s.window.width,
      height: s.window.height,
      x: s.window.x,
      y: s.window.y,
      maximized: s.window.maximized,
    }),
    canvas: {
      enabled: s.canvas.enabled,
      port: s.canvas.port,
    },
  };
}

export const settings = {
  get: async (): Promise<types.AppSettings> => {
    const raw = await tauriInvoke<RustAppSettings>('get_settings');
    return toAppSettings(raw);
  },

  update: (settings: types.AppSettings): Promise<void> =>
    tauriInvoke('update_settings', { new_settings: fromAppSettings(settings) }),
};

// ============================================
// System API
// ============================================

type RustAppInfo = {
  name: string;
  version: string;
  tauri_version: string;
  platform: string;
  arch: string;
};

function toAppInfo(i: RustAppInfo): types.AppInfo {
  const arch = i.arch === 'x86_64' || i.arch === 'amd64'
    ? 'x64'
    : i.arch === 'aarch64'
      ? 'arm64'
      : i.arch;
  return {
    name: i.name,
    version: i.version,
    tauriVersion: i.tauri_version,
    platform: i.platform as types.AppInfo['platform'],
    arch: arch as types.AppInfo['arch'],
  };
}

type RustUpdateInfo = {
  available: boolean;
  version?: string | null;
  release_notes?: string | null;
  release_date?: string | null;
};

function toUpdateInfo(i: RustUpdateInfo): types.UpdateInfo {
  return {
    available: i.available,
    version: i.version ?? undefined,
    releaseNotes: i.release_notes ?? undefined,
    releaseDate: i.release_date ?? undefined,
  };
}

export const system = {
  getInfo: async (): Promise<types.AppInfo> => {
    const raw = await tauriInvoke<RustAppInfo>('get_app_info');
    return toAppInfo(raw);
  },
  
  openExternal: (url: string): Promise<void> => 
    tauriInvoke('open_external', { url }),
  
  checkUpdate: async (): Promise<types.UpdateInfo> => {
    const raw = await tauriInvoke<RustUpdateInfo>('check_update');
    return toUpdateInfo(raw);
  },
  
  installUpdate: (): Promise<void> => 
    tauriInvoke('install_update'),
};

// ============================================
// Event Listeners
// ============================================

export type UnlistenFn = () => void;

export const events = {
  onGateway: async (handler: (event: GatewayEvent) => void): Promise<UnlistenFn> => {
    if (!isTauriRuntime()) return () => {};
    return listen<GatewayEvent>('gateway', (event) => handler(event.payload));
  },

  onAgent: async (handler: (event: types.AgentEvent) => void): Promise<UnlistenFn> => {
    if (!isTauriRuntime()) return () => {};
    return listen<types.AgentEvent>('agent', (event) => handler(event.payload));
  },

  onSubAgent: async (handler: (result: types.SubAgentResult) => void): Promise<UnlistenFn> => {
    if (!isTauriRuntime()) return () => {};
    return listen<types.SubAgentResult>('subagent', (event) => handler(event.payload));
  },

  onFileWatch: async (handler: (event: types.FileWatchEvent) => void): Promise<UnlistenFn> => {
    if (!isTauriRuntime()) return () => {};
    return listen<{ type: string; path: string; is_dir?: boolean }>('file-watch', (event) => {
      const payload = event.payload;
      handler({
        type: payload.type as types.FileWatchEvent['type'],
        path: payload.path,
        isDir: payload.is_dir ?? false,
      } as types.FileWatchEvent);
    });
  },

  onUpdate: async (handler: (event: types.UpdateEvent) => void): Promise<UnlistenFn> => {
    if (!isTauriRuntime()) return () => {};
    return listen<types.UpdateEvent>('update', (event) => handler(event.payload));
  },
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
