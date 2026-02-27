import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FileTree } from '../FileTree'

describe('FileTree', () => {
  it('renders mock tree roots', () => {
    render(<FileTree />)
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('package.json')).toBeInTheDocument()
  })

  it('calls onSelect and toggles nested directories', () => {
    const onSelect = vi.fn()
    render(<FileTree onSelect={onSelect} />)

    fireEvent.click(screen.getByText('package.json'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: 'package.json', isDir: false }))

    // Expand level-1 "components" directory to reveal level-2 children.
    fireEvent.click(screen.getByText('components'))
    expect(screen.getByText('layout')).toBeInTheDocument()
    expect(screen.getByText('chat')).toBeInTheDocument()

    // Collapse again.
    fireEvent.click(screen.getByText('components'))
    expect(screen.queryByText('layout')).not.toBeInTheDocument()
  })

  it('highlights selected path', () => {
    render(<FileTree selectedPath="package.json" />)
    const selected = screen.getByText('package.json')
    expect(selected.className).toContain('font-medium')
  })
})
