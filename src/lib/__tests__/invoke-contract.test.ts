import { describe, it, expect, afterEach, vi } from 'vitest'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { emit } from '@tauri-apps/api/event'
import * as api from '../api'

afterEach(() => {
  clearMocks()
})

describe('Tauri invoke contract', () => {
  it('sessions.list uses snake_case params wrapper', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'list_sessions') {
        return [
          {
            key: 'k1',
            agent_id: 'main',
            display_name: 'Main',
            model: 'm',
            total_tokens: 1,
            context_tokens: 2,
            updated_at: 123,
            kind: 'main',
            channel: null
          }
        ]
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    expect(api.isTauriRuntime()).toBe(true)
    const list = await api.sessions.list({ agentId: 'main', limit: 10 })

    expect(calls[0]?.cmd).toBe('list_sessions')
    expect(calls[0]?.args).toMatchObject({
      params: {
        agent_id: 'main',
        limit: 10
      }
    })

    expect(list[0]).toMatchObject({
      key: 'k1',
      agentId: 'main',
      displayName: 'Main'
    })
  })

  it('sessions.create wraps params and returns sessionKey', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'create_session') return { sessionKey: 's1' }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const result = await api.sessions.create('main')
    expect(result).toEqual({ sessionKey: 's1' })
    expect(calls[0]?.cmd).toBe('create_session')
    expect(calls[0]?.args).toMatchObject({ params: { agent_id: 'main' } })
  })

  it('sessions.send wraps params and defaults attachments to []', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'send_message') return null
      throw new Error(`Unexpected command: ${cmd}`)
    })

    await api.sessions.send('sk1', 'hello')
    expect(calls[0]?.cmd).toBe('send_message')
    expect(calls[0]?.args).toMatchObject({
      params: { session_key: 'sk1', message: 'hello', attachments: [] }
    })
  })

  it('sessions.abort wraps params wrapper', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'abort_session') return { stopped: 1 }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const result = await api.sessions.abort('sk1')
    expect(result).toEqual({ stopped: 1 })
    expect(calls[0]?.cmd).toBe('abort_session')
    expect(calls[0]?.args).toMatchObject({ params: { session_key: 'sk1' } })
  })

  it('agents.switch uses SwitchAgentParams shape', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'switch_agent') return { previousAgentId: 'main', currentAgentId: 'codex' }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const result = await api.agents.switch('codex')
    expect(result.currentAgentId).toBe('codex')
    expect(calls[0]?.cmd).toBe('switch_agent')
    expect(calls[0]?.args).toMatchObject({ params: { agent_id: 'codex' } })
  })

  it('canvas.present wraps session_id in params and maps state', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'canvas_present') {
        return { session_id: 's1', visible: true, url: 'https://example.com', bounds: null }
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const state = await api.canvas.present('s1', 'https://example.com')
    expect(calls[0]?.cmd).toBe('canvas_present')
    expect(calls[0]?.args).toMatchObject({ params: { session_id: 's1', url: 'https://example.com' } })
    expect(state).toMatchObject({ sessionId: 's1', visible: true, url: 'https://example.com' })
  })

  it('files.list wraps agent_id in params and maps file info', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'list_workspace') {
        return [{ name: 'a.txt', path: 'a.txt', is_dir: false, size: 1, modified: 2, mime_type: 'text/plain' }]
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const list = await api.files.list('main', '.')
    expect(calls[0]?.cmd).toBe('list_workspace')
    expect(calls[0]?.args).toMatchObject({ params: { agent_id: 'main', path: '.' } })
    expect(list[0]).toMatchObject({ name: 'a.txt', path: 'a.txt', isDir: false, mimeType: 'text/plain' })
  })

  it('agents.getConfig passes snake_case agent_id arg', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'get_agent_config') return { id: 'main', model: 'm', identity: null, tools: null }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const cfg = await api.agents.getConfig('main')
    expect(calls[0]?.cmd).toBe('get_agent_config')
    expect(calls[0]?.args).toMatchObject({ agent_id: 'main' })
    expect(cfg.id).toBe('main')
  })

  it('settings.update uses new_settings and snake_case fields', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'update_settings') return null
      throw new Error(`Unexpected command: ${cmd}`)
    })

    await api.settings.update({
      gateway: { url: 'ws://x', token: '', agentId: 'main', canvasPort: 18793 },
      defaultAgent: 'main',
      theme: 'system',
      window: { width: 100, height: 200, maximized: false },
      canvas: { enabled: true, port: 18793 },
    })

    expect(calls[0]?.cmd).toBe('update_settings')
    expect(calls[0]?.args).toMatchObject({
      new_settings: {
        default_agent: 'main',
        theme: 'system',
        gateway: { url: 'ws://x', token: '', agent_id: 'main', canvas_port: 18793 },
        window: { width: 100, height: 200, maximized: false },
        canvas: { enabled: true, port: 18793 },
      },
    })
  })

  it('events.onAgent listens and receives emitted events', async () => {
    mockIPC(() => null, { shouldMockEvents: true })

    const handler = vi.fn()
    const unlisten = await api.events.onAgent(handler)

    await emit('agent', {
      sessionKey: 'sk1',
      runId: 'r1',
      type: 'text',
      payload: { delta: 'hi' }
    })

    expect(handler).toHaveBeenCalledWith({
      sessionKey: 'sk1',
      runId: 'r1',
      type: 'text',
      payload: { delta: 'hi' }
    })

    await unlisten()
  })
})
