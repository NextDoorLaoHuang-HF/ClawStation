import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentConfig, AgentInfo } from '../../types'

type ApiMocks = {
  switchMock: ReturnType<typeof vi.fn<(id: string) => Promise<{ previousAgentId: string; currentAgentId: string }>>>
  listMock: ReturnType<typeof vi.fn<() => Promise<AgentInfo[]>>>
  getConfigMock: ReturnType<typeof vi.fn<(id: string) => Promise<AgentConfig>>>
}

async function loadStore(isTauri: boolean, apiMocks?: Partial<ApiMocks>) {
  vi.resetModules()

  const switchMock =
    apiMocks?.switchMock ??
    vi.fn<(id: string) => Promise<{ previousAgentId: string; currentAgentId: string }>>(async (id) => ({
      previousAgentId: 'main',
      currentAgentId: id,
    }))
  const listMock =
    apiMocks?.listMock ??
    vi.fn<() => Promise<AgentInfo[]>>(async () => [
      { id: 'main', name: 'Main', emoji: '🤖', model: 'm', available: true, subagents: [] },
      { id: 'codex', name: 'Codex', emoji: '🛠️', model: 'm2', available: true, subagents: ['worker'] },
    ])
  const getConfigMock =
    apiMocks?.getConfigMock ??
    vi.fn<(id: string) => Promise<AgentConfig>>(async (id) => ({
      id,
      model: 'claude',
      identity: { name: id, emoji: '🤖' },
      tools: ['read_file'],
    }))

  vi.doMock('../../lib/api', () => ({
    isTauriRuntime: () => isTauri,
    agents: {
      switch: switchMock,
      list: listMock,
      getConfig: getConfigMock,
    },
  }))

  const mod = await import('../agentStore')
  return {
    useAgentStore: mod.useAgentStore,
    mocks: { switchMock, listMock, getConfigMock },
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('agentStore (mock runtime)', () => {
  it('initializes with mock data and supports local actions', async () => {
    vi.useFakeTimers()
    const { useAgentStore } = await loadStore(false)

    const state = useAgentStore.getState()
    expect(state.agents.length).toBeGreaterThan(0)
    expect(state.currentAgentId).toBe('main')
    expect(state.getCurrentAgent()?.id).toBe('main')
    expect(state.getCurrentConfig()?.id).toBe('main')

    const switchPromise = useAgentStore.getState().setCurrentAgent('laoh')
    await vi.runAllTimersAsync()
    await switchPromise

    expect(useAgentStore.getState().currentAgentId).toBe('laoh')
    expect(useAgentStore.getState().isLoading).toBe(false)

    const loadAgentsPromise = useAgentStore.getState().loadAgents()
    await vi.runAllTimersAsync()
    await loadAgentsPromise
    expect(useAgentStore.getState().isLoading).toBe(false)

    const loadConfigPromise = useAgentStore.getState().loadAgentConfig('main')
    await vi.runAllTimersAsync()
    await loadConfigPromise
    expect(useAgentStore.getState().agentConfigs.main?.id).toBe('main')

    useAgentStore.setState({ error: 'boom' })
    useAgentStore.getState().clearError()
    expect(useAgentStore.getState().error).toBeNull()
  })
})

describe('agentStore (tauri runtime)', () => {
  it('loads/switches/configures agent via tauri api', async () => {
    const { useAgentStore, mocks } = await loadStore(true)

    expect(useAgentStore.getState().agents).toEqual([])
    expect(useAgentStore.getState().agentConfigs).toEqual({})

    await useAgentStore.getState().loadAgents()
    expect(mocks.listMock).toHaveBeenCalled()
    expect(useAgentStore.getState().agents).toHaveLength(2)

    await useAgentStore.getState().setCurrentAgent('codex')
    expect(mocks.switchMock).toHaveBeenCalledWith('codex')
    expect(useAgentStore.getState().currentAgentId).toBe('codex')

    await useAgentStore.getState().loadAgentConfig('codex')
    expect(mocks.getConfigMock).toHaveBeenCalledWith('codex')
    expect(useAgentStore.getState().agentConfigs.codex?.id).toBe('codex')
    expect(useAgentStore.getState().getCurrentConfig()?.id).toBe('codex')
  })

  it('captures errors from tauri api operations', async () => {
    const switchMock = vi.fn<(id: string) => Promise<{ previousAgentId: string; currentAgentId: string }>>(
      async () => {
        throw new Error('switch failed')
      }
    )
    const listMock = vi.fn<() => Promise<AgentInfo[]>>(async () => {
      throw new Error('list failed')
    })
    const getConfigMock = vi.fn<(id: string) => Promise<AgentConfig>>(async () => {
      throw new Error('config failed')
    })

    const { useAgentStore } = await loadStore(true, { switchMock, listMock, getConfigMock })

    await useAgentStore.getState().setCurrentAgent('bad')
    expect(useAgentStore.getState().error).toContain('switch failed')

    await useAgentStore.getState().loadAgents()
    expect(useAgentStore.getState().error).toContain('list failed')

    await useAgentStore.getState().loadAgentConfig('bad')
    expect(useAgentStore.getState().error).toContain('config failed')
  })
})
