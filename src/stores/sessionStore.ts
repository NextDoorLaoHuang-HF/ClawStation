import { create } from 'zustand';
import type { Session, Message, AgentEvent } from '../types';
import { isTauriRuntime, sessions as sessionsApi } from '../lib/api';

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
  sessions: isTauriRuntime() ? [] : mockSessions,
  activeSessionKey: isTauriRuntime() ? null : (mockSessions[0]?.key || null),
  messages: isTauriRuntime() ? {} : mockMessages,
  isLoading: false,
  error: null,
  streamingMessage: null,

  // Actions
  setActiveSession: (key) => {
    set({ activeSessionKey: key });
  },

  loadSessions: async (agentId) => {
    set({ isLoading: true, error: null });
    try {
      if (!isTauriRuntime()) {
        // Mock 数据
        await new Promise(resolve => setTimeout(resolve, 500));
        set({ isLoading: false });
        return;
      }

      const list = await sessionsApi.list(agentId ? { agentId } : undefined);
      if (list.length === 0) {
        // Create a default session so the user can chat immediately.
        const { sessionKey } = await sessionsApi.create(agentId || 'main');
        set((state) => ({
          sessions: [
            {
              key: sessionKey,
              agentId: agentId || 'main',
              displayName: 'New Chat',
              model: 'default',
              totalTokens: 0,
              contextTokens: 0,
              updatedAt: Date.now(),
              kind: 'main',
            },
            ...state.sessions,
          ],
          activeSessionKey: sessionKey,
          messages: { ...state.messages, [sessionKey]: state.messages[sessionKey] || [] },
          isLoading: false,
        }));
        return;
      }

      set((state) => ({
        sessions: list,
        activeSessionKey: state.activeSessionKey || list[0]?.key || null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadMessages: async (sessionKey) => {
    set({ isLoading: true, error: null });
    try {
      if (!isTauriRuntime()) {
        // Mock 数据
        await new Promise(resolve => setTimeout(resolve, 300));
        set({ isLoading: false });
        return;
      }

      const history = await sessionsApi.getHistory(sessionKey, 100, true);
      set((state) => ({
        messages: { ...state.messages, [sessionKey]: history },
        isLoading: false,
      }));
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
      if (!isTauriRuntime()) {
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
        return;
      }

      set({ isLoading: true, error: null, streamingMessage: null });
      await sessionsApi.send(sessionKey, content);
    } catch (error) {
      set({ error: String(error), isLoading: false, streamingMessage: null });
    }
  },

  createSession: async (agentId) => {
    try {
      if (!isTauriRuntime()) {
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
      }

      const { sessionKey } = await sessionsApi.create(agentId);
      const newSession: Session = {
        key: sessionKey,
        agentId,
        displayName: 'New Chat',
        model: 'default',
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
      if (!isTauriRuntime()) {
        console.log('Abort session:', sessionKey);
        return;
      }
      await sessionsApi.abort(sessionKey);
    } catch (error) {
      set({ error: String(error) });
    }
  },

  handleAgentEvent: (event) => {
    const { sessionKey, type, payload } = event;
    
    switch (type) {
      case 'started':
        set({ isLoading: true, streamingMessage: null });
        break;
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
            isLoading: false,
            messages: {
              ...state.messages,
              [sessionKey]: [...(state.messages[sessionKey] || []), finalMessage],
            },
          };
        });
        break;
      case 'error':
        set({ error: payload.error || 'Unknown error', streamingMessage: null, isLoading: false });
        break;
    }
  },

  clearError: () => set({ error: null }),
}));
