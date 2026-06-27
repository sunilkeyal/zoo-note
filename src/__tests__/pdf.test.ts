import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPuppeteerLaunch = vi.fn()
const mockNewPage = vi.fn()
const mockPage = {
  setContent: vi.fn(),
  evaluate: vi.fn(),
  pdf: vi.fn(),
  close: vi.fn(),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
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
  mockPage.waitForSelector.mockResolvedValue(undefined)
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
      { waitUntil: 'networkidle0', timeout: 30000 }
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
})
