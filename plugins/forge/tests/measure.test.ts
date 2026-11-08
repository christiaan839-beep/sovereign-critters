import { expect, test } from 'claude-code/testing'

test('the model can call measure, and the count is exact', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__forge__measure', text: 'Héllo 👋\nsecond line' })
  expect(ran.deny).toBeUndefined()
  expect(ran.result).toBe('19 characters, 4 words, 2 lines (the longest 11 characters), 23 bytes')
})

test('an empty text measures as nothing', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__forge__measure', text: '' })
  expect(ran.result).toBe('0 characters, 0 words, 0 lines (the longest 0 characters), 0 bytes')
})

test('a final line break ends the last line rather than starting another', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__forge__measure', text: 'Fix the build\n' })
  expect(ran.result).toBe('14 characters, 3 words, 1 line (the longest 13 characters), 14 bytes')
})

test('a character is a code point, so a waving hand with a skin tone counts two', async $ => {
  const ran = await $.tool.call({ tool: 'mcp__forge__measure', text: '\u{1F44B}\u{1F3FD}' })
  expect(ran.result).toBe('2 characters, 1 word, 1 line (the longest 2 characters), 8 bytes')
})
