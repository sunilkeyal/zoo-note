import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'node-view-wrapper', className }, children),
}))

async function createImageNodeView() {
  const mod = await import('@/components/ImageNodeView')
  return mod.default
}

function createProps(overrides: Record<string, unknown> = {}) {
  const editor = {
    isFocused: true,
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        setNodeSelection: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
  }
  return {
    node: { attrs: { src: '/api/images/test', width: '400px', height: '300px' } },
    updateAttributes: vi.fn(),
    selected: false,
    editor,
    getPos: vi.fn(() => 0),
    ...overrides,
  } as any
}

describe('ImageNodeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an image with correct src and dimensions', async () => {
    const ImageNodeView = await createImageNodeView()
    const props = createProps()
    const { container } = render(React.createElement(ImageNodeView, props))

    const img = container.querySelector('img')!
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/api/images/test')
    expect(img.getAttribute('width')).toBe('400px')
    expect(img.getAttribute('height')).toBe('300px')
  })

  it('renders within a NodeViewWrapper', async () => {
    const ImageNodeView = await createImageNodeView()
    const props = createProps()
    const { container } = render(React.createElement(ImageNodeView, props))

    expect(container.querySelector('[data-testid="node-view-wrapper"]')).toBeTruthy()
  })

  it('has data-drag-handle on the container div', async () => {
    const ImageNodeView = await createImageNodeView()
    const props = createProps()
    const { container } = render(React.createElement(ImageNodeView, props))

    const dragHandle = container.querySelector('[data-drag-handle]')
    expect(dragHandle).toBeTruthy()
  })

  it('shows resize handles when selected', async () => {
    const ImageNodeView = await createImageNodeView()
    const props = createProps({ selected: true })
    const { container } = render(React.createElement(ImageNodeView, props))

    const handles = container.querySelectorAll('.bg-blue-500')
    expect(handles.length).toBe(4)
  })

  it('hides resize handles when not selected', async () => {
    const ImageNodeView = await createImageNodeView()
    const props = createProps({ selected: false })
    const { container } = render(React.createElement(ImageNodeView, props))

    const handles = container.querySelectorAll('.bg-blue-500')
    expect(handles.length).toBe(0)
  })

  it('calls setNodeSelection on click', async () => {
    const ImageNodeView = await createImageNodeView()
    const setNodeSelection = vi.fn(() => ({ run: vi.fn() }))
    const editor = {
      isFocused: true,
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({ setNodeSelection })),
      })),
    }
    const props = createProps({ editor })
    const { container } = render(React.createElement(ImageNodeView, props))

    const dragHandle = container.querySelector('[data-drag-handle]')!
    fireEvent.click(dragHandle)

    expect(editor.chain).toHaveBeenCalled()
    expect(setNodeSelection).toHaveBeenCalledWith(0)
  })

  it('does not call setNodeSelection when getPos is not provided', async () => {
    const ImageNodeView = await createImageNodeView()
    const chain = vi.fn()
    const props = createProps({ getPos: null, editor: { isFocused: true, chain } })
    const { container } = render(React.createElement(ImageNodeView, props))

    const dragHandle = container.querySelector('[data-drag-handle]')!
    fireEvent.click(dragHandle)

    expect(chain).not.toHaveBeenCalled()
  })

  it('calls updateAttributes with width and height on resize start', async () => {
    const ImageNodeView = await createImageNodeView()
    const updateAttributes = vi.fn()
    const props = createProps({ selected: true, updateAttributes })

    const { container } = render(React.createElement(ImageNodeView, props))
    const img = container.querySelector('img')!
    Object.defineProperty(img, 'offsetWidth', { value: 400 })
    Object.defineProperty(img, 'naturalWidth', { value: 800 })
    Object.defineProperty(img, 'naturalHeight', { value: 600 })

    const handle = container.querySelectorAll('.bg-blue-500')[0]
    fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 })

    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 })
    fireEvent.mouseUp(window)

    expect(updateAttributes).toHaveBeenCalled()
    const call = updateAttributes.mock.calls[0][0]
    expect(call).toHaveProperty('width')
    expect(call).toHaveProperty('height')
    expect(call.width).toMatch(/^\d+px$/)
    expect(call.height).toMatch(/^\d+px$/)
  })
})
