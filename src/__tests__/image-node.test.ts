import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/ImageNodeView', () => ({ default: 'MockImageNodeView' }))

const nodeOptions = { HTMLAttributes: {} }

describe('ImageNode extension', () => {
  it('exports ImageNode with correct name', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    expect(ImageNode.name).toBe('imageNode')
  })

  it('is a block node with group set to block', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    expect(ImageNode.config.group).toBe('block')
  })

  it('is draggable', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    expect(ImageNode.config.draggable).toBe(true)
  })

  it('parses <img> tags with src attribute', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const result = ImageNode.config.parseHTML()
    expect(result).toEqual([{ tag: 'img[src]' }])
  })

  it('renders as an img element with merged attributes', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const ctx = { options: nodeOptions }
    const result = ImageNode.config.renderHTML.call(ctx, {
      HTMLAttributes: { src: '/api/images/test', width: '400px', height: '300px' },
    })
    expect(result[0]).toBe('img')
    expect(result[1]).toMatchObject({ src: '/api/images/test', width: '400px', height: '300px' })
  })

  it('renders img without width or height when not provided', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const ctx = { options: nodeOptions }
    const result = ImageNode.config.renderHTML.call(ctx, {
      HTMLAttributes: { src: '/api/images/test' },
    })
    expect(result[0]).toBe('img')
    expect(result[1]).toMatchObject({ src: '/api/images/test' })
    expect(result[1]).not.toHaveProperty('width')
    expect(result[1]).not.toHaveProperty('height')
  })

  it('has default attribute values of null', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const attrs = ImageNode.config.addAttributes()
    expect(attrs.src.default).toBe(null)
    expect(attrs.width.default).toBe(null)
    expect(attrs.height.default).toBe(null)
  })

  it('addNodeView returns ReactNodeViewRenderer', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const renderer = ImageNode.config.addNodeView()
    expect(renderer).toBeTruthy()
    expect(typeof renderer).toBe('function')
  })

  it('defines setImage command that calls insertContent', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const insertContent = vi.fn(() => 'ran')
    const commands = { insertContent }

    const ctx = { name: 'imageNode' }
    const cmdDef = ImageNode.config.addCommands.call(ctx)
    const setImageCmd = cmdDef.setImage({ src: '/api/images/test', width: '400px' })
    setImageCmd({ commands } as any)

    expect(insertContent).toHaveBeenCalledWith({
      type: 'imageNode',
      attrs: { src: '/api/images/test', width: '400px' },
    })
  })

  it('setImage command works without optional width/height', async () => {
    const { ImageNode } = await import('@/extensions/ImageNode')
    const insertContent = vi.fn(() => 'ran')
    const commands = { insertContent }

    const ctx = { name: 'imageNode' }
    const cmdDef = ImageNode.config.addCommands.call(ctx)
    const setImageCmd = cmdDef.setImage({ src: '/api/images/test' })
    setImageCmd({ commands } as any)

    expect(insertContent).toHaveBeenCalledWith({
      type: 'imageNode',
      attrs: { src: '/api/images/test' },
    })
  })
})
