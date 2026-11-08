import { expect, test } from 'claude-code/testing'

import type { Look, Scene } from '../types'
import { CAT_H, CAT_W, CRIT_W, LAPTOP_W, H, PORTRAIT_W, canvasOf, paintBigSvg, portraitCanvas, catchIn, faceRuns, faceSvg, initial, paintOrbSvg, paintSvg, paintWizardSvg, svgOf, isAsleep, paint, paintBig, paintOrb, paintWizard, quip, react, startGame, step, WIZARD_COLS } from '../hooks/scene'

test('the cat sprite is rectangular, sixteen by twenty, in every pose', () => {
  const base = { ...initial(), cols: 40, cx: -40, kx: 6 }
  for (const mode of ['loaf', 'walk', 'follow', 'alert', 'pounce', 'knock', 'swat', 'yawn', 'sulk', 'sit', 'purr'] as const) {
    for (const tick of [0, 1, 28, 36]) {
      const canvas = canvasOf({ ...base, mode, tick }, 40)
      expect(canvas.length).toBe(H)
      expect(canvas.every(r => r.length === 40)).toBe(true)
    }
  }
  // the sprite itself: no row shorter than the others
  const rows = canvasOf({ ...base, mode: 'loaf', tick: 0 }, 40).filter(r => r.some(k => k !== '.'))
  expect(rows.length).toBeGreaterThanOrEqual(CAT_H)
})

test('the portrait holds the critter and a whole cat, tail and ears included, in a narrow pane', () => {
  const canvas = portraitCanvas({ ...initial(), cols: 40 })
  const inkCols = (from: number) => new Set(canvas.flatMap(r => r.map((k, x) => (k !== '.' && x >= from ? x : -1)).filter(x => x >= 0))).size
  expect(inkCols(PORTRAIT_W - CAT_W - 2)).toBeGreaterThanOrEqual(CAT_W) // the cat's every column is on the canvas
  expect(canvas.every(r => r.length === PORTRAIT_W)).toBe(true)
  expect(paintBigSvg({ ...initial(), cols: 40 }).width).toBe(PORTRAIT_W * 8)
})

test("the critter is the site's own sprite: built up from the brim, antennae by night, lightning off the staff, legs that walk", () => {
  const solo = (o: Partial<Scene>) => canvasOf({ ...initial(), cols: 30, cx: 3, kx: -60, kdir: 1, ...o }, 30)
  const ink = (c: string[][], keys?: string) => c.flat().filter(k => k !== '.' && (!keys || keys.includes(k))).length
  // the hat builds up cell by cell as the wizard comes in
  const built = [0, 2, 4, 6, 8].map(wt => ink(solo({ look: 'wizard', wt })))
  for (let i = 1; i < built.length; i++) expect(built[i]).toBeGreaterThanOrEqual(built[i - 1]!)
  expect(built[4]! - built[0]!).toBeGreaterThan(150)
  // the hat is the founders' purple and the star is gold
  expect(ink(solo({ look: 'wizard', wt: 8 }), '89a')).toBeGreaterThan(40)
  expect(ink(solo({ look: 'wizard', wt: 8 }), 'm')).toBeGreaterThan(0)
  expect(ink(solo({ look: 'idle' }), '89a')).toBe(0)
  // the orb throws lightning once he casts, and not before
  expect(ink(solo({ look: 'wizard', wt: 8, tick: 0 }), 'tr')).toBeGreaterThan(5)
  expect(ink(solo({ look: 'wizard', wt: 5, tick: 0 }), 'tr')).toBe(0)
  expect(ink(solo({ look: 'idle', tick: 0 }), 'tr')).toBe(0)
  // by night the critter wears antennae
  expect(ink(solo({ look: 'idle', night: true }))).toBeGreaterThan(ink(solo({ look: 'idle', night: false })))
  // a step lifts alternate pairs of legs
  const legs = (tick: number) => solo({ look: 'reader', tick }).slice(-6).map(r => r.join('')).join('|')
  expect(legs(2)).not.toBe(legs(3))
})

