import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SessionList } from '../SessionList'
import { useSessionStore } from '../../../stores/sessionStore'

describe('SessionList', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      activeSessionKey: null,
      setActiveSession: vi.fn(),
      loadSessions: vi.fn(async () => {}),
    })
  })

  it('shows empty state when no sessions', () => {
    render(<SessionList />)
    expect(screen.getByText('No sessions yet')).toBeInTheDocument()
  })

  it('sorts sessions by updatedAt desc and switches session on click', () => {
    const setActiveSession = vi.fn()
    const now = Date.now()
    useSessionStore.setState({
      sessions: [
        {
          key: 'older',
          agentId: 'main',
          displayName: 'Older',
          model: 'm',
          totalTokens: 1,
          contextTokens: 1,
          updatedAt: now - 60_000,
          kind: 'main',
        },
        {
          key: 'newer',
          agentId: 'main',
          displayName: 'Newer',
          model: 'm',
          totalTokens: 2,
          contextTokens: 2,
          updatedAt: now,
          kind: 'dm',
          channel: 'qq',
        },
      ],
      activeSessionKey: 'newer',
      setActiveSession,
    })

    render(<SessionList />)
    const labels = screen.getAllByText(/Older|Newer/).map((el) => el.textContent)
    expect(labels[0]).toBe('Newer')
    expect(labels[1]).toBe('Older')

    fireEvent.click(screen.getByText('Older'))
    expect(setActiveSession).toHaveBeenCalledWith('older')
  })

  it('refresh button triggers loadSessions', () => {
    const loadSessions = vi.fn(async () => {})
    useSessionStore.setState({
      sessions: [
        {
          key: 's1',
          agentId: 'main',
          displayName: 'Main',
          model: 'm',
          totalTokens: 1,
          contextTokens: 1,
          updatedAt: Date.now(),
          kind: 'main',
        },
      ],
      loadSessions,
    })

    render(<SessionList />)
    fireEvent.click(screen.getByTitle('Refresh'))
    expect(loadSessions).toHaveBeenCalled()
  })
})
