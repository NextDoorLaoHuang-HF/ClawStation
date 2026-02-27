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

  it('gateway profile APIs map snake_case fields and invoke expected commands', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'list_gateway_profiles') {
        return [
          {
            id: 'p1',
            name: 'Local',
            url: 'ws://127.0.0.1:18789',
            token: null,
            canvas_port: 18793,
            is_default: true,
          },
        ]
      }
      if (cmd === 'add_gateway_profile' || cmd === 'update_gateway_profile') {
        return {
          id: 'p2',
          name: 'Added',
          url: 'ws://a',
          token: 't',
          canvas_port: 19000,
          is_default: false,
        }
      }
      if (cmd === 'remove_gateway_profile' || cmd === 'set_default_gateway') return null
      if (cmd === 'get_default_gateway_profile') {
        return {
          id: 'p1',
          name: 'Local',
          url: 'ws://127.0.0.1:18789',
          token: null,
          canvas_port: 18793,
          is_default: true,
        }
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const list = await api.gateway.listProfiles()
    expect(list[0]).toMatchObject({ id: 'p1', canvasPort: 18793, isDefault: true })

    const added = await api.gateway.addProfile({
      name: 'A',
      url: 'ws://a',
      token: undefined,
      canvasPort: 19000,
      isDefault: false,
    })
    expect(added).toMatchObject({ id: 'p2', token: 't' })
    expect(calls.find((c) => c.cmd === 'add_gateway_profile')?.args).toMatchObject({
      profile: {
        id: '',
        name: 'A',
        url: 'ws://a',
        token: null,
        canvas_port: 19000,
        is_default: false,
      },
    })

    await api.gateway.updateProfile({
      id: 'p2',
      name: 'B',
      url: 'ws://b',
      token: 'tok',
      canvasPort: 20000,
      isDefault: true,
    })
    expect(calls.find((c) => c.cmd === 'update_gateway_profile')?.args).toMatchObject({
      profile: {
        id: 'p2',
        name: 'B',
        url: 'ws://b',
        token: 'tok',
        canvas_port: 20000,
        is_default: true,
      },
    })

    await api.gateway.removeProfile('p2')
    await api.gateway.setDefault('p1')
    expect(calls.some((c) => c.cmd === 'remove_gateway_profile')).toBe(true)
    expect(calls.some((c) => c.cmd === 'set_default_gateway')).toBe(true)

    const defaultProfile = await api.gateway.getDefault()
    expect(defaultProfile).toMatchObject({ id: 'p1', isDefault: true })
  })

  it('gateway connect/disconnect/status use rust config keys', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'connect' || cmd === 'disconnect') return null
      if (cmd === 'get_status') {
        return {
          connected: true,
          url: 'ws://x',
          agent_id: 'main',
          protocol: 3,
          last_ping: 1000,
        }
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    await api.gateway.connect({ url: 'ws://x', token: '', agentId: undefined, canvasPort: undefined })
    await api.gateway.disconnect()
    const status = await api.gateway.getStatus()
    expect(status).toMatchObject({
      connected: true,
      url: 'ws://x',
      agentId: 'main',
      protocol: 3,
      lastPing: 1000,
    })
    expect(calls.find((c) => c.cmd === 'connect')?.args).toMatchObject({
      config: {
        url: 'ws://x',
        token: '',
        agent_id: 'main',
        canvas_port: 18793,
      },
    })
  })

  it('sessions.getHistory maps toolcall/toolresult and spawnSubAgent uses snake_case', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'get_history') {
        return [
          {
            role: 'assistant',
            timestamp: 1,
            content: [{ type: 'toolcall', id: 't1', name: 'run', arguments: { a: 1 } }],
          },
          {
            role: 'toolresult',
            timestamp: 2,
            content: [
              {
                type: 'toolresult',
                tool_call_id: 't1',
                tool_name: 'run',
                content: [{ type: 'text', text: 'done' }],
              },
            ],
          },
        ]
      }
      if (cmd === 'spawn_subagent') {
        return { sessionKey: 'sk', runId: 'rid', status: 'accepted' }
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const history = await api.sessions.getHistory('sk1', 5, true)
    expect(history[0].content[0]).toMatchObject({ type: 'toolCall', id: 't1', name: 'run' })
    expect(history[1].role).toBe('toolResult')
    expect(history[1].content[0]).toMatchObject({ type: 'toolResult', toolCallId: 't1' })

    const spawn = await api.sessions.spawnSubAgent({
      task: 'do it',
      agentId: 'coder',
      timeoutSeconds: 60,
      model: 'm',
      cleanup: 'keep',
    })
    expect(spawn).toEqual({ sessionKey: 'sk', runId: 'rid', status: 'accepted' })
    expect(calls.find((c) => c.cmd === 'spawn_subagent')?.args).toMatchObject({
      params: {
        task: 'do it',
        agent_id: 'coder',
        timeout_seconds: 60,
        model: 'm',
        cleanup: 'keep',
      },
    })
  })

  it('settings/system/files APIs map fields and call expected commands', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'get_settings') {
        return {
          gateway: { url: 'ws://x', token: 't', agent_id: 'main', canvas_port: 18793 },
          default_agent: 'main',
          theme: 'dark',
          window: { width: 1000, height: 800, x: null, y: 10, maximized: false },
          canvas: { enabled: true, port: 18793 },
        }
      }
      if (cmd === 'check_update') {
        return { available: true, version: '1.1.0', release_notes: 'notes', release_date: '2026-01-01' }
      }
      if (
        cmd === 'open_external' ||
        cmd === 'install_update' ||
        cmd === 'read_file' ||
        cmd === 'read_image' ||
        cmd === 'watch_directory' ||
        cmd === 'unwatch_directory'
      ) {
        if (cmd === 'read_file') return 'abc'
        if (cmd === 'read_image') return { data: [1], width: 1, height: 1, mimeType: 'image/png' }
        return null
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const settings = await api.settings.get()
    expect(settings).toMatchObject({
      defaultAgent: 'main',
      gateway: { agentId: 'main', canvasPort: 18793 },
      window: { x: undefined, y: 10 },
      canvas: { enabled: true, port: 18793 },
    })

    const update = await api.system.checkUpdate()
    expect(update).toMatchObject({
      available: true,
      version: '1.1.0',
      releaseNotes: 'notes',
      releaseDate: '2026-01-01',
    })

    await api.system.openExternal('https://example.com')
    await api.system.installUpdate()
    await api.files.readText('main', '/a.txt')
    await api.files.readImage('main', '/a.png')
    await api.files.watch('main', '/tmp')
    await api.files.unwatch('main', '/tmp')

    expect(calls.some((c) => c.cmd === 'open_external')).toBe(true)
    expect(calls.some((c) => c.cmd === 'install_update')).toBe(true)
    expect(calls.some((c) => c.cmd === 'watch_directory')).toBe(true)
    expect(calls.some((c) => c.cmd === 'unwatch_directory')).toBe(true)
  })

  it('events.onGateway and onSubAgent receive payload', async () => {
    mockIPC(() => null, { shouldMockEvents: true })

    const onGateway = vi.fn()
    const onSubAgent = vi.fn()
    const unlistenGateway = await api.events.onGateway(onGateway)
    const unlistenSubAgent = await api.events.onSubAgent(onSubAgent)

    await emit('gateway', { type: 'connected', payload: { protocol: 3, policy: { tickIntervalMs: 1000 } } })
    await emit('subagent', { runId: 'r1', status: 'completed' })

    expect(onGateway).toHaveBeenCalled()
    expect(onSubAgent).toHaveBeenCalledWith({ runId: 'r1', status: 'completed' })

    await unlistenGateway()
    await unlistenSubAgent()
  })
})
