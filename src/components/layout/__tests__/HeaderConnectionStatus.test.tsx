import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Header } from '../Header'
import { useGatewayStore } from '../../../stores/gatewayStore'

describe('Header - connection status', () => {
  beforeEach(() => {
    useGatewayStore.setState({
      profiles: [],
      activeProfileId: null,
      connections: new Map(),
      isLoading: false,
      error: null,
      unlisteners: []
    })
  })

  it('shows disconnected when no gateway is connected', () => {
    render(<Header />)
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument()
  })

  it('shows connected when active profile is connected', () => {
    render(<Header />)

    act(() => {
      useGatewayStore.setState({
        profiles: [
          {
            id: 'p1',
            name: 'Local Gateway',
            url: 'ws://127.0.0.1:18789',
            token: '',
            canvasPort: 18793,
            isDefault: true
          }
        ],
        activeProfileId: 'p1',
        connections: new Map([
          [
            'p1',
            {
              profileId: 'p1',
              status: 'connected',
              url: 'ws://127.0.0.1:18789'
            }
          ]
        ])
      })
    })

    expect(screen.getByText(/Connected/)).toBeInTheDocument()
    expect(screen.getByText(/Local Gateway/)).toBeInTheDocument()
  })
})