test('the critter has no outline of its own, and the laptop sparkles as it types', () => {
  const solo = (o: Partial<Scene>) => canvasOf({ ...initial(), cols: 50, cx: 3, kx: -60, kdir: 1, ...o }, 50)
  const crit = solo({ look: 'idle', tick: 3 })
  // the critter's first row of ink starts with its body colours, never the old dark ring '5'
  expect(crit.flat().includes('5')).toBe(false)
  // at the laptop: a dark screen with a few spark cells, and they move
  const a = solo({ look: 'coder', tick: 0 }); const b = solo({ look: 'coder', tick: 3 })
  expect(a.flat().filter(k => k === 'v').length).toBeGreaterThanOrEqual(2)
  expect(a.map(r => r.join(''))).not.toEqual(b.map(r => r.join('')))
  expect(a.flat().filter(k => k === 'q').length).toBeGreaterThan(30) // the lit edge and the deck
  expect(solo({ look: 'idle', tick: 0 }).flat().includes('q')).toBe(false)
})

test('the critter wears what the work needs: a cap and a magnifier to read, a chef hat and a pan to build, a cup when it is done', () => {
  const solo = (o: Partial<Scene>) => canvasOf({ ...initial(), cols: 60, cx: 3, kx: -60, kdir: 1, tick: 0, ...o }, 60)
  const count = (c: string[][], keys: string) => c.flat().filter(k => keys.includes(k)).length
  expect(count(solo({ look: 'reader' }), 'cp')).toBeGreaterThan(30) // the deerstalker
  expect(count(solo({ look: 'reader' }), 'z')).toBeGreaterThan(5) // the lens
  expect(count(solo({ look: 'idle' }), 'cpz')).toBe(0)
  expect(count(solo({ look: 'chef' }), 'WY')).toBeGreaterThan(40) // the chef's hat
  expect(count(solo({ look: 'chef' }), 'G')).toBeGreaterThanOrEqual(3) // sparks off the pan
  expect(count(solo({ look: 'idle' }), 'WY')).toBe(0)
  expect(count(solo({ look: 'done' }), 'YB')).toBeGreaterThan(10) // the coffee cup, steam above it
  expect(count(solo({ look: 'coder' }), 'YB')).toBe(0)
  // a cook stays at the stove: it does not walk off
  let s = solo({ look: 'chef', cx: 10 }) && ({ ...initial(), cols: 100, look: 'chef' as const, cx: 10 })
  for (let i = 0; i < 40; i++) s = step(s)
  expect(s.cx).toBe(10)
  // a reader keeps walking, looking about
  let r = { ...initial(), cols: 100, look: 'reader' as const, cx: 10 }
  for (let i = 0; i < 40; i++) r = step({ ...r, idle: 0 })
  expect(r.cx).not.toBe(10)
})

test('a build puts the critter in the chef hat, a plain command at the laptop, a read in the cap', async ($, on) => {
  stub(on)
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('ui.status', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const lookAfter = async (tool: string, command?: string) => {
    await $.tool.call({ tool, ...(command ? { command } : {}) } as never)
    return /"look":"(\w+)"/.exec(JSON.stringify(kept.get('critter-buddy.scene')))?.[1]
  }
  expect(await lookAfter('Bash', 'npm run build')).toBe('chef')
  expect(await lookAfter('Bash', 'git status')).toBe('coder')
  expect(await lookAfter('Read')).toBe('reader')
  expect(await lookAfter('Skill')).toBe('wizard')
})

test('the cat never sits on top of the critter or its laptop, whichever way the critter faces', () => {
  for (const cdir of [1, -1] as const) for (const cx of [4, 20, 44]) for (const mode of ['sit', 'follow'] as const) {
    let s = { ...initial(), cols: 140, look: 'coder' as const, cx, cdir, mode, kx: 100, idle: 0 }
    for (let i = 0; i < 80; i++) s = { ...step(s), look: 'coder', mode, mt: 0, idle: 0, cx, cdir }
    const cat = [s.kx, s.kx + CAT_W]
    const critter = [cx, cx + CRIT_W]
    const laptop = cdir === 1 ? [cx + CRIT_W - 2, cx + CRIT_W - 2 + LAPTOP_W] : [cx - LAPTOP_W + 2, cx + 2]
    const touches = (a: number[], b: number[]) => a[0]! < b[1]! && b[0]! < a[1]!
    expect(touches(cat, critter)).toBe(false)
    if (mode === 'sit') expect(touches(cat, laptop)).toBe(false)
  }
})

test('a turn begins with the wizard on the bar, and the turn ends with the critter done', async ($, on) => {
  stub(on)
  on('prompt.submit', (_, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.status', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const look = () => /"look":"(\w+)"/.exec(JSON.stringify(kept.get('critter-buddy.scene')))?.[1]
  await $.prompt.submit({ text: 'hello', inputText: 'hello' } as never)
  expect(look()).toBe('wizard')
  await $.turn.complete({ answer: 'done' } as never)
  expect(look()).toBe('done')
})

test('/critter stage opens a stage with the critter alone on it, on every surface', async ($, on) => {
  stub(on)
  const opened: string[] = []
  on('ui.open', (_: unknown, e: { id: string }) => { opened.push(e.id); return { value: undefined } })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(JSON.stringify(await $.command.run({ command: 'critter', args: 'stage', origin: { kind: 'composer' }, presentation: {} } as never))).toMatch(/stage is open/)
  expect(opened).toEqual(['stage'])
  const pane = { plugin: 'critter-buddy', component: 'Pane', requestId: 'stage', props: { bodyColumns: 60 } }
  const term = await $.ui.mount({ ...pane, surface: 'terminal' } as never)
  expect(await term.find({ type: 'Text', text: /[▀▄]/ })).toBeDefined()
  expect(await term.find({ key: 'spell' })).toBeDefined()
  await term.unmount()
  const desk = await $.ui.mount({ ...pane, surface: 'desktop' } as never)
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /[▀▄]/ })).toBeUndefined()
  expect(await desk.find({ key: 'close' })).toBeDefined()
  await desk.unmount()
})

