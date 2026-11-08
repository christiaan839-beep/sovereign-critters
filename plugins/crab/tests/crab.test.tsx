import { expect, mock, test } from 'claude-code/testing'

import { CRAB_W, MAX_NOTES, MAX_NOTE, bandLines, cellsOf, cleanNote, cleanNotes, crabRows, crabSvg, dropNote, fit, holdNote, hashOf, labelFor } from '../hooks/note'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80, scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const
const SURFACES = ['terminal', 'desktop'] as const
const NOW = Date.UTC(2026, 10, 8, 12, 0, 0)
const DAY = 86_400_000

// ---- the pure parts ----------------------------------------------------------

test('a folder is remembered by a short hash, never by its path', () => {
  const a = hashOf('/srv/projects/atlas')
  expect(a).toMatch(/^[0-9a-z]{1,7}$/)
  expect(hashOf('/srv/projects/atlas')).toBe(a) // the same folder, the same key, every session
  expect(hashOf('/srv/projects/atlas2')).not.toBe(a)
  expect(a).not.toMatch(/srv|atlas|projects/)
})

test('a note is one clean line of at most 120 characters', () => {
  expect(cleanNote('  fix the\n\tlogin   redirect  ')).toBe('fix the login redirect')
  expect(cleanNote('a\u0000b\u0007c\u007fd')).toBe('abcd') // control characters go
  expect(cleanNote('\u001b[31mred\u001b[0m text')).toBe('red text') // so do colour codes: a note cannot paint the band
  expect(cleanNote('x'.repeat(MAX_NOTE))).toBe('x'.repeat(MAX_NOTE)) // exactly the cap stays whole
  expect(cleanNote('x'.repeat(MAX_NOTE + 1))).toBe('x'.repeat(MAX_NOTE)) // one over is cut
  expect([...cleanNote('🦀'.repeat(200))]).toHaveLength(MAX_NOTE) // counted in characters, never cutting one in half
  expect(cleanNote('   \n\t ')).toBe('')
  expect(cleanNote(undefined)).toBe('')
  expect(cleanNote(42)).toBe('')
  expect(MAX_NOTE).toBe(120)
})

test('the store is read with suspicion: a bad entry is dropped, a bad store is empty, and fifty folders are kept, the newest', () => {
  expect(cleanNotes(undefined)).toEqual({})
  expect(cleanNotes('nope')).toEqual({})
  expect(cleanNotes([1, 2])).toEqual({})
  expect(cleanNotes({ a: { text: 'ok', at: 5 }, b: { text: '', at: 5 }, c: { text: 'x', at: 'late' }, d: 7, e: { text: 'y' }, f: { text: 'z', at: NaN } })).toEqual({ a: { text: 'ok', at: 5 } })
  expect(cleanNotes({ neg: { text: 'x', at: -1 }, zero: { text: 'y', at: 0 } })).toEqual({ zero: { text: 'y', at: 0 } }) // time starts at 0: a negative one is not a time
  expect(cleanNotes({ a: { text: '\u001b[1mbold\u001b[0m   one', at: 1 } })).toEqual({ a: { text: 'bold one', at: 1 } }) // cleaned again on the way in
  const many = Object.fromEntries(Array.from({ length: MAX_NOTES + 10 }, (_, i) => [`k${i}`, { text: `n${i}`, at: i }]))
  const kept = cleanNotes(many)
  expect(Object.keys(kept)).toHaveLength(MAX_NOTES)
  expect(kept.k0).toBeUndefined() // the oldest ten went
  expect(kept[`k${MAX_NOTES + 9}`]).toBeDefined()
  expect(MAX_NOTES).toBe(50)
})

test('holding replaces the note of that folder, dropping removes it, and a full store makes room by letting the oldest go', () => {
  let notes = holdNote({}, 'a', 'first', 1)
  notes = holdNote(notes, 'a', 'second', 2)
  expect(notes).toEqual({ a: { text: 'second', at: 2 } })
  expect(dropNote(notes, 'a')).toEqual({})
  expect(dropNote(notes, 'zzz')).toEqual(notes) // dropping what is not there is no harm
  let full: Record<string, { text: string; at: number }> = {}
  for (let i = 0; i < MAX_NOTES; i++) full = holdNote(full, `k${i}`, 'n', i + 10)
  full = holdNote(full, 'new', 'n', 1000)
  expect(Object.keys(full)).toHaveLength(MAX_NOTES)
  expect(full.k0).toBeUndefined()
  expect(full.new).toBeDefined()
  expect(holdNote({}, 'a', '   ', 1)).toEqual({}) // an empty note holds nothing
})

