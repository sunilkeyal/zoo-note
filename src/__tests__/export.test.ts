import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTurndown, mockTurndownConstructor, mockDump, mockArchiveInstance, mockZipArchive, archiveHandlers } = vi.hoisted(() => {
  const mockTurndown = vi.fn()
  const mockTurndownConstructor = vi.fn(function() {
    return { turndown: mockTurndown }
  })
  const mockDump = vi.fn()
  const archiveHandlers: Record<string, (...args: unknown[]) => void> = {}
  const mockArchiveInstance = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      archiveHandlers[event] = handler
      return mockArchiveInstance
    }),
    append: vi.fn(),
    finalize: vi.fn(() => {
      archiveHandlers.data?.(Buffer.from('mock-zip-data'))
      archiveHandlers.end?.()
    }),
  }
  const mockZipArchive = vi.fn(function() { return mockArchiveInstance })

  return { mockTurndown, mockTurndownConstructor, mockDump, mockArchiveInstance, mockZipArchive, archiveHandlers }
})

const { mockExtractImageIds, mockObjectId, mockGetImageById } = vi.hoisted(() => {
  const mockExtractImageIds = vi.fn()
  const mockObjectId = vi.fn()
  const mockGetImageById = vi.fn()

  return { mockExtractImageIds, mockObjectId, mockGetImageById }
})

vi.mock('turndown', () => ({
  default: mockTurndownConstructor,
}))

vi.mock('js-yaml', () => ({
  dump: mockDump,
}))

vi.mock('archiver', () => ({
  ZipArchive: mockZipArchive,
}))

vi.mock('@/lib/gridfs', () => ({
  getImageById: mockGetImageById,
}))

vi.mock('@/lib/utils', () => ({
  extractImageIds: mockExtractImageIds,
  rewriteImageSrcs: vi.fn(),
}))

