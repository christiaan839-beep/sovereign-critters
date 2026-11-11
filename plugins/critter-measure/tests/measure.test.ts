import { expect, test } from 'claude-code/testing'
import { measure } from '../hooks/register'

test('the model can call measure, and the count is exact', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__critter-measure__measure', text: 'Héllo 👋\nsecond line' })
  expect(ran.deny).toBeUndefined()
  expect(ran.result).toBe('19 characters, 4 words, 2 lines (the longest 11 characters), 23 bytes')
})

test('an empty text measures as nothing', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__critter-measure__measure', text: '' })
  expect(ran.result).toBe('0 characters, 0 words, 0 lines (the longest 0 characters), 0 bytes')
})

test('a final line break ends the last line rather than starting another', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__critter-measure__measure', text: 'Fix the build\n' })
  expect(ran.result).toBe('14 characters, 3 words, 1 line (the longest 13 characters), 14 bytes')
})

test('a character is a code point, so a waving hand with a skin tone counts two', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__critter-measure__measure', text: '\u{1F44B}\u{1F3FD}' })
  expect(ran.result).toBe('2 characters, 1 word, 1 line (the longest 2 characters), 8 bytes')
})

test('an emoji with a skin tone, a joined family and a combining accent count each code point, and a lone CRLF ends one line', () => {
  expect(measure('👍🏽').characters).toBe(2) // the thumb and the skin tone
  expect(measure('👨‍👩‍👧').characters).toBe(5) // three people and two joiners
  expect(measure('é').characters).toBe(2) // e and the combining acute
  expect(measure('é').characters).toBe(1)
  expect(measure('a\r\nb\r\n').lines).toBe(2)
  expect(measure('👍🏽').bytes).toBe(8)
})

test('a text of hundreds of thousands of lines is counted, not a crash', () => {
  const m = measure('\n'.repeat(300_000))
  expect(m.lines).toBe(300_000)
  expect(m.longestLine).toBe(0)
  expect(measure('ab\n'.repeat(200_000) + 'cde').longestLine).toBe(3)
})

test('the model is told when it hands measure something that is not a string, and not given a confident zero', async $ => {
  for (const text of [42, { a: 1 }, ['a', 'b'], null]) {
    const ran = await $.tool.call({ tool: 'mcp__critter-measure__measure', text } as never)
    expect(ran.result, JSON.stringify(text)).toBe('measure needs a text: a string in "text".')
  }
  const missing = await $.tool.call({ tool: 'mcp__critter-measure__measure' } as never)
  expect(missing.result).toBe('measure needs a text: a string in "text".')
  expect((await $.tool.call({ tool: 'mcp__critter-measure__measure', text: '' })).result).toBe('0 characters, 0 words, 0 lines (the longest 0 characters), 0 bytes') // an empty string is still a text
})