test('a line is cut to the cell, with an ellipsis, exactly at the edge, counting wide characters twice', () => {
  expect(cellsOf('abc')).toBe(3)
  expect(cellsOf('🦀')).toBe(2)
  expect(cellsOf('日本')).toBe(4)
  expect(cellsOf('é')).toBe(1) // a combining mark takes no cell
  expect(fit('abcde', 5)).toBe('abcde') // fits exactly
  expect(fit('abcdef', 5)).toBe('abcd…') // one over: cut, and the ellipsis is the fifth cell
  expect(fit('abcdef', 1)).toBe('…')
  expect(fit('abcdef', 0)).toBe('')
  expect(fit('日本語', 5)).toBe('日本…') // 4 + 1
  expect(fit('日本語', 6)).toBe('日本語')
  expect(fit('日本語x', 6)).toBe('日本…')
  for (const w of [1, 2, 3, 7, 20, 41]) expect(cellsOf(fit('the quick brown fox jumps over the lazy dog, again and again', w))).toBeLessThanOrEqual(w)
})

test('the crab says "you left this" for a note from an earlier session and "holding" for one from now', () => {
  expect(labelFor(100, 200)).toBe('you left this:')
  expect(labelFor(200, 200)).toBe('holding:') // held in the very moment the session began: this session's
  expect(labelFor(300, 200)).toBe('holding:')
})

test('the band is two lines that never exceed the width they are given, at every width', () => {
  const note = { text: 'ask Mira which migration she ran before the deploy, and whether the seed file changed', at: 1 }
  for (const width of [8, 20, 40, 68, 120]) {
    const { line, hint } = bandLines(note, 'you left this:', width)
    expect(cellsOf(line)).toBeLessThanOrEqual(width)
    expect(cellsOf(hint)).toBeLessThanOrEqual(width)
    expect(line.startsWith('you left this:') || width < 16).toBe(true)
    expect(line).not.toMatch(/\n/)
  }
  expect(bandLines({ text: 'short', at: 1 }, 'holding:', 40).line).toBe('holding: short') // short stays whole, no ellipsis
  expect(bandLines({ text: 'short', at: 1 }, 'holding:', 14).line).toBe('holding: short') // exactly 14 cells
  expect(bandLines({ text: 'short', at: 1 }, 'holding:', 13).line).toBe('holding: sho…') // one cell less
  expect(bandLines({ text: 'short', at: 1 }, 'holding:', 40).hint).toBe('/crab drop when it is done')
})

test('the crab is our own drawing: three rows twelve cells wide in the pair\'s clay, with a paper in a claw', () => {
  const rows = crabRows()
  expect(rows).toHaveLength(3)
  for (const row of rows) expect(row.reduce((n, r) => n + cellsOf(r.text), 0)).toBe(CRAB_W)
  const colours = new Set(rows.flat().flatMap(r => [r.fg, r.bg]).filter(Boolean))
  for (const c of colours) expect(['#d97757', '#b9573a', '#ec9b78', '#141413', '#faf9f5']).toContain(c) // the pair's own palette
  expect(colours.has('#faf9f5')).toBe(true) // the paper
  expect(rows.map(r => r.map(x => x.text).join(''))).toEqual(['▄▀▀     █▄█ ', ' ▀▀▀████▀█▀ ', ' ▄▀█▀██▀█▀▄ ']) // the drawing, pinned: a change to it is a decision
  const svg = crabSvg(4)
  expect(svg.width).toBe(CRAB_W * 4)
  expect(svg.height).toBe(6 * 4) // six pixel rows
  expect(svg.source).toMatch(/^<svg /)
  expect(svg.source).not.toMatch(/<script|href|on[a-z]+=/i)
})

// ---- the band and the commands -----------------------------------------------

