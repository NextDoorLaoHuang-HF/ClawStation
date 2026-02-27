import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatPanel } from '../ChatPanel'
import { useSessionStore } from '../../../stores/sessionStore'

vi.mock('../MessageList', () => ({
  MessageList: () => <div>Mock MessageList</div>,
}))
vi.mock('../../canvas/CanvasPanel', () => ({
  CanvasPanel: () => <div>Mock CanvasPanel</div>,
}))
vi.mock('../../files/FileBrowser', () => ({
  FileBrowser: () => <div>Mock FileBrowser</div>,
}))

describe('ChatPanel', () => {
  beforeEach(() => {
    useSessionStore.setState({
      activeSessionKey: null,
      sessions: [],
    })
  })

  it('renders chat panel by default without active session header', () => {
    render(<ChatPanel />)
    expect(screen.getByText('Mock MessageList')).toBeInTheDocument()
    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument()
  })

  it('renders canvas panel when session key contains canvas', () => {
    useSessionStore.setState({
      activeSessionKey: 'agent:main:canvas:1',
      sessions: [
        {
          key: 'agent:main:canvas:1',
          agentId: 'main',
          displayName: 'Canvas Work',
          model: 'm',
          totalTokens: 1234,
          contextTokens: 256,
          updatedAt: Date.now(),
          kind: 'main',
        },
      ],
    })

    render(<ChatPanel />)
    expect(screen.getByText('Mock CanvasPanel')).toBeInTheDocument()
    expect(screen.getByText('Canvas Work')).toBeInTheDocument()
    expect(screen.getByText(/1,234 tokens/)).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('renders file browser when session key contains files', () => {
    useSessionStore.setState({
      activeSessionKey: 'agent:main:files:1',
      sessions: [
        {
          key: 'agent:main:files:1',
          agentId: 'main',
          displayName: 'Files',
          model: 'm',
          totalTokens: 10,
          contextTokens: 10,
          updatedAt: Date.now(),
          kind: 'dm',
          channel: 'qq',
        },
      ],
    })

    render(<ChatPanel />)
    expect(screen.getByText('Mock FileBrowser')).toBeInTheDocument()
    expect(screen.getByText('dm')).toBeInTheDocument()
  })
})