describe('export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockTurndownConstructor.mockImplementation(function() {
      return { turndown: mockTurndown }
    })
    mockTurndown.mockImplementation((html: string) => `md(${html})`)
    mockDump.mockImplementation((data: Record<string, string>) =>
      Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n'
    )
    mockZipArchive.mockImplementation(function() { return mockArchiveInstance })
    mockArchiveInstance.finalize.mockImplementation(() => {
      archiveHandlers.data?.(Buffer.from('mock-zip-data'))
      archiveHandlers.end?.()
    })
  })

  describe('convertHtmlToMarkdown', () => {
    it('converts HTML to Markdown via turndown', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown('<p>Hello</p>')

      expect(mockTurndown).toHaveBeenCalledWith('<p>Hello</p>')
      expect(result).toBe('md(<p>Hello</p>)')
    })

    it('handles empty HTML string', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown('')

      expect(result).toBe('md()')
    })

    it('handles null-ish input', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown(null as unknown as string)

      expect(result).toBe('md()')
    })
  })

  describe('generateFrontMatter', () => {
    it('generates YAML front matter with title', async () => {
      const { generateFrontMatter } = await import('@/lib/export')
      mockDump.mockReturnValue('title: My Note\n')

      const result = generateFrontMatter('My Note')

      expect(result).toBe('---\ntitle: My Note\n---\n\n')
      expect(mockDump).toHaveBeenCalledWith({ title: 'My Note' })
    })

    it('includes folder name when provided', async () => {
      const { generateFrontMatter } = await import('@/lib/export')
      mockDump.mockReturnValue('title: My Note\nfolder: My Folder\n')

      const result = generateFrontMatter('My Note', 'My Folder')

      expect(result).toBe('---\ntitle: My Note\nfolder: My Folder\n---\n\n')
      expect(mockDump).toHaveBeenCalledWith({ title: 'My Note', folder: 'My Folder' })
    })
  })

  describe('generateExportZip', () => {
    const mockNote = (overrides: Record<string, unknown> = {}) => ({
      _id: 'note1',
      title: 'Test Note',
      content: '<p>Hello</p>',
      position: 0,
      folderId: undefined as string | undefined,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    const mockFolder = (overrides: Record<string, unknown> = {}) => ({
      _id: 'folder1',
      name: 'My Folder',
      position: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    beforeEach(() => {
      mockExtractImageIds.mockReturnValue([])
    })

    it('creates a ZIP archive and returns a Buffer', async () => {
      const { generateExportZip } = await import('@/lib/export')

      const result = await generateExportZip([mockNote()], [], {} as never)

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(mockArchiveInstance.finalize).toHaveBeenCalled()
    })

    it('appends notes.json manifest with correct structure', async () => {
      const { generateExportZip } = await import('@/lib/export')
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

      await generateExportZip([mockNote()], [], {} as never)

      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(1)
      const [content, options] = mockArchiveInstance.append.mock.calls[0]
      expect(options).toEqual({ name: 'notes.json' })
      const manifest = JSON.parse(content)
      expect(manifest.version).toBe(1)
      expect(manifest.exportedAt).toMatch(datePattern)
      expect(manifest.folders).toEqual([])
      expect(manifest.notes).toHaveLength(1)
      expect(manifest.notes[0]).toEqual({
        title: 'Test Note',
        content: '<p>Hello</p>',
        folderName: null,
        position: 0,
      })
    })

    it('includes folder information in manifest when note has folder', async () => {
      const { generateExportZip } = await import('@/lib/export')

      await generateExportZip(
        [mockNote({ folderId: 'folder1' })],
        [mockFolder()],
        {} as never
      )

      const [content] = mockArchiveInstance.append.mock.calls[0]
      const manifest = JSON.parse(content)
      expect(manifest.folders).toEqual([{ name: 'My Folder', position: 1 }])
      expect(manifest.notes[0].folderName).toBe('My Folder')
    })

    it('uses null folderName when folder not found in map', async () => {
      const { generateExportZip } = await import('@/lib/export')

      await generateExportZip(
        [mockNote({ folderId: 'nonexistent' })],
        [],
        {} as never
      )

      const [content] = mockArchiveInstance.append.mock.calls[0]
      const manifest = JSON.parse(content)
      expect(manifest.notes[0].folderName).toBeNull()
    })

    it('rewrites image srcs in manifest content with extensions', async () => {
      const { generateExportZip } = await import('@/lib/export')
      const imgId = '507f1f77bcf86cd799439011'
      mockExtractImageIds.mockReturnValue([imgId])
      mockGetImageById.mockResolvedValue({
        contentType: 'image/png',
        data: Buffer.from('img-data'),
        length: 8,
        filename: 'photo.png',
        metadata: {},
      })

      await generateExportZip(
        [mockNote({ content: `<img src="/api/images/${imgId}">` })],
        [],
        {} as never
      )

      const [content] = mockArchiveInstance.append.mock.calls[0]
      const manifest = JSON.parse(content)
      expect(manifest.notes[0].content).toBe(`<img src="images/${imgId}.png">`)
    })

    it('extracts image IDs and fetches images', async () => {
      const { generateExportZip } = await import('@/lib/export')
      const validId = '507f1f77bcf86cd799439011'
      mockExtractImageIds.mockReturnValue([validId])
      mockGetImageById.mockResolvedValue({
        contentType: 'image/png',
        data: Buffer.from('image-data'),
        length: 10,
        filename: 'photo.png',
        metadata: {},
      })

      await generateExportZip([mockNote()], [], {} as never)

      expect(mockExtractImageIds).toHaveBeenCalledWith('<p>Hello</p>')
      expect(mockGetImageById).toHaveBeenCalledTimes(1)
      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        expect.any(Buffer),
        { name: `images/${validId}.png` }
      )
    })

    it('skips images not found', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockExtractImageIds.mockReturnValue(['507f1f77bcf86cd799439011'])
      mockGetImageById.mockResolvedValue(null)

      await generateExportZip([mockNote()], [], {} as never)

      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(1)
    })

    it('handles image fetch errors gracefully', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockExtractImageIds.mockReturnValue(['507f1f77bcf86cd799439011'])
      mockGetImageById.mockRejectedValue(new Error('fetch error'))

      await generateExportZip([mockNote()], [], {} as never)

      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(1)
    })

    it('uses jpg as default extension when filename has no extension', async () => {
      const { generateExportZip } = await import('@/lib/export')
      const validId = '507f1f77bcf86cd799439011'
      mockExtractImageIds.mockReturnValue([validId])
      mockGetImageById.mockResolvedValue({
        contentType: 'image/jpeg',
        data: Buffer.from('data'),
        length: 4,
        filename: 'photo.',
        metadata: {},
      })

      await generateExportZip([mockNote()], [], {} as never)

      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        expect.any(Buffer),
        { name: `images/${validId}.jpg` }
      )
    })
  })
})
