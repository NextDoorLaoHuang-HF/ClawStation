import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { PluginSettings } from '../PluginSettings'

describe('PluginSettings', () => {
  beforeEach(() => {
    clearMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearMocks()
  })

  it('shows validation error when installing with empty source', async () => {
    const calls: string[] = []

    mockIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'list_plugins') return []
      return null
    })

    render(<PluginSettings />)

    expect(await screen.findByText('暂无已安装插件')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '安装' }))
    expect(await screen.findByText('请输入插件源路径或 URL')).toBeInTheDocument()
    expect(calls).not.toContain('install_plugin')
  })

  it('installs plugin and can toggle, reload and uninstall', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))

    const calls: Array<{ cmd: string; args: unknown }> = []
    let listCount = 0

    const pluginsAfter = [
      {
        id: 'p1',
        name: 'Alpha',
        version: '1.0.0',
        description: 'A',
        author: 'Me',
        enabled: false,
        loaded: false,
        path: '/tmp/a'
      },
      {
        id: 'p2',
        name: 'Beta',
        version: '2.0.0',
        description: 'B',
        author: 'You',
        enabled: true,
        loaded: true,
        path: '/tmp/b'
      }
    ]

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'list_plugins') {
        listCount += 1
        return listCount === 1 ? [] : pluginsAfter
      }
      if (cmd === 'install_plugin') return null
      if (cmd === 'enable_plugin') return null
      if (cmd === 'disable_plugin') return null
      if (cmd === 'reload_plugin') return null
      if (cmd === 'uninstall_plugin') return null
      return null
    })

    render(<PluginSettings />)

    expect(await screen.findByText('暂无已安装插件')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('输入本地路径或远程 URL...'), { target: { value: '/plugins/demo' } })
    fireEvent.click(screen.getByRole('button', { name: '安装' }))

    expect(await screen.findByText('插件安装成功')).toBeInTheDocument()
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(await screen.findByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('已加载')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('启用'))
    await waitFor(() => expect(calls.some((c) => c.cmd === 'enable_plugin')).toBe(true))

    fireEvent.click(screen.getByTitle('禁用'))
    await waitFor(() => expect(calls.some((c) => c.cmd === 'disable_plugin')).toBe(true))

    fireEvent.click(screen.getAllByTitle('重新加载')[0])
    await waitFor(() => expect(calls.some((c) => c.cmd === 'reload_plugin')).toBe(true))

    fireEvent.click(screen.getAllByTitle('卸载')[0])
    await waitFor(() => expect(calls.some((c) => c.cmd === 'uninstall_plugin')).toBe(true))

    const installCall = calls.find((c) => c.cmd === 'install_plugin')
    expect(installCall?.args).toMatchObject({ source: '/plugins/demo' })
  })

  it('does not uninstall when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))

    const calls: string[] = []
    mockIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'list_plugins') {
        return [
          {
            id: 'p1',
            name: 'Alpha',
            version: '1.0.0',
            description: 'A',
            author: 'Me',
            enabled: false,
            loaded: false,
            path: '/tmp/a'
          }
        ]
      }
      if (cmd === 'uninstall_plugin') return null
      return null
    })

    render(<PluginSettings />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('卸载'))

    expect(calls).not.toContain('uninstall_plugin')
  })
})