test('the wizard paces beside the orb while Claude works, and stays inside his frame', () => {
  const s = { ...initial(), cols: 40 }
  // the empty cells left of his leftmost pixel, over all rows: one more when he steps right
  const gap = (tick: number) =>
    Math.min(...paintWizard({ ...s, tick }).map(r => (r[0] && r[0].fg === undefined ? r[0].text.length : 0)))
  expect(gap(5)).toBe(gap(0) + 1) // a cell to the right after five ticks
  expect(gap(10)).toBe(gap(0)) // and back
  for (const t of [0, 5, 10, 15]) expect(paintWizard({ ...s, tick: t }).every(r => r.reduce((n, c) => n + c.text.length, 0) === WIZARD_COLS)).toBe(true)
})

test('the cat keeps count and curls up to sleep', () => {
  let s = initial()
  for (let i = 0; i < 3; i++) s = react(s, 'error')
  expect(s.log[s.log.length - 1]).toMatch(/three/)
  s = react(s, 'error')
  expect(s.log[s.log.length - 1]).toMatch(/already awake/)
  let t = initial()
  for (let i = 0; i < 10; i++) t = react(t, 'commit')
  expect(t.log[t.log.length - 1]).toMatch(/Ten/)
  // awake it is a loaf; asleep it is a lower, curled ball with its ears flat
  const awake = { ...initial(), cols: 40, cx: -40, kx: 6, mode: 'loaf' as const, idle: 0 }
  const asleep = { ...awake, idle: 150 }
  const ink = (c: string[][]) => c.filter(r => r.some(k => k !== '.')).length
  expect(ink(paint({ ...asleep, tick: 0 }) as never)).toBeDefined()
  const rows = (x: typeof awake) => paint(x).filter(r => r.some(c => c.fg)).length
  expect(rows(asleep)).toBeLessThan(rows(awake))
})

