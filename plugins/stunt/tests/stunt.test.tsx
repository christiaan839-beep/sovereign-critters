import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderSurface } from 'claude-code'

import { paint } from '../hooks/register'

const PANE = {
  component: 'Pane',
  requestId: 'stunt',
  props: { title: 'Card stunt', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const
const STUNT = { command: 'stunt', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

// The cells as RasterProps packs them: base64 of little-endian u32 triplets [codePoint, foreground, background].
const unpack = (cells: string) => new Uint32Array(Uint8Array.from(atob(cells), c => c.charCodeAt(0)).buffer)

// The test's hooks stand for the engine: the surfaces the session draws on, whether they place the pane (and the
// engine's record of it, open or not), and each blit, which the kit does not paint. It hands back what was asked.
function engine(on: On, surfaces: RenderSurface[], isPlaced: boolean, isOpen = false) {
  const asked = { opens: [] as unknown[], blits: [] as unknown[], close: () => { isOpen = false } }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('tool.call', () => ({ result: 'ok' }))
  on('session.surfaces', () => ({ value: surfaces }))
  on('ui.open', ($, e) => {
    asked.opens.push(e)
    isOpen = true
    return { value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: 'no surface attached places panes' } }
  })
  on('ui.panes', () => ({ value: isOpen ? [{ id: 'stunt', title: 'Card stunt', isShown: true, isFocused: false, isPlaced }] : [] }))
  on('ui.blit', ($, e) => {
    asked.blits.push(e)
    return { value: {} }
  })
  return asked
}

test('the terminal draws the stand as one Raster, a card per tool call', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  const ui = await $.ui.mount({ plugin: 'stunt', surface: 'terminal', ...PANE })
  expect((await ui.find({ type: 'Raster', key: 'stand' }))?.props.cells).toBe(paint(['Read', 'Bash']))
  expect((await ui.find({ type: 'Text', text: /tool calls/ }))?.text).toBe('2 tool calls: a card each')
  await ui.unmount()
})

test('the Desktop app, which has no Raster, gets the count in words', async $ => {
  const ui = await $.ui.mount({ plugin: 'stunt', surface: 'desktop', ...PANE })
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /plays in the terminal/ })).toBeDefined()
  await ui.unmount()
})

test('the words count every call, and the strip keeps the last forty', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  for (let i = 0; i < 44; i++) await $.tool.call({ tool: 'Bash', command: 'true' })
  const ui = await $.ui.mount({ plugin: 'stunt', surface: 'terminal', ...PANE })
  expect((await ui.find({ type: 'Text', text: /tool calls/ }))?.text).toBe('45 tool calls: a card for each of the last 40')
  expect((await ui.find({ type: 'Raster', key: 'stand' }))?.props.cells).toBe(paint(Array(40).fill('Bash')))
  await ui.unmount()
  const words = await $.ui.mount({ plugin: 'stunt', surface: 'desktop', ...PANE })
  expect((await words.find({ type: 'Text' }))?.text).toBe('The card stunt plays in the terminal. 45 tool calls: a card for each of the last 40.')
  await words.unmount()
})

test('the cells are packed as RasterProps says: a full-block card, its colour, the default background', () => {
  const cells = unpack(paint(['Read']))
  expect(cells.length).toBe(40 * 13 * 3)
  expect([...cells.slice(0, 3)]).toEqual([0x2588, 0x2f4f72, 0x01000000])
  expect([...cells.slice((12 * 40 + 39) * 3, (12 * 40 + 40) * 3)]).toEqual([0x2588, 0x6a9bcc, 0x01000000])
})

test('a blink turns his eye cards to clay, and only those', () => {
  const open = unpack(paint([])), shut = unpack(paint([], true))
  const flipped = [...Array(40 * 13).keys()].filter(i => open[i * 3 + 1] !== shut[i * 3 + 1])
  expect(flipped.map(i => [Math.floor(i / 40), i % 40])).toEqual([[3, 12], [3, 13], [3, 26], [3, 27], [4, 12], [4, 13], [4, 26], [4, 27]])
  expect(flipped.map(i => shut[i * 3 + 1])).toEqual(Array(8).fill(0xd97757))
})

