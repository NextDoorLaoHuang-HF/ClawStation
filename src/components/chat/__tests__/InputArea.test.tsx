import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InputArea } from '../InputArea'
import { useSessionStore } from '../../../stores/sessionStore'

describe('InputArea', () => {
  beforeEach(() => {
    useSessionStore.setState({
      activeSessionKey: null,
      isLoading: false,
      sendMessage: vi.fn(async () => {}),
    })
  })

  it('shows hint when there is no active session', () => {
    render(<InputArea />)
    expect(screen.getByText('Select or create a session to start chatting')).toBeInTheDocument()
  })

  it('sends message on Enter and clears input', async () => {
    const sendMessage = vi.fn(async () => {})
    useSessionStore.setState({
      activeSessionKey: 'sk1',
      isLoading: false,
      sendMessage,
    })

    render(<InputArea />)

    const textarea = screen.getByPlaceholderText('Type a message... (Shift+Enter for new line)') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '  hello world  ' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('sk1', 'hello world'))
    expect(textarea.value).toBe('')
  })

  it('does not send on Shift+Enter', () => {
    const sendMessage = vi.fn(async () => {})
    useSessionStore.setState({
      activeSessionKey: 'sk1',
      isLoading: false,
      sendMessage,
    })

    render(<InputArea />)
    const textarea = screen.getByPlaceholderText('Type a message... (Shift+Enter for new line)')
    fireEvent.change(textarea, { target: { value: 'line1' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('disables textarea and send button while loading', () => {
    useSessionStore.setState({
      activeSessionKey: 'sk1',
      isLoading: true,
      sendMessage: vi.fn(async () => {}),
    })

    render(<InputArea />)
    expect(screen.getByPlaceholderText('Type a message... (Shift+Enter for new line)')).toBeDisabled()
    expect(screen.getByTitle('Send message')).toBeDisabled()
  })

  it('handles send failure without crashing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sendMessage = vi.fn(async () => {
      throw new Error('send failed')
    })
    useSessionStore.setState({
      activeSessionKey: 'sk1',
      isLoading: false,
      sendMessage,
    })

    render(<InputArea />)
    const textarea = screen.getByPlaceholderText('Type a message... (Shift+Enter for new line)')
    fireEvent.change(textarea, { target: { value: 'hello' } })
    fireEvent.click(screen.getByTitle('Send message'))

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1))
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
