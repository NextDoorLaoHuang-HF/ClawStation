import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { emit } from '@tauri-apps/api/event'
import { useGatewayStore } from '../gatewayStore'

afterEach(() => {
  clearMocks()
})

describe('GatewayStore', () => {
  beforeEach(() => {
    useGatewayStore.setState({
      profiles: [],
      activeProfileId: null,
      connections: new Map(),
      isLoading: false,
      error: null,
      unlisteners: []
    })
  })

  it('loadProfiles maps profiles and selects default profile as active', async () => {
    mockIPC((cmd) => {
      if (cmd === 'list_gateway_profiles') {
        return [
          { id: 'p1', name: 'A', url: 'ws://a', token: null, canvas_port: 18793, is_default: false },
          { id: 'p2', name: 'B', url: 'ws://b', token: 't', canvas_port: 19000, is_default: true }
        ]
      }
      return null
    })

    const store = useGatewayStore.getState()
    const promise = store.loadProfiles()
    expect(useGatewayStore.getState().isLoading).toBe(true)
    await promise

    const state = useGatewayStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.profiles).toHaveLength(2)
    expect(state.profiles[0]).toMatchObject({ id: 'p1', canvasPort: 18793, isDefault: false })
    expect(state.profiles[1]).toMatchObject({ id: 'p2', canvasPort: 19000, isDefault: true })
    expect(state.activeProfileId).toBe('p2')
  })

  it('addProfile converts to snake_case, appends to profiles, and returns mapped profile', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'add_gateway_profile') {
        return {
          id: 'p3',
          name: 'New',
          url: 'ws://new',
          token: null,
          canvas_port: 18888,
          is_default: false
        }
      }
      return null
    })

    const store = useGatewayStore.getState()
    const promise = store.addProfile({ name: 'New', url: 'ws://new', token: undefined, canvasPort: 18888, isDefault: false })
    expect(useGatewayStore.getState().isLoading).toBe(true)
    const created = await promise

    expect(created).toMatchObject({ id: 'p3', name: 'New', url: 'ws://new', canvasPort: 18888 })
    expect(useGatewayStore.getState().profiles.map((p) => p.id)).toEqual(['p3'])
    expect(useGatewayStore.getState().isLoading).toBe(false)

    expect(calls[0]?.cmd).toBe('add_gateway_profile')
    expect(calls[0]?.args).toMatchObject({
      profile: {
        id: '',
        name: 'New',
        url: 'ws://new',
        token: null,
        canvas_port: 18888,
        is_default: false
      }
    })
  })

  it('updateProfile calls backend and updates stored profile', async () => {
    useGatewayStore.setState({
      profiles: [{ id: 'p1', name: 'A', url: 'ws://a', token: undefined, canvasPort: 18793, isDefault: false }]
    })

    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'update_gateway_profile') return null
      return null
    })

    const store = useGatewayStore.getState()
    await store.updateProfile({ id: 'p1', name: 'A2', url: 'ws://a', token: 'tok', canvasPort: 20000, isDefault: true })

    expect(useGatewayStore.getState().profiles[0]).toMatchObject({
      id: 'p1',
      name: 'A2',
      token: 'tok',
      canvasPort: 20000,
      isDefault: true
    })

    expect(calls[0]?.cmd).toBe('update_gateway_profile')
    expect(calls[0]?.args).toMatchObject({
      profile: {
        id: 'p1',
        name: 'A2',
        url: 'ws://a',
        token: 'tok',
        canvas_port: 20000,
        is_default: true
      }
    })
  })

  it('removeProfile invokes backend, disconnects if connected, and updates activeProfileId', async () => {
    useGatewayStore.setState({
      profiles: [
        { id: 'p1', name: 'A', url: 'ws://a', token: undefined, canvasPort: 18793, isDefault: false },
        { id: 'p2', name: 'B', url: 'ws://b', token: undefined, canvasPort: 18793, isDefault: false }
      ],
      activeProfileId: 'p1',
      connections: new Map([
        ['p1', { profileId: 'p1', status: 'connected', url: 'ws://a' }]
      ])
    })

    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'remove_gateway_profile') return null
      if (cmd === 'disconnect') return null
      return null
    })

    const store = useGatewayStore.getState()
    await store.removeProfile('p1')

    const state = useGatewayStore.getState()
    expect(state.profiles.map((p) => p.id)).toEqual(['p2'])
    expect(state.connections.has('p1')).toBe(false)
    expect(state.activeProfileId).toBe('p2')

    expect(calls.map((c) => c.cmd)).toContain('remove_gateway_profile')
    expect(calls.map((c) => c.cmd)).toContain('disconnect')
  })

  it('connect updates status and sets error on failure', async () => {
    useGatewayStore.setState({
      profiles: [{ id: 'p1', name: 'A', url: 'ws://a', token: undefined, canvasPort: 18793, isDefault: false }]
    })

    mockIPC((cmd) => {
      if (cmd === 'connect') throw new Error('boom')
      return null
    })

    const store = useGatewayStore.getState()
    const promise = store.connect('p1')

    expect(useGatewayStore.getState().connections.get('p1')?.status).toBe('connecting')

    await expect(promise).rejects.toThrow('boom')

    const state = useGatewayStore.getState()
    expect(state.connections.get('p1')?.status).toBe('error')
    expect(state.error).toContain('boom')
  })

  it('disconnectAll invokes disconnect per connection and clears state', async () => {
    useGatewayStore.setState({
      activeProfileId: 'p1',
      connections: new Map([
        ['p1', { profileId: 'p1', status: 'connected' }],
        ['p2', { profileId: 'p2', status: 'connected' }]
      ])
    })

    const calls: Array<{ cmd: string; args: unknown }> = []
    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'disconnect') return null
      return null
    })

    const store = useGatewayStore.getState()
    await store.disconnectAll()

    expect(calls.filter((c) => c.cmd === 'disconnect')).toHaveLength(2)
    expect(useGatewayStore.getState().connections.size).toBe(0)
    expect(useGatewayStore.getState().activeProfileId).toBeNull()
  })

  it('initializeEvents listens to gateway events and updates connection state', async () => {
    const oldUnlisten = vi.fn()
    useGatewayStore.setState({
      activeProfileId: 'p1',
      connections: new Map([
        ['p1', { profileId: 'p1', status: 'connected', url: 'ws://a' }]
      ]),
      unlisteners: [oldUnlisten]
    })

    mockIPC(() => null, { shouldMockEvents: true })

    const store = useGatewayStore.getState()
    await store.initializeEvents()

    expect(oldUnlisten).toHaveBeenCalled()
    expect(useGatewayStore.getState().unlisteners).toHaveLength(1)

    await emit('gateway', { type: 'disconnected', payload: { reason: 'bye' } })
    expect(useGatewayStore.getState().connections.get('p1')).toMatchObject({
      profileId: 'p1',
      status: 'disconnected',
      url: 'ws://a'
    })

    await emit('gateway', { type: 'error', payload: { message: 'oops' } })
    expect(useGatewayStore.getState().connections.get('p1')).toMatchObject({
      profileId: 'p1',
      status: 'error',
      error: 'oops'
    })

    await emit('gateway', { type: 'connected', payload: { protocol: 7, policy: { tickIntervalMs: 1000 } } })
    expect(useGatewayStore.getState().connections.get('p1')).toMatchObject({
      profileId: 'p1',
      status: 'connected',
      protocol: 7
    })
  })

  it('cleanup calls unlisteners and clears them', () => {
    const unlistenA = vi.fn()
    const unlistenB = vi.fn()
    useGatewayStore.setState({ unlisteners: [unlistenA, unlistenB] })

    useGatewayStore.getState().cleanup()

    expect(unlistenA).toHaveBeenCalled()
    expect(unlistenB).toHaveBeenCalled()
    expect(useGatewayStore.getState().unlisteners).toEqual([])
  })
})
