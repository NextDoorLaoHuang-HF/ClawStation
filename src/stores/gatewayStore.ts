// Gateway Store - Multi-gateway state management

import { create } from 'zustand';
import type { GatewayProfile, GatewayConnection, GatewayEvent } from '../types/gateway';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

interface GatewayState {
  // Profiles
  profiles: GatewayProfile[];
  activeProfileId: string | null;
  
  // Connections
  connections: Map<string, GatewayConnection>;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Event listeners
  unlisteners: UnlistenFn[];
  
  // Actions
  loadProfiles: () => Promise<void>;
  addProfile: (profile: Omit<GatewayProfile, 'id'>) => Promise<GatewayProfile>;
  updateProfile: (profile: GatewayProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  
  // Connection management
  connect: (profileId: string) => Promise<void>;
  disconnect: (profileId?: string) => Promise<void>;
  disconnectAll: () => Promise<void>;
  
  // Event handling
  initializeEvents: () => Promise<void>;
  cleanup: () => void;
}

// Helper to convert snake_case from Rust to camelCase
const toCamelCase = (profile: Record<string, unknown>): GatewayProfile => ({
  id: profile.id as string,
  name: profile.name as string,
  url: profile.url as string,
  token: profile.token as string | undefined,
  canvasPort: (profile.canvas_port as number) || 18793,
  isDefault: profile.is_default as boolean || false,
});

export const useGatewayStore = create<GatewayState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  connections: new Map(),
  isLoading: false,
  error: null,
  unlisteners: [],
  
  loadProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await invoke<Record<string, unknown>[]>('list_gateway_profiles');
      const mapped = profiles.map(toCamelCase);
      
      // Find active profile (default or first)
      const defaultProfile = mapped.find(p => p.isDefault) || mapped[0];
      
      set({ 
        profiles: mapped, 
        activeProfileId: defaultProfile?.id || null,
        isLoading: false 
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },
  
  addProfile: async (profile) => {
    set({ isLoading: true, error: null });
    try {
      // Convert camelCase to snake_case for Rust
      const rustProfile = {
        id: '',
        name: profile.name,
        url: profile.url,
        token: profile.token || null,
        canvas_port: profile.canvasPort,
        is_default: profile.isDefault,
      };
      
      const result = await invoke<Record<string, unknown>>('add_gateway_profile', { profile: rustProfile });
      const mapped = toCamelCase(result);
      
      set(state => ({
        profiles: [...state.profiles, mapped],
        isLoading: false,
      }));
      
      return mapped;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },
  
  updateProfile: async (profile) => {
    set({ isLoading: true, error: null });
    try {
      const rustProfile = {
        id: profile.id,
        name: profile.name,
        url: profile.url,
        token: profile.token || null,
        canvas_port: profile.canvasPort,
        is_default: profile.isDefault,
      };
      
      await invoke('update_gateway_profile', { profile: rustProfile });
      
      set(state => ({
        profiles: state.profiles.map(p => p.id === profile.id ? profile : p),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },
  
  removeProfile: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('remove_gateway_profile', { id });
      
      // Disconnect if connected
      const { connections } = get();
      if (connections.has(id)) {
        await get().disconnect(id);
      }
      
      set(state => {
        const newProfiles = state.profiles.filter(p => p.id !== id);
        // Update active profile if needed
        let newActiveId = state.activeProfileId;
        if (state.activeProfileId === id) {
          newActiveId = newProfiles[0]?.id || null;
        }
        
        const newConnections = new Map(state.connections);
        newConnections.delete(id);
        
        return {
          profiles: newProfiles,
          activeProfileId: newActiveId,
          connections: newConnections,
          isLoading: false,
        };
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },
  
  setDefault: async (id) => {
    try {
      await invoke('set_default_gateway', { id });
      
      set(state => ({
        profiles: state.profiles.map(p => ({
          ...p,
          isDefault: p.id === id,
        })),
      }));
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },
  
  connect: async (profileId) => {
    const { profiles, connections } = get();
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    // Update connection status to connecting
    const newConnections = new Map(connections);
    newConnections.set(profileId, {
      profileId,
      status: 'connecting',
    });
    set({ connections: newConnections });
    
    try {
      const config = {
        url: profile.url,
        token: profile.token || '',
        agent_id: 'main',
        canvas_port: profile.canvasPort,
      };
      
      await invoke('connect', { config });
      
      // Update status to connected
      const updatedConnections = new Map(get().connections);
      updatedConnections.set(profileId, {
        profileId,
        status: 'connected',
        url: profile.url,
      });
      
      set({ 
        connections: updatedConnections,
        activeProfileId: profileId,
      });
    } catch (err) {
      // Update status to error
      const updatedConnections = new Map(get().connections);
      updatedConnections.set(profileId, {
        profileId,
        status: 'error',
        error: String(err),
      });
      set({ connections: updatedConnections, error: String(err) });
      throw err;
    }
  },
  
  disconnect: async (profileId) => {
    try {
      await invoke('disconnect');
      
      const updatedConnections = new Map(get().connections);
      if (profileId) {
        updatedConnections.set(profileId, {
          profileId,
          status: 'disconnected',
        });
      } else {
        // Clear all connections
        for (const [id, conn] of updatedConnections) {
          updatedConnections.set(id, { ...conn, status: 'disconnected' });
        }
      }
      
      set({ connections: updatedConnections });
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },
  
  disconnectAll: async () => {
    const { connections } = get();
    for (const _ of connections) {
      try {
        await invoke('disconnect');
      } catch {
        // Ignore errors during disconnect all
      }
    }
    
    const updatedConnections = new Map< string, GatewayConnection>();
    set({ connections: updatedConnections, activeProfileId: null });
  },
  
  initializeEvents: async () => {
    const { unlisteners } = get();
    
    // Clean up existing listeners
    unlisteners.forEach(fn => fn());
    
    const unlistenGateway = await listen<GatewayEvent>('gateway', (event) => {
      const { activeProfileId, connections } = get();
      const updatedConnections = new Map(connections);
      const gatewayEvent = event.payload;
      
      switch (gatewayEvent.type) {
        case 'connected':
          if (activeProfileId && typeof (gatewayEvent.payload as { protocol?: number })?.protocol === 'number') {
            updatedConnections.set(activeProfileId, {
              profileId: activeProfileId,
              status: 'connected',
              protocol: (gatewayEvent.payload as { protocol: number }).protocol,
            });
          }
          break;
          
        case 'disconnected':
          if (activeProfileId) {
            updatedConnections.set(activeProfileId, {
              profileId: activeProfileId,
              status: 'disconnected',
              url: connections.get(activeProfileId)?.url,
            });
          }
          break;
          
        case 'error':
          if (activeProfileId && typeof (gatewayEvent.payload as { message?: string })?.message === 'string') {
            updatedConnections.set(activeProfileId, {
              profileId: activeProfileId,
              status: 'error',
              error: (gatewayEvent.payload as { message: string }).message,
            });
          }
          break;
      }
      
      set({ connections: updatedConnections });
    });
    
    set({ unlisteners: [unlistenGateway] });
  },
  
  cleanup: () => {
    const { unlisteners } = get();
    unlisteners.forEach(fn => fn());
    set({ unlisteners: [] });
  },
}));