const keep = (on: (...a: never[]) => void, seed: Record<string, unknown> = {}) => {
  const store: Record<string, unknown> = { ...seed }
  const writes: unknown[] = []
  ;(on as any)('store.get', (_: unknown, e: { key: string }) => ({ value: store[e.key] }))
  ;(on as any)('store.set', (_: unknown, e: { key: string; value: unknown }) => { store[e.key] = e.value; writes.push(e.value); return { value: undefined } })
  ;(on as any)('command.register', () => ({ value: { command: 'crab' } }))
  ;(on as any)('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  ;(on as any)('ui.render', ($: any, e: any) => { const { Text } = $.ui.resolve(e); return <Text>the engine's own band</Text> }) // what the crab stacks under
  return { store, writes }
}
const run = ($: any, args: string) => $.command.run({ command: 'crab', args, origin: { kind: 'composer' }, presentation: {} }).then((r: { text?: string }) => r.text ?? '')
const begin = ($: any, cwd = '/work/atlas') => $.session.start({ cwd, surface: 'terminal', isInteractive: true })

test('with no note the crab draws nothing at all and the engine\'s own band goes through untouched', async ($, on) => {
  mock.clock(on, { now: NOW })
  keep(on)
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: "the engine's own band" })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /holding|you left this/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('/crab hold keeps a note for this folder under a hash, the band shows it, and /crab drop puts it down', async ($, on) => {
  mock.clock(on, { now: NOW })
  const { store } = keep(on)
  await begin($, '/work/atlas')
  expect(await run($, '')).toMatch(/holding nothing/i)
  expect(await run($, 'hold   ask Mira about\nthe seed file ')).toMatch(/^Held: ask Mira about the seed file/)
  const saved = store.notes as Record<string, { text: string; at: number }>
  expect(Object.keys(saved)).toEqual([hashOf('/work/atlas')]) // keyed by the hash
  expect(JSON.stringify(store)).not.toMatch(/work|atlas/) // and the path appears nowhere in what is kept
  expect(saved[hashOf('/work/atlas')]).toEqual({ text: 'ask Mira about the seed file', at: NOW })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab', surface, ...BAND })
    expect((await ui.find({ type: 'Text', text: /^holding:/ }))?.text).toBe('holding: ask Mira about the seed file')
    expect(await ui.find({ type: 'Text', text: '/crab drop when it is done' })).toBeDefined()
    await ui.unmount()
  }
  expect(await run($, '')).toMatch(/ask Mira about the seed file/)
  expect(await run($, 'drop')).toMatch(/put it down/i)
  expect(store.notes).toEqual({})
  expect(await run($, '')).toMatch(/holding nothing/i)
  expect(await run($, 'drop')).toMatch(/nothing to put down/i)
})

test('a note held in one folder is not shown in another, and a new session in the folder says "you left this"', async ($, on) => {
  mock.clock(on, { now: NOW })
  const seed = { notes: { [hashOf('/work/atlas')]: { text: 'rebase before the review', at: NOW - 2 * DAY } } }
  keep(on, seed)
  await begin($, '/work/other')
  expect(await run($, '')).toMatch(/holding nothing/i)
  await begin($, '/work/atlas') // a new session in the folder
  const ui = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND })
  expect((await ui.find({ type: 'Text', text: /^you left this:/ }))?.text).toBe('you left this: rebase before the review')
  await ui.unmount()
  expect(await run($, '')).toMatch(/rebase before the review/)
})

test('a note held now is "holding", and holding again replaces it', async ($, on) => {
  mock.clock(on, { now: NOW })
  keep(on, { notes: { [hashOf('/work/atlas')]: { text: 'old', at: NOW - DAY } } })
  await begin($, '/work/atlas')
  await run($, 'hold new one')
  const ui = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND })
  expect((await ui.find({ type: 'Text', text: /^holding:/ }))?.text).toBe('holding: new one')
  await ui.unmount()
})

test('the band never wraps: at any width the line is cut with an ellipsis and the crab keeps its place', async ($, on) => {
  mock.clock(on, { now: NOW })
  keep(on)
  await begin($)
  await run($, 'hold ' + 'long note '.repeat(30))
  for (const bodyColumns of [30, 50, 80, 130]) {
    const ui = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns } })
    const t = (await ui.find({ type: 'Text', text: /^holding:/ }))?.text ?? ''
    expect(cellsOf(t)).toBeLessThanOrEqual(Math.max(8, bodyColumns - CRAB_W - 2))
    expect(t.length).toBeGreaterThan(8)
    await ui.unmount()
  }
  const wide = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 200 } })
  expect([...((await wide.find({ type: 'Text', text: /^holding:/ }))?.text ?? '')].length).toBeLessThanOrEqual(MAX_NOTE + 'holding: '.length) // and never past the 120-character cap
  await wide.unmount()
})

