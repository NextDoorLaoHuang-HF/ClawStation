import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from '../sessionStore'

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ 
      sessions: [], 
      activeSessionKey: null,
      messages: {},
      isLoading: false,
      error: null,
      streamingMessage: null
    })
  })

  it('should create session', async () => {
    const store = useSessionStore.getState()
    const sessionKey = await store.createSession('test-agent')
    
    expect(sessionKey).toBeDefined()
    expect(sessionKey).toContain('agent:test-agent:session:')
    expect(useSessionStore.getState().sessions.length).toBe(1)
    expect(useSessionStore.getState().activeSessionKey).toBe(sessionKey)
  })

  it('should switch session', async () => {
    const store = useSessionStore.getState()
    const sessionKey1 = await store.createSession('agent-1')
    const sessionKey2 = await store.createSession('agent-2')
    
    store.setActiveSession(sessionKey1)
    expect(useSessionStore.getState().activeSessionKey).toBe(sessionKey1)
    
    store.setActiveSession(sessionKey2)
    expect(useSessionStore.getState().activeSessionKey).toBe(sessionKey2)
  })

  it('should set loading state', () => {
    const store = useSessionStore.getState()
    
    // Initial state
    expect(store.isLoading).toBe(false)
    
    // After calling loadSessions, loading should be set
    store.loadSessions()
    expect(useSessionStore.getState().isLoading).toBe(true)
  })

  it('should clear error', () => {
    const store = useSessionStore.getState()
    
    // Set error manually
    useSessionStore.setState({ error: 'Test error' })
    expect(useSessionStore.getState().error).toBe('Test error')
    
    // Clear error
    store.clearError()
    expect(useSessionStore.getState().error).toBeNull()
  })

  it('should handle agent text event', () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session-1'
    
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'text',
      payload: { delta: 'Hello ' }
    })
    
    expect(useSessionStore.getState().streamingMessage).toBe('Hello ')
    
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'text',
      payload: { delta: 'World' }
    })
    
    expect(useSessionStore.getState().streamingMessage).toBe('Hello World')
  })

  it('should handle agent completed event', () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session-1'
    
    // Set up initial state with streaming message
    useSessionStore.setState({ 
      streamingMessage: 'Test response',
      messages: { [sessionKey]: [] }
    })
    
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'completed',
      payload: { summary: 'Test response' }
    })
    
    const state = useSessionStore.getState()
    expect(state.streamingMessage).toBeNull()
    expect(state.messages[sessionKey].length).toBe(1)
    expect(state.messages[sessionKey][0].role).toBe('assistant')
  })

  it('should handle agent error event', () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session-1'
    
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'error',
      payload: { error: 'Something went wrong' }
    })
    
    expect(useSessionStore.getState().error).toBe('Something went wrong')
    expect(useSessionStore.getState().streamingMessage).toBeNull()
  })

  it('should handle agent started event', () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session-1'
    
    // Should not throw or change state significantly
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'started',
      payload: {}
    })
    
    // State should remain stable
    expect(useSessionStore.getState().error).toBeNull()
  })

  it('should handle agent tool event', () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session-1'
    
    // Should not throw or change state significantly
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'tool',
      payload: { tool: { name: 'test_tool', arguments: {} } }
    })
    
    // State should remain stable
    expect(useSessionStore.getState().error).toBeNull()
  })

  it('should load messages', async () => {
    const store = useSessionStore.getState()
    
    // Should set loading state
    const loadPromise = store.loadMessages('test-session')
    expect(useSessionStore.getState().isLoading).toBe(true)
    
    // Wait for completion
    await loadPromise
    expect(useSessionStore.getState().isLoading).toBe(false)
  })

  it('should send message', async () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session'
    
    // Set up session with empty messages
    useSessionStore.setState({
      messages: { [sessionKey]: [] }
    })
    
    await store.sendMessage(sessionKey, 'Hello')
    
    const state = useSessionStore.getState()
    expect(state.messages[sessionKey].length).toBe(2) // user message + assistant response
    expect(state.messages[sessionKey][0].role).toBe('user')
    expect(state.messages[sessionKey][0].content[0].type).toBe('text')
    expect(state.messages[sessionKey][1].role).toBe('assistant')
  })

  it('should abort session', async () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session'
    
    // Should not throw
    await store.abortSession(sessionKey)
    
    // No state changes expected for mock implementation
    expect(useSessionStore.getState().error).toBeNull()
  })

  it('should handle completed event with empty streaming message', () => {
    const store = useSessionStore.getState()
    const sessionKey = 'test-session-1'
    
    // Set up initial state without streaming message
    useSessionStore.setState({ 
      streamingMessage: null,
      messages: { [sessionKey]: [] }
    })
    
    store.handleAgentEvent({
      sessionKey,
      runId: 'run-1',
      type: 'completed',
      payload: { summary: 'Final summary' }
    })
    
    const state = useSessionStore.getState()
    expect(state.streamingMessage).toBeNull()
    expect(state.messages[sessionKey].length).toBe(1)
    const part = state.messages[sessionKey][0].content[0]
    expect(part.type).toBe('text')
    if (part.type !== 'text') throw new Error('Expected text content part')
    expect(part.text).toBe('Final summary')
  })

  it('should maintain sessions array order', async () => {
    const store = useSessionStore.getState()
    
    const key1 = await store.createSession('agent-1')
    const key2 = await store.createSession('agent-2')
    const key3 = await store.createSession('agent-3')
    
    const sessions = useSessionStore.getState().sessions
    expect(sessions.length).toBe(3)
    // Newest sessions should be first
    expect(sessions[0].key).toBe(key3)
    expect(sessions[1].key).toBe(key2)
    expect(sessions[2].key).toBe(key1)
  })
})
