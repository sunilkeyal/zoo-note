import { describe, it, expect } from 'vitest'
import { cn, stripHtml, extractImageIds, rewriteImageSrcs } from '@/lib/utils'

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden')).toBe('base')
    expect(cn('base', true && 'visible')).toBe('base visible')
  })

  it('handles undefined and null values', () => {
    expect(cn('a', undefined, null)).toBe('a')
  })

  it('handles array arguments', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })

  it('merges Tailwind classes with later wins', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('preserves non-conflicting classes', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('stripHtml', () => {
  it('strips HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })

  it('returns plain text unchanged', () => {
    expect(stripHtml('hello world')).toBe('hello world')
  })

  it('trims whitespace', () => {
    expect(stripHtml('  <p>content</p>  ')).toBe('content')
  })

  it('decodes &nbsp; entities', () => {
    expect(stripHtml('<p>Hello&nbsp;World</p>')).toBe('Hello\u00A0World')
  })

  it('decodes multiple &nbsp; for consecutive spaces', () => {
    expect(stripHtml('<p>Multiple&nbsp;&nbsp;&nbsp;spaces</p>')).toBe('Multiple\u00A0\u00A0\u00A0spaces')
  })

  it('decodes common HTML entities', () => {
    expect(stripHtml('<p>&amp; &lt; &gt; &quot;</p>')).toBe('& < > "')
  })

  it('decodes numeric HTML entities', () => {
    expect(stripHtml('<p>&#39; &#x27;</p>')).toBe("' '")
  })

  it('handles real-world TipTap content with &nbsp;', () => {
    const html = '<p class="MsoNormal" style="margin: 0px; padding: 0px; color: rgb(0, 0, 0); font-family: &quot;Times New Roman&quot;;"><span style="font-family: Arial, sans-serif;">This is a note&nbsp;&nbsp;with spaces.</span></p>'
    expect(stripHtml(html)).toBe('This is a note\u00A0\u00A0with spaces.')
  })
})

describe('extractImageIds', () => {
  it('extracts image IDs from img tags', () => {
    const html = '<p><img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1"></p>'
    expect(extractImageIds(html)).toEqual(['67a1b2c3d4e5f6a7b8c9d0e1'])
  })

  it('extracts multiple unique image IDs', () => {
    const html = '<img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1"><img src="/api/images/67a2b3c4d5e6f7a8b9c0d1e2">'
    expect(extractImageIds(html)).toEqual([
      '67a1b2c3d4e5f6a7b8c9d0e1',
      '67a2b3c4d5e6f7a8b9c0d1e2',
    ])
  })

  it('deduplicates identical image IDs', () => {
    const html = '<img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1"><img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1">'
    expect(extractImageIds(html)).toEqual(['67a1b2c3d4e5f6a7b8c9d0e1'])
  })

  it('returns empty array for HTML without images', () => {
    expect(extractImageIds('<p>no images here</p>')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(extractImageIds('')).toEqual([])
  })

  it('ignores img tags without /api/images/ prefix', () => {
    const html = '<img src="https://example.com/image.png">'
    expect(extractImageIds(html)).toEqual([])
  })

  it('matches only 24-char hex IDs', () => {
    const html = '<img src="/api/images/too-short-id.png">'
    expect(extractImageIds(html)).toEqual([])
  })
})

describe('rewriteImageSrcs', () => {
  it('rewrites src matching fromPrefix', () => {
    const html = '<img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1">'
    expect(rewriteImageSrcs(html, '/api/images/', 'images/')).toBe('<img src="images/67a1b2c3d4e5f6a7b8c9d0e1">')
  })

  it('does not rewrite src not matching fromPrefix', () => {
    const html = '<img src="https://example.com/image.png">'
    expect(rewriteImageSrcs(html, '/api/images/', 'images/')).toBe('<img src="https://example.com/image.png">')
  })

  it('rewrites only matching src attributes in mixed HTML', () => {
    const html = '<img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1"><img src="https://example.com/other.png">'
    const result = rewriteImageSrcs(html, '/api/images/', 'images/')
    expect(result).toBe('<img src="images/67a1b2c3d4e5f6a7b8c9d0e1"><img src="https://example.com/other.png">')
  })

  it('handles empty HTML string', () => {
    expect(rewriteImageSrcs('', '/api/images/', 'images/')).toBe('')
  })

  it('handles HTML with no img tags', () => {
    expect(rewriteImageSrcs('<p>hello</p>', '/api/images/', 'images/')).toBe('<p>hello</p>')
  })

  it('rewrites reverse direction (images/ to /api/images/)', () => {
    const html = '<img src="images/67a1b2c3d4e5f6a7b8c9d0e1">'
    expect(rewriteImageSrcs(html, 'images/', '/api/images/')).toBe('<img src="/api/images/67a1b2c3d4e5f6a7b8c9d0e1">')
  })

  it('ignores non-src attributes with matching prefix', () => {
    const html = '<a href="/api/images/67a1b2c3d4e5f6a7b8c9d0e1">link</a>'
    expect(rewriteImageSrcs(html, '/api/images/', 'images/')).toBe('<a href="/api/images/67a1b2c3d4e5f6a7b8c9d0e1">link</a>')
  })
})
