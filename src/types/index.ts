// ClawStation Frontend Types
// Version: 1.0.0
// Generated: 2026-02-23

// ============================================
// Gateway Module
// ============================================

export interface GatewayConfig {
  url: string;           // WebSocket URL, e.g., "ws://127.0.0.1:18789"
  token: string;         // Gateway auth token
  agentId?: string;      // Default agent ID, default: "main"
  canvasPort?: number;   // Canvas host port, default: 18793
}

export interface GatewayStatus {
  connected: boolean;
  url?: string;
  agentId?: string;
  protocol?: number;
  lastPing?: number;
}

export type GatewayEvent = 
  | { type: 'connected'; payload: { protocol: number; policy: Policy } }
  | { type: 'disconnected'; payload: { reason: string } }
  | { type: 'error'; payload: { message: string } };

export interface Policy {
  maxPayload: number;
  maxBufferedBytes: number;
  tickIntervalMs: number;
}

// ============================================
// Session Module
// ============================================

export interface Session {
  key: string;              // Session key
  agentId: string;          // Agent ID
  displayName: string;      // Display name
  model: string;            // Model ID
  totalTokens: number;      // Total tokens used
  contextTokens: number;    // Context tokens
  updatedAt: number;        // Last update timestamp (ms)
  kind: 'main' | 'dm' | 'group' | 'cron' | 'other';
  channel?: string;         // Source channel
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'toolResult';
  content: ContentPart[];
  timestamp: number;
}

export type ContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image'; image: string }
  | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'toolResult'; toolCallId: string; toolName: string; content: ContentPart[] };

export interface Attachment {
  type: 'image' | 'file';
  path?: string;           // Local file path
  url?: string;            // Remote URL
  data?: string;           // Base64 data
  mimeType?: string;
  filename?: string;
}

// ============================================
// Canvas Module
// ============================================

export interface CanvasState {
  sessionId: string;
  visible: boolean;
  url?: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export type A2UICommand =
  | { type: 'beginRendering'; surfaceId: string; root: string }
  | { type: 'surfaceUpdate'; surfaceId: string; components: Component[] }
  | { type: 'dataModelUpdate'; surfaceId: string; data: unknown }
  | { type: 'deleteSurface'; surfaceId: string };

export interface Component {
  id: string;
  component: ComponentType;
}

export type ComponentType =
  | { Column: { children: { explicitList: string[] } } }
  | { Text: { text: { literalString: string }; usageHint?: 'h1' | 'h2' | 'body' } }
  | { Button: { label: string; onPress?: string } }
  | { Row: { children: { explicitList: string[] } } }
  | { Image: { source: { url: string } } };

// ============================================
// Files Module
// ============================================

export interface FileInfo {
  name: string;
  path: string;            // Relative path
  isDir: boolean;
  size?: number;           // File size in bytes
  modified?: number;       // Last modified timestamp (ms)
  mimeType?: string;       // For files
}

export type FileWatchEvent =
  | { type: 'created'; path: string; isDir: boolean }
  | { type: 'modified'; path: string }
  | { type: 'deleted'; path: string };

// ============================================
// Agents Module
// ============================================

export interface AgentInfo {
  id: string;
  name: string;            // Display name
  emoji?: string;
  model: string;           // Primary model
  available: boolean;      // Is currently available
  subagents?: string[];    // Available sub-agents
}

export interface AgentConfig {
  id: string;
  model: string;
  identity?: {
    name?: string;
    emoji?: string;
  };
  tools?: string[];
}

// ============================================
// Settings Module
// ============================================

export interface AppSettings {
  gateway: GatewayConfig;
  defaultAgent: string;
  theme: 'light' | 'dark' | 'system';
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
  canvas: {
    enabled: boolean;
    port: number;
  };
}

// ============================================
// System Module
// ============================================

export interface AppInfo {
  name: string;
  version: string;
  tauriVersion: string;
  platform: 'windows' | 'macos' | 'linux';
  arch: 'x64' | 'arm64';
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export type UpdateEvent =
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded' }
  | { type: 'installed'; restartRequired: boolean };

// ============================================
// Agent Events
// ============================================

export interface AgentEvent {
  sessionKey: string;
  runId: string;
  type: 'started' | 'text' | 'tool' | 'error' | 'completed';
  payload: {
    text?: string;
    delta?: string;          // For streaming
    tool?: { name: string; arguments: Record<string, unknown> };
    error?: string;
    summary?: string;
  };
}

export interface SubAgentResult {
  runId: string;
  status: 'ok' | 'error' | 'timeout';
  summary?: string;
  error?: string;
}
