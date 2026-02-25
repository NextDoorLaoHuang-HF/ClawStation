import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { emit } from '@tauri-apps/api/event'
import { MainLayout } from '../MainLayout'
import { useSessionStore } from '../../../stores/sessionStore'
import { useGatewayStore } from '../../../stores/gatewayStore'
import { useAgentStore } from '../../../stores/agentStore'
import { useUIStore } from '../../../stores/uiStore'

describe('MainLayout smoke', () => {
  beforeEach(() => {
    clearMocks()

    useUIStore.setState({ isSettingsOpen: false, settingsTab: 'gateway' })
    useAgentStore.setState({ agents: [], currentAgentId: 'main', isLoading: false, error: null })
    useSessionStore.setState({
      sessions: [],
      activeSessionKey: null,
      messages: {},
      isLoading: false,
      error: null,
      streamingMessage: null
    })
    useGatewayStore.setState({
      profiles: [],
      activeProfileId: null,
      connections: new Map(),
      isLoading: false,
      error: null,
      unlisteners: []
    })
  })

  afterEach(() => {
    clearMocks()
  })

  it('sends a message and renders streamed agent output via events', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC(
      (cmd, args) => {
        calls.push({ cmd, args })
        switch (cmd) {
          case 'list_gateway_profiles':
            return [
              {
                id: 'p1',
                name: 'Local',
                url: 'ws://127.0.0.1:18789',
                token: null,
                canvas_port: 18793,
                is_default: true
              }
            ]
          case 'list_agents':
            return [{ id: 'main', name: 'Main Agent', emoji: '🤖', model: 'm', available: true }]
          case 'list_sessions':
            return []
          case 'create_session':
            return { sessionKey: 'sk1' }
          case 'send_message':
            return null
          default:
            return null
        }
      },
      { shouldMockEvents: true }
    )

    // The mock helper doesn't implement this internal hook, but the real `unlisten`
    // path calls it during cleanup (React unmount).
    ;(window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__?: Record<string, unknown> })
      .__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      ...(window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__?: Record<string, unknown> })
        .__TAURI_EVENT_PLUGIN_INTERNALS__,
      unregisterListener: () => {}
    }

    const { unmount } = render(<MainLayout />)

    const textarea = await screen.findByPlaceholderText('Type a message... (Shift+Enter for new line)')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(await screen.findByText('Hello')).toBeInTheDocument()

    await waitFor(() => {
      expect(calls.some((c) => c.cmd === 'send_message')).toBe(true)
    })

    await act(async () => {
      await emit('agent', { sessionKey: 'sk1', runId: 'r1', type: 'started', payload: {} })
      await emit('agent', { sessionKey: 'sk1', runId: 'r1', type: 'text', payload: { delta: 'Hi' } })
      await emit('agent', { sessionKey: 'sk1', runId: 'r1', type: 'completed', payload: { summary: 'Hi' } })
    })

    expect(await screen.findByText('Hi')).toBeInTheDocument()

    // Ensure async unlisten runs before mocks are cleared by other afterEach hooks.
    await act(async () => {
      unmount()
    })
  })
})
