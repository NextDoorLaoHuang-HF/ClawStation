import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GatewaySettings } from '../GatewaySettings'
import { useGatewayStore } from '../../../stores/gatewayStore'
import type { GatewayProfile } from '../../../types/gateway'

describe('GatewaySettings', () => {
  let loadProfiles: ReturnType<typeof vi.fn<() => Promise<void>>>
  let addProfile: ReturnType<typeof vi.fn<(profile: Omit<GatewayProfile, 'id'>) => Promise<GatewayProfile>>>
  let updateProfile: ReturnType<typeof vi.fn<(profile: GatewayProfile) => Promise<void>>>
  let removeProfile: ReturnType<typeof vi.fn<(id: string) => Promise<void>>>
  let setDefault: ReturnType<typeof vi.fn<(id: string) => Promise<void>>>
  let connect: ReturnType<typeof vi.fn<(profileId: string) => Promise<void>>>
  let disconnect: ReturnType<typeof vi.fn<(profileId?: string) => Promise<void>>>

  beforeEach(() => {
    loadProfiles = vi.fn<() => Promise<void>>(async () => {})
    addProfile = vi.fn<(profile: Omit<GatewayProfile, 'id'>) => Promise<GatewayProfile>>(async () => ({
      id: 'p1',
      name: 'Local',
      url: 'ws://127.0.0.1:18789',
      token: undefined,
      canvasPort: 18793,
      isDefault: true
    }))
    updateProfile = vi.fn<(profile: GatewayProfile) => Promise<void>>(async () => {})
    removeProfile = vi.fn<(id: string) => Promise<void>>(async () => {})
    setDefault = vi.fn<(id: string) => Promise<void>>(async () => {})
    connect = vi.fn<(profileId: string) => Promise<void>>(async () => {})
    disconnect = vi.fn<(profileId?: string) => Promise<void>>(async () => {})

    useGatewayStore.setState({
      profiles: [],
      connections: new Map(),
      activeProfileId: null,
      isLoading: false,
      error: null,
      loadProfiles,
      addProfile,
      updateProfile,
      removeProfile,
      setDefault,
      connect,
      disconnect
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders empty state and can add a new profile', async () => {
    render(<GatewaySettings />)

    await waitFor(() => expect(loadProfiles).toHaveBeenCalled())
    expect(screen.getByText('还没有配置网关')).toBeInTheDocument()

    fireEvent.click(screen.getByText('添加网关'))
    expect(screen.getByText('添加新网关')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('本地网关'), { target: { value: 'Local' } })
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => expect(addProfile).toHaveBeenCalled())
    expect(addProfile).toHaveBeenCalledWith({
      name: 'Local',
      url: 'ws://127.0.0.1:18789',
      token: undefined,
      canvasPort: 18793,
      isDefault: true
    })

    await waitFor(() => expect(screen.queryByText('添加新网关')).not.toBeInTheDocument())
  })

  it('renders profiles with statuses and toggles connect/disconnect', async () => {
    useGatewayStore.setState({
      profiles: [
        { id: 'p1', name: 'Connected', url: 'ws://a', token: undefined, canvasPort: 18793, isDefault: true },
        { id: 'p2', name: 'Connecting', url: 'ws://b', token: undefined, canvasPort: 18793, isDefault: false },
        { id: 'p3', name: 'Error', url: 'ws://c', token: undefined, canvasPort: 18793, isDefault: false },
        { id: 'p4', name: 'Disconnected', url: 'ws://d', token: undefined, canvasPort: 18793, isDefault: false }
      ],
      activeProfileId: 'p1',
      connections: new Map([
        ['p1', { profileId: 'p1', status: 'connected' as const, url: 'ws://a' }],
        ['p2', { profileId: 'p2', status: 'connecting' as const }],
        ['p3', { profileId: 'p3', status: 'error' as const, error: 'Bad token' }]
      ])
    })

    render(<GatewaySettings />)

    await waitFor(() => expect(loadProfiles).toHaveBeenCalled())
    expect(screen.getByText('Bad token')).toBeInTheDocument()

    const connectingBtn = screen.getByText('连接中…') as HTMLButtonElement
    expect(connectingBtn.disabled).toBe(true)

    fireEvent.click(screen.getByText('断开'))
    await waitFor(() => expect(disconnect).toHaveBeenCalledWith('p1'))

    // Error state is treated as not-connected => connect
    fireEvent.click(screen.getAllByText('连接')[0])
    await waitFor(() => expect(connect).toHaveBeenCalled())
  })

  it('edits, sets default, and delete confirm guards work', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))

    useGatewayStore.setState({
      profiles: [{ id: 'p1', name: 'A', url: 'ws://a', token: undefined, canvasPort: 18793, isDefault: false }],
      activeProfileId: 'p1'
    })

    render(<GatewaySettings />)

    await waitFor(() => expect(loadProfiles).toHaveBeenCalled())

    fireEvent.click(screen.getByText('设为默认'))
    await waitFor(() => expect(setDefault).toHaveBeenCalledWith('p1'))

    fireEvent.click(screen.getByTitle('编辑'))
    expect(screen.getByText('编辑网关')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('本地网关'), { target: { value: 'A2' } })
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => expect(updateProfile).toHaveBeenCalled())
    expect(updateProfile).toHaveBeenCalledWith({
      id: 'p1',
      name: 'A2',
      url: 'ws://a',
      token: undefined,
      canvasPort: 18793,
      isDefault: false
    })

    // confirm=false => should not call removeProfile
    fireEvent.click(screen.getByTitle('删除'))
    expect(removeProfile).not.toHaveBeenCalled()

    ;(confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    fireEvent.click(screen.getByTitle('删除'))
    await waitFor(() => expect(removeProfile).toHaveBeenCalledWith('p1'))
  })
})
