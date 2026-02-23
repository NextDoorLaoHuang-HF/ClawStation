import { create } from 'zustand';
import type { AgentInfo, AgentConfig } from '../types';

// Mock 数据
const mockAgents: AgentInfo[] = [
  {
    id: 'main',
    name: 'Main Agent',
    emoji: '🤖',
    model: 'claude-sonnet-4-20250514',
    available: true,
    subagents: ['coder', 'researcher'],
  },
  {
    id: 'laoh',
    name: 'Laoh',
    emoji: '🦅',
    model: 'claude-sonnet-4-20250514',
    available: true,
    subagents: ['coder'],
  },
  {
    id: 'researcher',
    name: 'Researcher',
    emoji: '🔬',
    model: 'claude-sonnet-4-20250514',
    available: false,
    subagents: [],
  },
];

const mockConfigs: Record<string, AgentConfig> = {
  main: {
    id: 'main',
    model: 'claude-sonnet-4-20250514',
    identity: {
      name: 'Main Agent',
      emoji: '🤖',
    },
    tools: ['read_file', 'write_file', 'execute_command', 'web_search'],
  },
};

interface AgentState {
  // 状态
  agents: AgentInfo[];
  currentAgentId: string;
  agentConfigs: Record<string, AgentConfig>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentAgent: (agentId: string) => Promise<void>;
  loadAgents: () => Promise<void>;
  loadAgentConfig: (agentId: string) => Promise<void>;
  getCurrentAgent: () => AgentInfo | undefined;
  getCurrentConfig: () => AgentConfig | undefined;
  clearError: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // 初始状态
  agents: mockAgents,
  currentAgentId: 'main',
  agentConfigs: mockConfigs,
  isLoading: false,
  error: null,

  // Actions
  setCurrentAgent: async (agentId) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 调用 Tauri API
      // await invoke('switch_agent', { agentId });
      
      // Mock
      await new Promise(resolve => setTimeout(resolve, 300));
      set({ currentAgentId: agentId, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 调用 Tauri API
      // const agents = await invoke('list_agents');
      // set({ agents, isLoading: false });
      
      // Mock
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadAgentConfig: async (agentId) => {
    try {
      // TODO: 调用 Tauri API
      // const config = await invoke('get_agent_config', { agentId });
      
      // Mock
      await new Promise(resolve => setTimeout(resolve, 200));
      const config = mockConfigs[agentId];
      if (config) {
        set((state) => ({
          agentConfigs: { ...state.agentConfigs, [agentId]: config },
        }));
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  getCurrentAgent: () => {
    return get().agents.find(a => a.id === get().currentAgentId);
  },

  getCurrentConfig: () => {
    return get().agentConfigs[get().currentAgentId];
  },

  clearError: () => set({ error: null }),
}));
