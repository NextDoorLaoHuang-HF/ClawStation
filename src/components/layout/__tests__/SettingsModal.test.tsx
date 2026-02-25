import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { Sidebar } from '../Sidebar'
import { SettingsModal } from '../../settings/SettingsModal'
import { useUIStore } from '../../../stores/uiStore'

describe('SettingsModal', () => {
  beforeEach(() => {
    clearMocks()
    useUIStore.setState({ isSettingsOpen: false, settingsTab: 'gateway' })
  })

  afterEach(() => {
    clearMocks()
  })

  it('opens from sidebar and switches tabs', async () => {
    mockIPC((cmd) => {
      if (cmd === 'list_plugins') return []
      throw new Error(`Unexpected command: ${cmd}`)
    })

    render(
      <div>
        <Sidebar />
        <SettingsModal />
      </div>
    )

    fireEvent.click(screen.getByText('Settings'))
    expect(screen.getByText('Gateway Settings')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Plugins'))
    expect(screen.getByText('Plugin Settings')).toBeInTheDocument()

    // Ensure PluginSettings effects flush without act warnings.
    expect(await screen.findByText('暂无已安装插件')).toBeInTheDocument()
  })

  it('closes via escape and backdrop', () => {
    render(
      <div>
        <Sidebar />
        <SettingsModal />
      </div>
    )

    fireEvent.click(screen.getByText('Settings'))
    expect(screen.getByText('Gateway Settings')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Gateway Settings')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Settings'))
    expect(screen.getByText('Gateway Settings')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close settings'))
    expect(screen.queryByText('Gateway Settings')).not.toBeInTheDocument()
  })
})
