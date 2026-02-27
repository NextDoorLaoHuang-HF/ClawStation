import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CanvasPanel } from '../CanvasPanel'

describe('CanvasPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('navigates by Enter and shows loading indicator', async () => {
    render(<CanvasPanel />)

    const input = screen.getByPlaceholderText('Enter URL...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'https://example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    await Promise.resolve()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(input.value).toBe('https://example.com')
  })

  it('refresh toggles loading state', async () => {
    render(<CanvasPanel />)
    fireEvent.click(screen.getByTitle('Refresh'))
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    await Promise.resolve()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('supports snapshot/eval/fullscreen actions', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<CanvasPanel />)

    fireEvent.click(screen.getByTitle('Execute JavaScript'))
    fireEvent.click(screen.getByTitle('Take snapshot'))
    expect(alertMock).toHaveBeenCalledWith('Canvas 截图功能开发中...')
    expect(logMock).toHaveBeenCalled()

    fireEvent.click(screen.getByTitle('Fullscreen'))
    expect(screen.getByTitle('Exit fullscreen')).toBeInTheDocument()

    alertMock.mockRestore()
    logMock.mockRestore()
  })
})