test('the desktop draws the crab as a picture and the terminal as half blocks', async ($, on) => {
  mock.clock(on, { now: NOW })
  keep(on)
  await begin($)
  await run($, 'hold remember the milk')
  const term = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND })
  expect(await term.find({ type: 'Text', text: /[▀▄█]/ })).toBeDefined()
  expect(await term.find({ type: 'Svg' })).toBeUndefined()
  await term.unmount()
  const desk = await $.ui.mount({ plugin: 'crab', surface: 'desktop', ...BAND })
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  await desk.unmount()
})

test('the band steps aside for a survey', async ($, on) => {
  mock.clock(on, { now: NOW })
  keep(on)
  await begin($)
  await run($, 'hold remember the milk')
  const ui = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /holding/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: "the engine's own band" })).toBeDefined()
  await ui.unmount()
})

test('/crab says how to use it for a word it does not know and for a hold with no words', async ($, on) => {
  mock.clock(on, { now: NOW })
  const { store } = keep(on)
  await begin($)
  expect(await run($, 'hold')).toMatch(/Usage: \/crab hold <text>/)
  expect(await run($, 'hold    ')).toMatch(/Usage: \/crab hold <text>/)
  expect(await run($, 'wave')).toMatch(/Usage: \/crab \[hold <text> \| drop\]/)
  expect(store.notes).toBeUndefined() // nothing was written
})

test('a long note is held at 120 characters and the reply says it was shortened', async ($, on) => {
  mock.clock(on, { now: NOW })
  const { store } = keep(on)
  await begin($)
  expect(await run($, 'hold ' + 'a'.repeat(120))).not.toMatch(/shortened/i)
  expect(await run($, 'hold ' + 'a'.repeat(121))).toMatch(/shortened to 120/i)
  expect(((store.notes as Record<string, { text: string }>)[hashOf('/work/atlas')]!).text).toHaveLength(120)
})

test('a store that is damaged, will not read, or will not write never stops the crab or a prompt', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'crab' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('store.get', () => { throw new Error('disk on fire') })
  on('store.set', () => { throw new Error('disk on fire') })
  on('ui.render', ($: any, e: any) => { const { Text } = $.ui.resolve(e); return <Text>the engine's own band</Text> })
  await begin($) // does not throw
  expect(await run($, '')).toMatch(/holding nothing/i)
  expect(await run($, 'hold remember the milk')).toMatch(/could not keep/i) // told, not thrown
  expect(await run($, 'drop')).toMatch(/could not|nothing to put down/i)
  const ui = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: "the engine's own band" })).toBeDefined() // nothing was kept, so nothing is drawn
  await ui.unmount()
})

test('a folder the crab was never told about cannot hold a note', async ($, on) => {
  mock.clock(on, { now: NOW })
  const { store } = keep(on)
  expect(await run($, 'hold remember the milk')).toMatch(/does not know this folder/i) // no session.start yet
  expect(store.notes).toBeUndefined()
})

test('even in a window too narrow for the crab the line keeps eight cells, and a second folder\'s note does not disturb the first', async ($, on) => {
  mock.clock(on, { now: NOW })
  const { store } = keep(on)
  await begin($, '/work/atlas')
  await run($, 'hold the first one, a long enough note')
  const ui = await $.ui.mount({ plugin: 'crab', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 10 } })
  const t = (await ui.find({ type: 'Text', text: /^holding/ }))?.text ?? ''
  expect(cellsOf(t)).toBe(8) // never narrower than eight cells, however narrow the window
  await ui.unmount()
  await begin($, '/work/other')
  await run($, 'hold the second one')
  expect(Object.keys(store.notes as object).sort()).toEqual([hashOf('/work/atlas'), hashOf('/work/other')].sort()) // both kept
  await run($, 'drop') // puts down only this folder's
  expect(Object.keys(store.notes as object)).toEqual([hashOf('/work/atlas')])
})
