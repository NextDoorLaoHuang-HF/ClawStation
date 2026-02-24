import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageItem } from '../MessageItem'
import type { Message } from '../../../types'

describe('MessageItem', () => {
  const baseMessage: Message = {
    role: 'user',
    content: [{ type: 'text', text: 'Hello world' }],
    timestamp: Date.now()
  }

  it('should render user message', () => {
    render(<MessageItem message={baseMessage} />)
    
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('should render assistant message', () => {
    const assistantMessage: Message = {
      role: 'assistant',
      content: [{ type: 'text', text: 'I can help you with that' }],
      timestamp: Date.now()
    }
    
    render(<MessageItem message={assistantMessage} />)
    
    expect(screen.getByText('I can help you with that')).toBeInTheDocument()
    expect(screen.getByText('Assistant')).toBeInTheDocument()
  })

  it('should render streaming state', () => {
    render(<MessageItem message={baseMessage} isStreaming={true} />)
    
    expect(screen.getByText('typing...')).toBeInTheDocument()
  })

  it('should render tool call content', () => {
    const toolMessage: Message = {
      role: 'assistant',
      content: [{
        type: 'toolCall',
        id: 'call-1',
        name: 'read_file',
        arguments: { path: 'test.txt' }
      }],
      timestamp: Date.now()
    }
    
    render(<MessageItem message={toolMessage} />)
    
    expect(screen.getByText('Tool Call: read_file')).toBeInTheDocument()
  })

  it('should render tool result content', () => {
    const toolResultMessage: Message = {
      role: 'assistant',
      content: [{
        type: 'toolResult',
        toolCallId: 'call-1',
        toolName: 'read_file',
        content: [{ type: 'text', text: 'File contents here' }]
      }],
      timestamp: Date.now()
    }
    
    render(<MessageItem message={toolResultMessage} />)
    
    expect(screen.getByText('Tool Result: read_file')).toBeInTheDocument()
  })

  it('should render image content', () => {
    const imageMessage: Message = {
      role: 'user',
      content: [{
        type: 'image',
        image: 'data:image/png;base64,abc123'
      }],
      timestamp: Date.now()
    }
    
    render(<MessageItem message={imageMessage} />)
    
    const img = screen.getByAltText('Attached image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123')
  })

  it('should render multiple content parts', () => {
    const multiContentMessage: Message = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'First part' },
        { type: 'text', text: 'Second part' }
      ],
      timestamp: Date.now()
    }
    
    render(<MessageItem message={multiContentMessage} />)
    
    expect(screen.getByText('First part')).toBeInTheDocument()
    expect(screen.getByText('Second part')).toBeInTheDocument()
  })

  it('should format timestamp', () => {
    const timestamp = new Date('2024-01-15 14:30:00').getTime()
    const message: Message = {
      role: 'user',
      content: [{ type: 'text', text: 'Test' }],
      timestamp
    }
    
    render(<MessageItem message={message} />)
    
    // Check that time is formatted (format depends on locale)
    const timeElement = screen.getByText(/\d{1,2}:\d{2}/)
    expect(timeElement).toBeInTheDocument()
  })
})