test('in a terminal, /stunt puts the stand up, sized to it, and the blink opens on the strip as it stands', async ($, on) => {
  const asked = engine(on, ['terminal'], true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: 'a' })
  expect((await $.command.run(STUNT)).text).toBe('The stand is up.')
  // The dock as wide as the stand, the inline block as tall as the stand and the line of words under it.
  expect(asked.opens).toEqual([{ id: 'stunt', title: 'Card stunt', columns: 40, rows: 14 }])
  await clock.advance(4000)
  await $.tool.call({ tool: 'Edit', file_path: 'b', old_string: 'x', new_string: 'y' })
  await clock.advance(160)
  // Neither blit names a size, so each paints the mounted 40 by 13.
  expect(asked.blits).toEqual([
    { requestId: 'stunt', key: 'stand', cells: paint(['Read'], true) },
    { requestId: 'stunt', key: 'stand', cells: paint(['Read', 'Edit']) },
  ])
})

test('with no stand up, the blink does not run', async ($, on) => {
  const asked = engine(on, ['terminal'], true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(12_000)
  expect(asked.blits).toEqual([])
})

test('the Desktop app has no Raster to blit, so its stand does not blink', async ($, on) => {
  const asked = engine(on, ['desktop'], true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await $.command.run(STUNT)).text).toBe('The pane is up. The card stunt plays in the terminal; here the pane shows the count in words.')
  await clock.advance(12_000)
  expect(asked.blits).toEqual([])
})

// Per the docs only the terminal and the Desktop app draw a mod's panes. In VS Code's chat panel the pane waits
// unplaced, as it does under a Desktop app that places none (an older one, per the declarations); claude -p places
// every pane and draws none.
const unseen = (name: string, surfaces: RenderSurface[], isPlaced: boolean) =>
  test(`${name}: /stunt answers with the count in words`, async ($, on) => {
    const asked = engine(on, surfaces, isPlaced)
    const clock = mock.clock(on)
    await $.session.start({ cwd: '/', surface: surfaces[0] ?? null, isInteractive: surfaces.length > 0 })
    await $.tool.call({ tool: 'Read', file_path: 'a' })
    expect((await $.command.run(STUNT)).text).toBe('Nothing here draws the stand; the card stunt plays in the terminal. 1 tool call so far.')
    await clock.advance(12_000)
    expect(asked.blits).toEqual([])
  })
unseen("VS Code's chat panel", ['vscode'], false)
unseen('a Desktop app that places no panes', ['desktop'], false)
unseen('claude -p', [], true)

test('after a reload, session.start blinks the stand again if it is still up', async ($, on) => {
  const asked = engine(on, ['terminal'], true, true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(4160)
  expect(asked.blits.length).toBe(2)
})

test('a second /stunt keeps one blink, not two', async ($, on) => {
  const asked = engine(on, ['terminal'], true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(STUNT)
  await $.command.run(STUNT)
  await clock.advance(4160)
  expect(asked.blits.length).toBe(2)
})

test('closing the pane in the middle of a blink leaves no follow-up flip behind', async ($, on) => {
  const asked = engine(on, ['terminal'], true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(STUNT)
  await clock.advance(4000) // eyes shut: the 160 ms timer to open them is now waiting
  expect(asked.blits).toHaveLength(1)
  asked.close() // the pane goes (the person, or an unload)
  await clock.advance(160)
  await clock.advance(12_000)
  expect(asked.blits).toHaveLength(1) // nothing painted into a pane that is gone, and the blink has stopped
})

test('a pane lookup that fails never raises out of the blink, and a closed pane does not arm a new follow-up', async ($, on) => {
  const asked = engine(on, ['terminal'], true)
  const clock = mock.clock(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(STUNT)
  asked.close()
  await clock.advance(4000) // the first flip finds the pane gone and stops the blink
  await clock.advance(160)
  await clock.advance(12_000)
  expect(asked.blits).toHaveLength(0)
})
