import type { Register } from 'claude-code'

export type Measure = { characters: number; words: number; lines: number; longestLine: number; bytes: number }

// Counts a text exactly. A character is a Unicode code point: é or a plain emoji counts once,
// but an emoji with a skin tone, a joined family or a letter with a combining accent counts each code point in it.
export function measure(text: string): Measure {
  // A final line break ends the last line rather than starting another; an empty text has no lines.
  const lines = text === '' ? [] : text.replace(/(\r\n|\r|\n)$/, '').split(/\r\n|\r|\n/)
  const trimmed = text.trim()
  return {
    characters: [...text].length,
    words: trimmed === '' ? 0 : trimmed.split(/\s+/).length,
    lines: lines.length,
    longestLine: Math.max(0, ...lines.map(line => [...line].length)),
    bytes: new TextEncoder().encode(text).length,
  }
}

// The count as the model reads it.
export function describe(m: Measure): string {
  const n = (k: number, one: string) => `${k} ${one}${k === 1 ? '' : 's'}`
  return `${n(m.characters, 'character')}, ${n(m.words, 'word')}, ${n(m.lines, 'line')} (the longest ${n(m.longestLine, 'character')}), ${n(m.bytes, 'byte')}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'measure',
      description:
        'Counts a text exactly. Characters are Unicode code points, so an emoji with a skin tone, a joined family ' +
        'or a letter with a combining accent counts as more than one. It also counts words between whitespace, ' +
        'lines (a final line break ends the last line), the longest line, and the size in UTF-8 bytes. ' +
        'Use it whenever a length limit matters (a title, a post, a commit subject, a meta description) instead of estimating.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'The text to measure, exactly as it will be used.' } },
        required: ['text'],
      },
    })
    return next(e)
  })

  // The model calls it as mcp__forge__measure. Every call is answered here; nothing beneath runs it.
  on('tool.call', { tool: 'mcp__forge__measure' }, ($, e) =>
    ({ result: describe(measure(String(e.text ?? ''))) }))
}
