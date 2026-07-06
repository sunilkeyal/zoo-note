import { describe, it, expect } from 'vitest'
import { cn, stripHtml } from '@/lib/utils'

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
