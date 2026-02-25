import { describe, it, expect, afterEach, vi } from 'vitest'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { emit } from '@tauri-apps/api/event'
import * as api from '../api'

afterEach(() => {
  // Ensure tauri mocks don't leak into tests that rely on non-Tauri branches.
  clearMocks()
  delete (globalThis as unknown as { isTauri?: unknown }).isTauri
  vi.unstubAllGlobals()
})

describe('API - Events', () => {
  it('should return unlisten function for onGateway', async () => {
    const unlisten = await api.events.onGateway(() => {})
    expect(typeof unlisten).toBe('function')
  })

  it('should return unlisten function for onAgent', async () => {
    const unlisten = await api.events.onAgent(() => {})
    expect(typeof unlisten).toBe('function')
  })

  it('should return unlisten function for onSubAgent', async () => {
    const unlisten = await api.events.onSubAgent(() => {})
    expect(typeof unlisten).toBe('function')
  })

  it('should return unlisten function for onFileWatch', async () => {
    const unlisten = await api.events.onFileWatch(() => {})
    expect(typeof unlisten).toBe('function')
  })

  it('should return unlisten function for onUpdate', async () => {
    const unlisten = await api.events.onUpdate(() => {})
    expect(typeof unlisten).toBe('function')
  })

  it('onFileWatch should map is_dir -> isDir (and default false)', async () => {
    mockIPC(() => null, { shouldMockEvents: true })

    const handler = vi.fn()
    const unlisten = await api.events.onFileWatch(handler)

    await emit('file-watch', { type: 'created', path: '/tmp/a', is_dir: true })
    await emit('file-watch', { type: 'modified', path: '/tmp/b' })

    expect(handler).toHaveBeenCalledWith({ type: 'created', path: '/tmp/a', isDir: true })
    expect(handler).toHaveBeenCalledWith({ type: 'modified', path: '/tmp/b', isDir: false })

    await unlisten()
  })

  it('onUpdate should listen and receive emitted events in Tauri runtime', async () => {
    mockIPC(() => null, { shouldMockEvents: true })

    const handler = vi.fn()
    const unlisten = await api.events.onUpdate(handler)

    await emit('update', { type: 'downloaded' })
    expect(handler).toHaveBeenCalledWith({ type: 'downloaded' })

    await unlisten()
  })
})

describe('API - Error Handling', () => {
  it('should create ApiError with command', () => {
    const error = new api.ApiError('Something failed', 'test_command')
    
    expect(error.message).toBe('Something failed')
    expect(error.name).toBe('ApiError')
    expect(error.command).toBe('test_command')
  })

  it('should create ApiError without command', () => {
    const error = new api.ApiError('Something failed')
    
    expect(error.message).toBe('Something failed')
    expect(error.name).toBe('ApiError')
    expect(error.command).toBeUndefined()
  })

  it('should have correct prototype chain', () => {
    const error = new api.ApiError('Test error')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(api.ApiError)
  })

  it('safeInvoke should wrap errors into ApiError with command', async () => {
    await expect(api.safeInvoke('get_app_info')).rejects.toBeInstanceOf(api.ApiError)
    try {
      await api.safeInvoke('get_app_info')
    } catch (e) {
      expect((e as api.ApiError).command).toBe('get_app_info')
    }
  })
})

describe('API - Module Structure', () => {
  it('should export gateway methods', () => {
    expect(typeof api.gateway.connect).toBe('function')
    expect(typeof api.gateway.disconnect).toBe('function')
    expect(typeof api.gateway.getStatus).toBe('function')
  })

  it('should export sessions methods', () => {
    expect(typeof api.sessions.list).toBe('function')
    expect(typeof api.sessions.create).toBe('function')
    expect(typeof api.sessions.send).toBe('function')
    expect(typeof api.sessions.abort).toBe('function')
    expect(typeof api.sessions.getHistory).toBe('function')
  })

  it('should export agents methods', () => {
    expect(typeof api.agents.list).toBe('function')
    expect(typeof api.agents.getConfig).toBe('function')
    expect(typeof api.agents.switch).toBe('function')
  })

  it('should export canvas methods', () => {
    expect(typeof api.canvas.present).toBe('function')
    expect(typeof api.canvas.navigate).toBe('function')
    expect(typeof api.canvas.eval).toBe('function')
    expect(typeof api.canvas.snapshot).toBe('function')
  })

  it('should export files methods', () => {
    expect(typeof api.files.list).toBe('function')
    expect(typeof api.files.readText).toBe('function')
    expect(typeof api.files.readImage).toBe('function')
    expect(typeof api.files.watch).toBe('function')
  })

  it('should export plugins methods', () => {
    expect(typeof api.plugins.list).toBe('function')
    expect(typeof api.plugins.install).toBe('function')
    expect(typeof api.plugins.enable).toBe('function')
    expect(typeof api.plugins.disable).toBe('function')
  })
})

describe('API - Runtime + Mapping', () => {
  it('isTauriRuntime should prefer global isTauri flag when present', () => {
    ;(globalThis as unknown as { isTauri?: unknown }).isTauri = true
    expect(api.isTauriRuntime()).toBe(true)
  })

  it('system.getInfo maps snake_case keys and arch', async () => {
    mockIPC((cmd) => {
      if (cmd === 'get_app_info') {
        return { name: 'app', version: '1', tauri_version: '2', platform: 'linux', arch: 'x86_64' }
      }
      throw new Error(`Unexpected command: ${cmd}`)
    })

    const info = await api.system.getInfo()
    expect(info).toMatchObject({ name: 'app', version: '1', tauriVersion: '2', platform: 'linux', arch: 'x64' })
  })

  it('plugins.getContributions invokes get_plugin_contributions', async () => {
    const calls: string[] = []
    mockIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'get_plugin_contributions') return null
      throw new Error(`Unexpected command: ${cmd}`)
    })

    await api.plugins.getContributions('p1')
    expect(calls).toEqual(['get_plugin_contributions'])
  })
})