test('the cat sits up facing you, in every coat, and /critter cat takes them all', async ($, on) => {
  const base = { ...initial(), cols: 40, cx: -40, kx: 6, mode: 'loaf' as const }
  const colours = (v: Scene['variant']) => new Set(paint({ ...base, variant: v }).flatMap(r => r.map(c => c.fg).filter(Boolean)))
  for (const v of ['tabby', 'ginger', 'black', 'tuxedo', 'cream', 'grey', 'siamese'] as const) expect(colours(v).size).toBeGreaterThan(2)
  expect(colours('black')).not.toEqual(colours('cream'))
  // awake it is the cat of the sheet (nine text rows with its outline, at least); asleep it is a low ball
  const tall = (idle: number) => paint({ ...base, idle }).filter(r => r.some(c => c.fg)).length
  expect(tall(0)).toBeGreaterThanOrEqual(9)
  expect(tall(150)).toBeLessThan(tall(0))
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const out = await $.command.run({ command: 'critter', args: 'cat siamese', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(out)).toMatch(/siamese/)
})

test('the voice follows what happened and the hour, and the same scene always says the same line', () => {
  const s = initial()
  expect(quip('turn', s, 12, 3_000)).toMatch(/cat|gone/)
  expect(quip('turn', s, 12, 60_000)).toMatch(/wizard/)
  expect(quip('turn', s, 12, 300_000)).toMatch(/dozed|naps|moved house/)
  const rough = { ...s, stats: { ...s.stats, errors: 1 }, log: ['It failed. I was already awake. I knew.'] }
  expect(quip('turn', rough, 12, 60_000)).toMatch(/error|blames|bumpy/)
  expect(quip('greet', s, 8)).toMatch(/morning/)
  expect(quip('greet', s, 23)).toMatch(/night|glass/)
  expect(quip('greet', s, 17)).toMatch(/evening|awake/)
  expect(quip('turn', s, 12, 3_000)).toBe(quip('turn', { ...s }, 12, 3_000))
  const next = react(s, 'turn', 3_000)
  expect(quip('turn', next, 12, 3_000)).not.toBe('')
  expect(quip('hint', { ...s, look: 'wizard' })).toBe('the wizard is casting')
  expect(quip('hint', { ...s, look: 'idle', idle: 150 })).toBe('both asleep')
  expect(quip('ask', { ...s, trust: 10 })).toMatch(/opinions/)
})

const SPINNER = {
  plugin: 'critter-buddy',
  component: 'Spinner',
  requestId: 'main',
  props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' },
} as const

const BAND = {
  plugin: 'critter-buddy',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 14, bodyColumns: 70, scroll: { offset: 0, bodyRows: 14 }, view: {} },
} as const
const PANE = {
  plugin: 'critter-buddy',
  component: 'Pane',
  requestId: 'cat-corner',
  props: { title: 'Cat corner', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// An in-memory $.state, so an update reads what the last one wrote.
const kept = new Map<string, { value: unknown; version: number }>()
const stub = (on: any) => {
  kept.clear()
  on('state.get', (_: unknown, e: { plugin: string; key: string }) => ({ value: kept.get(`${e.plugin}.${e.key}`) ?? { value: undefined, version: 0 } }))
  on('state.set', (_: unknown, e: { plugin: string; key: string; value: unknown; ifVersion?: number }) => {
    const id = `${e.plugin}.${e.key}`
    const now = kept.get(id)?.version ?? 0
    if (e.ifVersion !== undefined && e.ifVersion !== now) return { value: { isSet: false, version: now } }
    kept.set(id, { value: e.value, version: now + 1 })
    return { value: { isSet: true, version: now + 1 } }
  })
  on('clock.now', () => ({ value: 1_000_000_000_000 }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
}

test('the band draws the pair and its buttons on every surface', async ($, on) => {
  stub(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /ready/ })).toBeDefined()
    expect(await ui.find({ key: 'pet' })).toBeDefined()
    expect(await ui.find({ key: 'treat' })).toBeDefined()
    await ui.unmount()
  }
})

test('the wizard stands left of the thinking orb and keeps the engine\'s own line', async ($, on) => {
  stub(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...SPINNER, surface })
    expect(await ui.find({ type: 'Text', text: /engine/ })).toBeDefined() // the orb's line is still drawn
    // the wizard's pixels beside it: half-block text in a terminal, crisp vector art everywhere else
    if (surface === 'terminal') expect(await ui.find({ type: 'Text', text: /[▀▄]/ })).toBeDefined()
    else {
      expect(await ui.find({ type: 'Svg' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /[▀▄]/ })).toBeUndefined() // no glyph smear on the desktop
    }
    await ui.unmount()
  }
})

