import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ isSettingsOpen: false, settingsTab: 'gateway' })
  })

  it('opens settings with default tab', () => {
    useUIStore.getState().openSettings()
    expect(useUIStore.getState().isSettingsOpen).toBe(true)
    expect(useUIStore.getState().settingsTab).toBe('gateway')
  })

  it('opens settings with explicit tab and updates tab', () => {
    useUIStore.getState().openSettings('plugins')
    expect(useUIStore.getState().settingsTab).toBe('plugins')

    useUIStore.getState().setSettingsTab('gateway')
    expect(useUIStore.getState().settingsTab).toBe('gateway')
  })

  it('closes settings', () => {
    useUIStore.setState({ isSettingsOpen: true, settingsTab: 'plugins' })
    useUIStore.getState().closeSettings()
    expect(useUIStore.getState().isSettingsOpen).toBe(false)
    expect(useUIStore.getState().settingsTab).toBe('plugins')
  })
})
