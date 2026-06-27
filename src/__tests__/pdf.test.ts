import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPuppeteerLaunch = vi.fn()
const mockNewPage = vi.fn()
const mockPage = {
  setContent: vi.fn(),
  evaluate: vi.fn(),
  pdf: vi.fn(),
  close: vi.fn(),
}
const mockBrowser = { newPage: mockNewPage }
const mockChromium = {
  args: ['--no-sandbox'],
  defaultViewport: { width: 800, height: 600 },
  executablePath: vi.fn(),
}

vi.mock('puppeteer-core', () => ({ default: { launch: mockPuppeteerLaunch } }))
vi.mock('@sparticuz/chromium', () => ({ default: mockChromium }))
vi.mock('puppeteer', () => ({
  executablePath: vi.fn().mockResolvedValue('/mock/chrome/path'),
}))

function setupMocks() {
  mockPuppeteerLaunch.mockResolvedValue(mockBrowser)
  mockNewPage.mockResolvedValue(mockPage)
  mockPage.pdf.mockResolvedValue(Buffer.from('pdf-content'))
  mockPage.evaluate.mockResolvedValue(0)
}

describe('generatePdf', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    setupMocks()
  })

  it('launches a browser and creates a page', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>Hello</p>')

    expect(mockPuppeteerLaunch).toHaveBeenCalled()
    expect(mockNewPage).toHaveBeenCalled()
  })

  it('sets page content with HTML skeleton containing the note html', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>Hello</p>')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('<p>Hello</p>'),
      expect.objectContaining({ waitUntil: 'load' })
    )
    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('pdf-content'),
      expect.any(Object)
    )
  })

  it('resolves relative image URLs when baseUrl is provided', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<img src="/api/images/abc">', 'http://example.com')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="http://example.com/api/images/abc"'),
      expect.any(Object)
    )
  })

  it('does not modify already-absolute URLs', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<img src="http://other.com/img.png">', 'http://example.com')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="http://other.com/img.png"'),
      expect.any(Object)
    )
  })

  it('does not modify protocol-relative URLs (//)', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<img src="//cdn.example.com/img.png">', 'http://example.com')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="//cdn.example.com/img.png"'),
      expect.any(Object)
    )
  })

  it('does not rewrite URLs when baseUrl is not provided', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<img src="/api/images/abc">')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="/api/images/abc"'),
      expect.any(Object)
    )
  })

  it('handles HTML without any img tags', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>No images here</p>', 'http://example.com')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.not.stringContaining('<img'),
      expect.any(Object)
    )
  })

  it('waits for images to load when img elements exist', async () => {
    mockPage.evaluate
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(undefined)

    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<img src="/api/images/a"><img src="/api/images/b">', 'http://example.com')

    expect(mockPage.evaluate).toHaveBeenCalledTimes(2)
  })

  it('skips image load wait when no img elements exist', async () => {
    mockPage.evaluate.mockResolvedValueOnce(0)

    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>No images</p>', 'http://example.com')

    expect(mockPage.evaluate).toHaveBeenCalledTimes(1)
    const call = mockPage.evaluate.mock.calls[0][0]
    const result = call()
    expect(result).toBe(0)
  })

  it('includes img CSS with max-width and height auto', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>Test</p>')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('img { max-width: 100%; height: auto; }'),
      expect.any(Object)
    )
  })

  it('generates PDF with correct options', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>Test</p>')

    expect(mockPage.pdf).toHaveBeenCalledWith({
      format: 'A4',
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      printBackground: true,
    })
  })

  it('returns a Buffer', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    const result = await generatePdf('<p>Test</p>')

    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('closes the page in finally block', async () => {
    const { generatePdf } = await import('@/lib/pdf')
    await generatePdf('<p>Test</p>')

    expect(mockPage.close).toHaveBeenCalled()
  })

  it('closes page even when an error occurs', async () => {
    mockPage.setContent.mockRejectedValueOnce(new Error('setContent failed'))

    const { generatePdf } = await import('@/lib/pdf')
    await expect(generatePdf('<p>Test</p>')).rejects.toThrow('setContent failed')

    expect(mockPage.close).toHaveBeenCalled()
  })
})

describe('resolveRelativeImages', () => {
  it('rewrites relative src URLs with the base URL', async () => {
    const { generatePdf } = await import('@/lib/pdf')

    mockPage.evaluate.mockResolvedValueOnce(0)
    await generatePdf('<img src="/api/images/abc">', 'http://localhost:3000')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="http://localhost:3000/api/images/abc"'),
      expect.any(Object)
    )
  })

  it('rewrites multiple relative img src URLs', async () => {
    const { generatePdf } = await import('@/lib/pdf')

    mockPage.evaluate.mockResolvedValueOnce(2).mockResolvedValueOnce(undefined)
    const html = '<img src="/api/images/a"><img src="/api/images/b">'
    await generatePdf(html, 'http://example.com')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="http://example.com/api/images/a"'),
      expect.any(Object)
    )
    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('src="http://example.com/api/images/b"'),
      expect.any(Object)
    )
  })
})