test('the cat speaks through the model only when told to, and /critter talk says what it costs', async ($, on) => {
  stub(on)
  let asked = 0
  on('ui.status', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => { asked++; return { value: { isAnswered: true, text: 'Back to the loaf.\nignored line', usage: {} } } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(0) // off by default: no model call, no tokens
  const usage = await $.command.run({ command: 'critter', args: 'talk', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(usage)).toMatch(/costs tokens/)
  const on_ = await $.command.run({ command: 'critter', args: 'talk on', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(on_)).toMatch(/one small model call/)
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(1) // exactly one call per turn
  await $.command.run({ command: 'critter', args: 'talk off', origin: { kind: 'composer' }, presentation: {} } as never)
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(1)
})

test('the staff answers a press: the cast button and its hotkey make the wizard cast, on every surface', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    for (const [key, hot] of [['pet', 'p'], ['treat', 't'], ['cast', 'c'], ['corner', 'k']] as const) {
      const b = (await ui.find({ key })) as { props?: { hotkey?: string } } | undefined
      expect(b).toBeDefined()
      expect(b?.props?.hotkey).toBe(hot)
    }
    await ui.press({ key: 'cast' } as never)
    await ui.unmount()
  }
})

test('the cat looks up when you type, and the keystroke is never held up', async ($, on) => {
  stub(on)
  on('prompt.edit', (_, e: { text: string; cursor: number }) => ({ text: e.text, cursor: e.cursor }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const out = await $.prompt.edit({ text: 'hel', inputText: 'hel', cursor: 3, start: 3, end: 3 } as never)
  expect(JSON.stringify(out)).toMatch(/hel/) // the draft passes through untouched
})

test('vector art is the same pixels as the cell art: one rect per run, trimmed, and no empty rows', () => {
  const colour = (k: string) => (k === 'a' ? '#111111' : '#222222')
  const canvas = [['.', '.', '.', '.'], ['a', 'a', 'b', '.'], ['.', 'a', '.', '.'], ['.', '.', '.', '.']]
  const out = svgOf(canvas, colour, 5)
  expect(out.width).toBe(20)
  expect(out.height).toBe(10) // the empty top and bottom rows are trimmed
  expect(out.source.match(/<rect /g)?.length).toBe(3) // 'aa' is one rect, 'b' another, the lower 'a' a third
  expect(out.source).toContain('width="10" height="5" fill="#111111"')
  expect(out.source.startsWith('<svg ')).toBe(true)
  // the real sprites survive the trip: a cat on the bar gives rects and keeps its palette
  const s = { ...initial(), cols: 40, cx: -40, kx: 6 }
  const cat = paintSvg(s, 5)
  expect(cat.source.match(/<rect /g)?.length).toBeGreaterThan(40)
  expect(cat.height).toBeGreaterThanOrEqual(CAT_H * 5)
  for (const kind of ['run', 'ok', 'err', 'rest'] as const) expect(faceSvg(kind, 1).source).toContain('<rect')
  expect(faceSvg('ok', 1).source).not.toBe(faceSvg('err', 1).source)
  expect(paintOrbSvg(0).source).not.toBe(paintOrbSvg(3).source) // the shine breathes
  expect(paintWizardSvg(initial()).width).toBe(WIZARD_COLS * 5)
})

test('on the desktop the band, the faces and the portrait are SVG, never block glyphs', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Svg' })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /[▀▄]/ })).toBeUndefined()
  expect(await band.find({ key: 'pet' })).toBeDefined() // the buttons are still real buttons
  await band.unmount()
  const use = { tool_use_id: 't1', tool: 'Bash', input: {}, isRunning: false, isErrored: false, isInterrupted: false }
  const faced = await $.ui.mount({ plugin: 'critter-buddy', component: 'ToolUse', requestId: 'r1', props: use, surface: 'desktop' } as never)
  expect(await faced.find({ type: 'Svg' })).toBeDefined()
  await faced.unmount()
})

const row = (component: string, props: Record<string, unknown>, requestId = 'r1') =>
  ({ plugin: 'critter-buddy', component, requestId, props }) as never

test('every row of the transcript wears a face by what the call did, and lite takes them off', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const use = { tool_use_id: 't1', tool: 'Bash', input: {}, isRunning: false, isErrored: false, isInterrupted: false }
  const seen = async (component: string, props: Record<string, unknown>, text: RegExp) => {
    const ui = await $.ui.mount({ ...row(component, props), surface: 'terminal' } as never)
    const found = await ui.find({ type: 'Text', text })
    await ui.unmount()
    return found
  }
  expect(await seen('ToolUse', use, /▐▪█▪▌|▐\^█\^▌/)).toBeDefined() // a finished call: happy eyes
  expect(await seen('ToolUse', { ...use, isErrored: true }, /×/)).toBeDefined()
  expect(await seen('ToolResult', { tool_use_id: 't1', tool: 'Bash', output: {}, isErrored: true }, /cat|wizard|harmed/)).toBeDefined()
  expect(await seen('ToolResult', { tool_use_id: 't1', tool: 'Bash', output: {}, isErrored: false }, /cat|wizard|harmed/)).toBeUndefined()
  expect(await seen('ToolGroup', { calls: [], isActive: true, isExpanded: false }, /▐/)).toBeDefined()
  expect(await seen('TurnDuration', { word: 'Baked', durationMs: 3000 }, /cat|gone/)).toBeDefined()
  expect(await seen('TurnDuration', { word: 'Baked', durationMs: 300_000 }, /dozed|naps|moved house/)).toBeDefined()
  expect(await seen('InfoNotice', { text: 'Sonnet', command: null }, /critter-buddy: .* · \/critter/)).toBeDefined()
  // lite: the band, the wizard and the orb stay; the rows of the transcript go bare
  await $.command.run({ command: 'critter', args: 'lite', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(await seen('ToolUse', use, /▐/)).toBeUndefined()
  expect(await seen('TurnDuration', { word: 'Baked', durationMs: 3000 }, /cat|gone/)).toBeUndefined()
  // party: messages wear a face as well
  await $.command.run({ command: 'critter', args: 'party', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(await seen('AssistantMessage', { text: 'hello', isFirstOfReply: true }, /▐/)).toBeDefined()
  expect(await seen('AssistantMessage', { text: 'hello', isFirstOfReply: false }, /▐/)).toBeUndefined()
})

test('the backdrop is cream by day and a starry glass by night, and only for this mod', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true }) // the stub clock reads 03:00, so night
  const ui = await $.ui.mount({ ...row('Backdrop', { id: 'night', plugin: 'critter-buddy', glass: { blur: 18, opacity: 0.6 } }), surface: 'desktop' } as never)
  expect(await ui.find({ type: 'Text', text: /[✦·]/ })).toBeDefined()
  await ui.unmount()
  const other = await $.ui.mount({ ...row('Backdrop', { id: 'x', plugin: 'someone-else', glass: false }), surface: 'desktop' } as never)
  expect(await other.find({ type: 'Text', text: /engine/ })).toBeDefined() // another plugin's backdrop is left alone
  await other.unmount()
})

test('the model can read the cat\'s diary, and the diary command says what is in it', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ran = (await $.tool.call({ tool: 'mcp__critter-buddy__cat_diary' } as never)) as { result?: string }
  expect(ran.result).toMatch(/The cat is (unbothered|pleased|devoted|sulking)/)
  expect(ran.result).toMatch(/diary is empty/)
  const said = async (args: string) =>
    (await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }
  expect((await said('diary')).text).toMatch(/empty/)
  expect((await said('lite')).text).toMatch(/Lite/)
  expect((await said('full')).text).toMatch(/Full/)
  expect((await said('party')).text).toMatch(/Party/)
})

test('the face has eyes for working, done, failed and resting, and the orb breathes', () => {
  const eyes = (k: 'run' | 'ok' | 'err' | 'rest', t = 1) => faceRuns(k, t).map(r => r.text).join('')
  expect(eyes('run')).toBe('▐▪█▪▌'); expect(eyes('run', 0)).toBe('▐·█·▌')
  expect(eyes('ok')).toBe('▐^█^▌'); expect(eyes('err')).toBe('▐×█×▌'); expect(eyes('rest')).toBe('▐-█-▌')
  const orb = (t: number) => JSON.stringify(paintOrb(t))
  expect(paintOrb(0).length).toBe(4)
  expect(orb(0)).not.toBe(orb(3)) // the shine breathes
  expect(orb(0)).toBe(orb(6))
})

test('the wizard is drawn alone, at the size of the sprite, hat and staff included', () => {
  const rows = paintWizard(at({ cols: 80, night: false }))
  // the film sprite at twice its size: a 14-pixel critter under a 14-pixel hat, a staff beside them
  expect(rows.length).toBeGreaterThanOrEqual(12)
  expect(rows.length).toBeLessThanOrEqual(H / 2)
  for (const r of rows) expect(r.reduce((n, x) => n + x.text.length, 0)).toBe(WIZARD_COLS)
  expect(JSON.stringify(rows)).not.toBe(JSON.stringify(paintWizard(at({ cols: 80, night: true }))))
})

test('the cat corner draws moods, the diary and the game, and the pet button works', async ($, on) => {
  stub(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /trust/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Nothing happened yet/ })).toBeDefined()
    expect(await ui.find({ key: 'play' })).toBeDefined()
    await ui.press({ key: 'p' })
    await ui.unmount()
  }
})

