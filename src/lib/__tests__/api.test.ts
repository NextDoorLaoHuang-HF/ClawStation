import { describe, it, expect } from 'vitest'
import * as api from '../api'

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
