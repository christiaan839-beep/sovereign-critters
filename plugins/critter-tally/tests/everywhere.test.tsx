import { expect, test } from 'claude-code/testing'
import type { RenderSurface } from 'claude-code'

import { summary } from '../hooks/register'

// Per the docs, the two apps that draw a mod's panes.
const SURFACES = ['terminal', 'desktop'] as const
const PANE = {
  component: 'Pane',
  requestId: 'everywhere',
  props: { title: 'Tool calls', isFocused: false, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const
const EVERYWHERE = { command: 'everywhere', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

// The terminal's bars as the Raster packs them: base64 of little-endian u32 triplets, the first of each a glyph.
const glyphs = (cells: unknown) => [...new Uint32Array(Uint8Array.from(atob(String(cells)), c => c.charCodeAt(0)).buffer)].filter((_, i) => i % 3 === 0)

test('one pane, drawn by the terminal and the Desktop app from the same hook', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  await $.tool.call({ tool: 'Read', file_path: 'package.json' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'critter-tally', surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: 'Read 2 · Bash 1' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'hide' })).toBeDefined()
    // Only the terminal's table has a Raster, so only the terminal gets the bars.
    expect((await ui.find({ type: 'Raster', key: 'bars' })) !== undefined).toBe(surface === 'terminal')
    await ui.unmount()
  }
})

// The test's hooks stand for the engine: they answer ui.open, ui.panes, session.surfaces and ui.close, and note
// each open and close.
test('/everywhere opens the pane, and Hide on the terminal or the Desktop app closes it', async ($, on) => {
  const asked: string[] = []
  on('ui.open', ($, e) => {
    asked.push(`open ${e.id}`)
    return { value: { isPlaced: true } }
  })
  on('ui.panes', () => ({ value: [{ id: 'everywhere', title: 'Tool calls', isShown: true, isFocused: false, isPlaced: true }] }))
  on('session.surfaces', () => ({ value: ['terminal'] }))
  on('ui.close', ($, e) => {
    asked.push(`close ${e.id} by ${e.origin.kind}`)
    return { value: undefined }
  })
  expect((await $.command.run(EVERYWHERE)).text).toBe('The tally is open.')
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'critter-tally', surface, ...PANE })
    await ui.press({ key: 'hide' })
    await ui.unmount()
  }
  expect(asked).toEqual(['open everywhere', ...SURFACES.map(() => 'close everywhere by plugin')])
})

// Per the docs only the terminal and the Desktop app draw a mod's panes. In VS Code's chat panel the pane waits
// unplaced, as it does under a Desktop app that places none (an older one, per the declarations); claude -p places
// every pane and draws none. There the answer is the tally itself.
const unseen = (name: string, surfaces: RenderSurface[], isPlaced: boolean) =>
  test(`${name}: /everywhere answers with the tally in words`, async ($, on) => {
    on('tool.call', () => ({ result: 'ok' }))
    on('ui.open', () => ({ value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: 'no surface attached places panes' } }))
    on('ui.panes', () => ({ value: [{ id: 'everywhere', title: 'Tool calls', isShown: false, isFocused: false, isPlaced }] }))
    on('session.surfaces', () => ({ value: surfaces }))
    await $.tool.call({ tool: 'Read', file_path: 'README.md' })
    await $.tool.call({ tool: 'Bash', command: 'ls' })
    await $.tool.call({ tool: 'Read', file_path: 'package.json' })
    expect((await $.command.run(EVERYWHERE)).text).toBe('Nothing here draws the pane, so the tally comes as words: Read 2 · Bash 1.')
  })
unseen("VS Code's chat panel", ['vscode'], false)
unseen('a Desktop app that places no panes', ['desktop'], false)
unseen('claude -p', [], true)

test('a tool called once still gets a bar beside one called 17 times', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  for (let i = 0; i < 17; i++) await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  await $.tool.call({ tool: 'Write', file_path: 'notes.md', content: 'x' })
  const ui = await $.ui.mount({ plugin: 'critter-tally', surface: 'terminal', ...PANE })
  expect(glyphs((await ui.find({ type: 'Raster', key: 'bars' }))?.props.cells)).toEqual([0x2588, 0x2581])
  await ui.unmount()
})

// Called first: Bash 3, then Read 17, Edit 9 and Write once. The words name the three called most, and the bars
// stand beside them in that order, one each.
test('the bars draw the three tools the words name, in the same order', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  for (let i = 0; i < 3; i++) await $.tool.call({ tool: 'Bash', command: 'ls' })
  for (let i = 0; i < 17; i++) await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  for (let i = 0; i < 9; i++) await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: 'x', new_string: 'y' })
  await $.tool.call({ tool: 'Write', file_path: 'notes.md', content: 'x' })
  const ui = await $.ui.mount({ plugin: 'critter-tally', surface: 'terminal', ...PANE })
  expect((await ui.find({ type: 'Text', text: /Read/ }))?.text).toBe('Read 17 · Edit 9 · Bash 3')
  const raster = await ui.find({ type: 'Raster', key: 'bars' })
  expect(raster?.props.columns).toBe(3)
  expect(glyphs(raster?.props.cells)).toEqual([0x2588, 0x2584, 0x2581])
  await ui.unmount()
})

test('a tool named like an object property is counted like any other', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  for (const tool of ['constructor', 'constructor', '__proto__', 'toString']) await $.tool.call({ tool } as never)
  const ui = await $.ui.mount({ plugin: 'everywhere', surface: 'desktop', ...PANE })
  expect(await ui.find({ type: 'Text', text: 'constructor 2 · __proto__ 1 · toString 1' })).toBeDefined()
  await ui.unmount()
})

test('the summary names the three most called tools', () => {
  expect(summary({})).toBe('no tool calls yet')
  expect(summary({ Grep: 1, Read: 9, Edit: 3, Bash: 5 })).toBe('Read 9 · Bash 5 · Edit 3')
})