const at = (o: Partial<Scene>): Scene => ({ ...initial(), ...o })
const flat = (s: Scene) => paint(s).map(r => r.map(x => x.text + x.fg + x.bg).join('')).join('|')
const looks: Look[] = ['idle', 'wizard', 'reader', 'coder', 'writer', 'web', 'done']
const run = (s: Scene, n: number) => { for (let i = 0; i < n; i++) s = step(s); return s }

test('every look in every cat mode draws, each row as wide as the bar', () => {
  for (const look of looks)
    for (const mode of ['loaf', 'walk', 'alert', 'pounce', 'follow', 'sit', 'purr', 'yawn', 'swat', 'sulk', 'knock'] as const)
      for (const r of paint(at({ look, mode, cols: 70, jt: 4 }))) expect(r.reduce((n, x) => n + x.text.length, 0)).toBe(70)
})

test('the critter walks, turns at both ends, jumps, and sits still at the laptop', () => {
  let s = at({ cols: 100 }) // room for a 30-pixel cat and the critter's walk beside it
  const xs = new Set<number>()
  let jumped = false
  for (let i = 0; i < 600; i++) { s = step(s); xs.add(s.cx); jumped ||= s.jt > 0; expect(s.cx).toBeGreaterThanOrEqual(0) }
  expect(Math.min(...xs)).toBe(0)
  expect(Math.max(...xs)).toBeGreaterThan(30)
  expect(jumped).toBe(true)
  expect(run(at({ look: 'coder', cx: 10 }), 20).cx).toBe(10)
})

