import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SessionTabs } from '../SessionTabs'
import { useSessionStore } from '../../../stores/sessionStore'
import { useAgentStore } from '../../../stores/agentStore'

describe('SessionTabs', () => {
  beforeEach(() => {
    useAgentStore.setState({
      currentAgentId: 'codex',
    })
    useSessionStore.setState({
      sessions: [],
      activeSessionKey: null,
      setActiveSession: vi.fn(),
      createSession: vi.fn(async () => 'new-key'),
    })
  })

  it('renders tabs and switches active session on click', () => {
    const setActiveSession = vi.fn()
    useSessionStore.setState({
      sessions: [
        {
          key: 's1',
          agentId: 'main',
          displayName: 'Chat',
          model: 'm',
          totalTokens: 1,
          contextTokens: 1,
          updatedAt: 1,
          kind: 'main',
        },
        {
          key: 's2',
          agentId: 'main',
          displayName: 'Files',
          model: 'm',
          totalTokens: 1,
          contextTokens: 1,
          updatedAt: 2,
          kind: 'files' as unknown as 'main',
        },
      ],
      activeSessionKey: 's1',
      setActiveSession,
    })

    render(<SessionTabs />)
    fireEvent.click(screen.getByText('Files'))
    expect(setActiveSession).toHaveBeenCalledWith('s2')
  })

  it('creates new session for current agent', async () => {
    const createSession = vi.fn(async () => 'new-key')
    useSessionStore.setState({ createSession })

    render(<SessionTabs />)
    fireEvent.click(screen.getByTitle('New session'))
    await waitFor(() => expect(createSession).toHaveBeenCalledWith('codex'))
  })

  it('logs error when creating session fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const createSession = vi.fn(async () => {
      throw new Error('create failed')
    })
    useSessionStore.setState({ createSession })

    render(<SessionTabs />)
    fireEvent.click(screen.getByTitle('New session'))
    await waitFor(() => expect(createSession).toHaveBeenCalled())
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
