import { create } from 'zustand';
import type { Session, Message, AgentEvent } from '../types';

// Mock 数据 - 用于开发
const mockSessions: Session[] = [
  {
    key: 'agent:main:session:1',
    agentId: 'main',
    displayName: 'Main Chat',
    model: 'claude-sonnet-4-20250514',
    totalTokens: 15234,
    contextTokens: 4096,
    updatedAt: Date.now(),
    kind: 'main',
  },
  {
    key: 'agent:main:qqbot:dm:user123',
    agentId: 'main',
    displayName: 'QQ User',
    model: 'claude-sonnet-4-20250514',
    totalTokens: 3456,
    contextTokens: 2048,
    updatedAt: Date.now() - 3600000,
    kind: 'dm',
    channel: 'qqbot',
  },
];

const mockMessages: Record<string, Message[]> = {
  'agent:main:session:1': [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Hello, can you help me with coding?' }],
      timestamp: Date.now() - 60000,
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: 'Of course! I\'d be happy to help you with coding. What would you like to work on?' }],
      timestamp: Date.now() - 55000,
    },
  ],
};

interface SessionState {
  // 状态
  sessions: Session[];
  activeSessionKey: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
  streamingMessage: string | null;
  
  // Actions
  setActiveSession: (key: string) => void;
  loadSessions: (agentId?: string) => Promise<void>;
  loadMessages: (sessionKey: string) => Promise<void>;
  sendMessage: (sessionKey: string, content: string) => Promise<void>;
  createSession: (agentId: string) => Promise<string>;
  abortSession: (sessionKey: string) => Promise<void>;
  handleAgentEvent: (event: AgentEvent) => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  // 初始状态
  sessions: mockSessions,
  activeSessionKey: mockSessions[0]?.key || null,
  messages: mockMessages,
  isLoading: false,
  error: null,
  streamingMessage: null,

  // Actions
  setActiveSession: (key) => {
    set({ activeSessionKey: key });
  },

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 调用 Tauri API
      // const sessions = await invoke('list_sessions', { agentId });
      // set({ sessions, isLoading: false });
      
      // Mock 数据
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadMessages: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 调用 Tauri API
      // const messages = await invoke('get_history', { sessionKey });
      // set((state) => ({
      //   messages: { ...state.messages, [sessionKey]: messages },
      //   isLoading: false,
      // }));
      
      // Mock 数据
      await new Promise(resolve => setTimeout(resolve, 300));
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  sendMessage: async (sessionKey, content) => {
    const userMessage: Message = {
      role: 'user',
      content: [{ type: 'text', text: content }],
      timestamp: Date.now(),
    };
    
    // 立即添加用户消息
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionKey]: [...(state.messages[sessionKey] || []), userMessage],
      },
    }));

    try {
      // TODO: 调用 Tauri API
      // await invoke('send_message', { sessionKey, message: content });
      
      // Mock: 模拟响应
      await new Promise(resolve => setTimeout(resolve, 1000));
      const assistantMessage: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: `Received: ${content}` }],
        timestamp: Date.now(),
      };
      
      set((state) => ({
        messages: {
          ...state.messages,
          [sessionKey]: [...(state.messages[sessionKey] || []), assistantMessage],
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  createSession: async (agentId) => {
    try {
      // TODO: 调用 Tauri API
      // const { sessionKey } = await invoke('create_session', { agentId });
      
      // Mock
      const sessionKey = `agent:${agentId}:session:${Date.now()}`;
      const newSession: Session = {
        key: sessionKey,
        agentId,
        displayName: `New Chat`,
        model: 'claude-sonnet-4-20250514',
        totalTokens: 0,
        contextTokens: 0,
        updatedAt: Date.now(),
        kind: 'main',
      };
      
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionKey: sessionKey,
        messages: { ...state.messages, [sessionKey]: [] },
      }));
      
      return sessionKey;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  abortSession: async (sessionKey) => {
    try {
      // TODO: 调用 Tauri API
      // await invoke('abort_session', { sessionKey });
      console.log('Abort session:', sessionKey);
    } catch (error) {
      set({ error: String(error) });
    }
  },

  handleAgentEvent: (event) => {
    const { sessionKey, type, payload } = event;
    
    switch (type) {
      case 'text':
        if (payload.delta) {
          set((state) => ({
            streamingMessage: (state.streamingMessage || '') + payload.delta,
          }));
        }
        break;
      case 'completed':
        set((state) => {
          const finalMessage: Message = {
            role: 'assistant',
            content: [{ type: 'text', text: state.streamingMessage || payload.summary || '' }],
            timestamp: Date.now(),
          };
          return {
            streamingMessage: null,
            messages: {
              ...state.messages,
              [sessionKey]: [...(state.messages[sessionKey] || []), finalMessage],
            },
          };
        });
        break;
      case 'error':
        set({ error: payload.error || 'Unknown error', streamingMessage: null });
        break;
    }
  },

  clearError: () => set({ error: null }),
}));