test('the critter naps when it is quiet, and wakes for work', () => {
  const quiet = run(at({ idle: 105 }), 9)
  expect(isAsleep(quiet)).toBe(true)
  expect(quiet.fx.some(f => f.k === 'z')).toBe(true)
  expect(isAsleep({ ...quiet, look: 'reader', idle: 0 })).toBe(false)
})

test('the cat sleeps, wakes, wanders, sits on the laptop and follows when it wants attention', () => {
  const modes = new Set<string>()
  let s = at({ cols: 80 })
  for (let i = 0; i < 700; i++) { s = step(s); modes.add(s.mode) }
  expect(modes.has('loaf') && modes.has('walk')).toBe(true)
  expect(run(at({ look: 'coder', mode: 'loaf', mt: 5 }), 2).mode).toBe('sit')
  expect(run(at({ idle: 130, mt: 40, trust: 70 }), 1).mode).toBe('follow')
  expect(run(at({ trust: 10, mt: 20 }), 1).mode).toBe('sulk')
})

test('the cat finds a cup on the bar and knocks it off, and the diary hears of it', () => {
  let s = at({ cols: 80, kx: 40, tick: 79 })
  let knocked = false
  for (let i = 0; i < 400 && !knocked; i++) { s = { ...step(s), idle: 0 }; knocked = s.stats.knocks > 0 }
  expect(knocked).toBe(true)
  expect(s.log.some(l => /cup/.test(l))).toBe(true)
})

test('what happens in the session changes how they act, and the cat says so', () => {
  const e = react(at({}), 'error')
  expect(e.mode).toBe('pounce'); expect(e.stats.errors).toBe(1); expect(e.log[0]).toMatch(/knew/)
  expect(react(at({}), 'test').jt).toBe(1)
  expect(react(at({}), 'commit').stats.commits).toBe(1)
  expect(react(at({}), 'deny').mode).toBe('swat')
  expect(react(at({}), 'ask').mode).toBe('alert')
  const long = react(at({}), 'turn', 5 * 60_000)
  expect(long.mode).toBe('yawn'); expect(long.log[0]).toMatch(/5 minutes/)
  expect(react(at({}), 'turn', 1000).mode).toBe('loaf')
  const p = react(at({ trust: 50 }), 'pet')
  expect(p.mode).toBe('purr'); expect(p.trust).toBe(56); expect(p.fx.length).toBeGreaterThan(0)
  expect(react(at({ trust: 99 }), 'pet').trust).toBe(100)
  expect(isAsleep(react(at({}), 'nap'))).toBe(true)
  expect(react(at({}), 'spell').look).toBe('wizard')
  expect(react(at({ trust: 10 }), 'pet').log[0]).toMatch(/angry/)
})

