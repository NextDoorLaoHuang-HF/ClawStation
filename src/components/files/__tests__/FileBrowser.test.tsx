import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { FileBrowser } from '../FileBrowser'
import { useAgentStore } from '../../../stores/agentStore'

describe('FileBrowser', () => {
  beforeEach(() => {
    clearMocks()
    useAgentStore.setState({ currentAgentId: 'main' })
  })

  afterEach(() => {
    clearMocks()
    vi.unstubAllGlobals()
  })

  it('loads directories, navigates into folder, goes up and refreshes', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []

    mockIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd !== 'list_workspace') return null
      const path = (args as { path?: string })?.path ?? ''
      if (path === '') {
        return [
          { name: 'docs', path: 'docs', is_dir: true },
          { name: 'README.md', path: 'README.md', is_dir: false, size: 32 },
        ]
      }
      if (path === 'docs') {
        return [{ name: 'notes.txt', path: 'docs/notes.txt', is_dir: false, size: 16 }]
      }
      return []
    })

    render(<FileBrowser />)
    expect(await screen.findByText('docs')).toBeInTheDocument()
    expect(screen.getByText('README.md')).toBeInTheDocument()

    fireEvent.click(screen.getByText('docs'))
    expect(await screen.findByText('notes.txt')).toBeInTheDocument()
    expect(screen.getByText('..')).toBeInTheDocument()

    fireEvent.click(screen.getByText('..'))
    expect(await screen.findByText('README.md')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Refresh'))
    await waitFor(() => {
      expect(calls.filter((c) => c.cmd === 'list_workspace').length).toBeGreaterThan(2)
    })
  })

  it('previews text/image files and handles preview errors', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockIPC((cmd, args) => {
      if (cmd === 'list_workspace') {
        return [
          { name: 'a.txt', path: 'a.txt', is_dir: false, size: 8 },
          { name: 'pic.png', path: 'pic.png', is_dir: false, size: 4 },
          { name: 'bad.txt', path: 'bad.txt', is_dir: false, size: 3 },
        ]
      }
      if (cmd === 'read_file') {
        const path = (args as { path?: string })?.path
        if (path === 'bad.txt') throw new Error('cannot read file')
        return 'hello file'
      }
      if (cmd === 'read_image') {
        return { data: [1, 2, 3], width: 1, height: 1, mimeType: 'image/png' }
      }
      return null
    })

    render(<FileBrowser />)
    expect(await screen.findByText('a.txt')).toBeInTheDocument()

    fireEvent.click(screen.getByText('a.txt'))
    expect(await screen.findByText('hello file')).toBeInTheDocument()

    fireEvent.click(screen.getByText('pic.png'))
    expect(await screen.findByAltText('pic.png')).toBeInTheDocument()

    fireEvent.click(screen.getByText('bad.txt'))
    expect(await screen.findByText(/Error loading preview:/)).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Close preview'))
    await waitFor(() => {
      expect(screen.queryByTitle('Close preview')).not.toBeInTheDocument()
    })

    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('shows error when listing directory fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockIPC((cmd) => {
      if (cmd === 'list_workspace') throw new Error('list failed')
      return null
    })

    render(<FileBrowser />)
    expect(await screen.findByText(/list failed/)).toBeInTheDocument()
  })
})
