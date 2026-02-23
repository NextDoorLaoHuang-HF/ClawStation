// Gateway Types

export interface GatewayProfile {
  id: string;
  name: string;
  url: string;
  token?: string;
  canvasPort: number;
  isDefault: boolean;
}

export interface GatewayConnection {
  profileId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  url?: string;
  protocol?: number;
  lastPing?: number;
  error?: string;
}

export type GatewayEventType = 'connected' | 'disconnected' | 'error';

export interface Policy {
  tickIntervalMs: number;
}

export type GatewayEventPayload =
  | { protocol: number; policy: Policy }
  | { reason: string }
  | { message: string };

export interface GatewayEvent {
  type: GatewayEventType;
  payload: GatewayEventPayload;
}