test('the treat game scores a catch in the right lane and not in the wrong one', () => {
  let g = startGame(at({}))
  expect(g.game.on).toBe(true)
  g = run(g, 6)
  const miss = catchIn(g, ((g.game.lane + 1) % 3) as 0 | 1 | 2)
  expect(miss.game.score).toBe(0)
  const hit = catchIn(g, g.game.lane)
  expect(hit.game.score).toBe(1); expect(hit.game.best).toBe(1); expect(hit.game.row).toBe(0)
  expect(catchIn(at({}), 0).game.score).toBe(0)
})

test('night, level 2, coats, facing, the pot and the portrait each change the picture', () => {
  const w = at({ look: 'wizard', wt: 8 })
  expect(flat(w)).not.toBe(flat({ ...w, night: true }))
  expect(flat(w)).not.toBe(flat({ ...w, variant: 'brown' }))
  expect(flat(w)).not.toBe(flat({ ...w, cdir: -1 }))
  expect(flat(at({ look: 'idle' }))).not.toBe(flat(w))
  // a narrow pane draws the portrait one cell to a pixel; a wide one doubles it. The cat is whole either way.
  const narrow = paintBig(at({ cols: 40 }))
  expect(narrow.length).toBeLessThanOrEqual(H / 2) // empty rows above the cat are trimmed
  expect(narrow.length).toBeGreaterThanOrEqual(CAT_H / 2)
  expect(narrow[0]!.reduce((n, x) => n + x.text.length, 0)).toBe(PORTRAIT_W)
  const wide = paintBig(at({ cols: PORTRAIT_W * 2 }))
  expect(wide.length).toBe(H)
  expect(wide[0]!.reduce((n, x) => n + x.text.length, 0)).toBe(PORTRAIT_W * 2)
})

test("the band keeps another mod's row beneath it", async ($, on) => {
  stub(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /engine/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ready/ })).toBeDefined()
  await ui.unmount()
})

test('/critter takes its subcommands and leaves /pet to the mod that owns it', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const said = async (args: string) =>
    (await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }
  expect((await said('pet')).text).toMatch(/petted/)
  expect((await said('treat')).text).toMatch(/treat/)
  expect((await said('nap')).text).toMatch(/asleep/)
  expect((await said('spell')).text).toMatch(/cast/)
  expect((await said('cat brown')).text).toMatch(/brown/)
  expect((await said('cat purple')).text).toMatch(/Usage/)
  expect((await said('nonsense')).text).toMatch(/Usage/)
  expect((await said('')).text).toMatch(/hidden/) // bare /critter toggles
  expect((await said('hide')).text).toMatch(/hidden/) // hide never brings them back
  expect((await said('show')).text).toMatch(/back/)
  expect((await said('show')).text).toMatch(/back/) // show never hides them
})

test('the wizard hat and staff build up frame by frame, and the night critter has antennae', () => {
  const frames = Array.from({ length: 9 }, (_, wt) => flat(at({ look: 'wizard', wt })))
  expect(new Set(frames).size).toBe(9) // every frame of the build-up is a different picture
  expect(flat(at({ look: 'wizard', wt: 8 }))).toBe(flat(at({ look: 'wizard', wt: 30 }))) // then it holds
  expect(flat(at({ look: 'wizard', wt: 8, night: true }))).not.toBe(flat(at({ look: 'wizard', wt: 8 })))
  expect(flat(at({ night: true }))).not.toBe(flat(at({}))) // antennae
  expect(run(at({ look: 'wizard' }), 5).wt).toBe(5)
  expect(run(at({ look: 'reader', wt: 5 }), 1).wt).toBe(0)
  expect(react(at({ wt: 7 }), 'spell').wt).toBe(0) // casting again replays the build-up
})

test('after a turn the pair settle and can nap again; the nap button always puts them to sleep', () => {
  const done = run(at({ look: 'done', idle: 0 }), 26)
  expect(done.look).toBe('idle')
  expect(isAsleep(run(done, 80))).toBe(true)
  expect(isAsleep(react(at({ look: 'coder' }), 'nap'))).toBe(true)
})

test('a taken command name does not stop the mod from starting', async ($, on) => {
  stub(on)
  on('command.register', () => ({ deny: 'the plugin snoozing-pet registered it already' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: { trust: 40, lastSeen: 1_000_000_000_000 - 3 * 86_400_000 } }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'pet' })).toBeDefined()
  await ui.unmount()
})
