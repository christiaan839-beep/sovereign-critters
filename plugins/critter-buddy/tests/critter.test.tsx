import { expect, test } from 'claude-code/testing'

import type { Look, Scene } from '../types'
import { nextProp, dayKey, easterOf, festiveOf, holidayOf, hourSast, phaseOf, propsFor, seasonOf, skyFor, streakAlive, streakNext, weatherOf } from '../hooks/world'
import { PROPS, weekdayOf, cadence, suggest, moodLine, skyOf, stepFeel, FEELS, controlLabels, draftRuns, diaryMarkdown, diaryParts, NAMES_DEFAULT, cleanName, named, CAT_H, CAT_W, CRIT_W, LAPTOP_W, H, PORTRAIT_W, canvasOf, paintBigSvg, portraitCanvas, catchIn, faceRuns, faceSvg, initial, paintOrbSvg, paintSvg, paintWizardSvg, svgOf, isAsleep, paint, paintBig, paintOrb, paintWizard, quip, react, startGame, step, WIZARD_COLS } from '../hooks/scene'

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

test('a finished wizard has motes of light drifting round him, and only he does', () => {
  const solo = (o: Partial<Scene>) => canvasOf({ ...initial(), cols: 40, cx: 3, kx: -60, kdir: 1, ...o }, 40)
  const motes = (c: string[][]) => c.flat().filter(k => k === 'v').length
  const a = solo({ look: 'wizard', wt: 8, tick: 0 }); const b = solo({ look: 'wizard', wt: 8, tick: 2 })
  expect(motes(a)).toBeGreaterThanOrEqual(1)
  expect(a.map(r => r.join(''))).not.toEqual(b.map(r => r.join(''))) // they drift
  expect(motes(a)).toBeLessThanOrEqual(3) // three motes, no more
  expect(motes(solo({ look: 'idle', tick: 0 }))).toBe(0)
})

test('the footer says what is happening, and does not repeat the plugin name', async ($, on) => {
  stub(on)
  const said: (string | undefined)[] = []
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('ui.status', (_: unknown, e: { text?: string }) => { said.push(e.text); return { value: undefined } })
  await $.tool.call({ tool: 'Read' } as never)
  expect(said).toContain('reading')
  expect(said.some(x => /critter/i.test(x ?? ''))).toBe(false)
})

test('names go into every line at the last moment, and a typed name is made safe', () => {
  expect(named('{cat} and {pip}. {cat}.')).toBe('Biscuit and Pip. Biscuit.')
  expect(named('{cat} watches {pip}', { cat: 'Marmalade', pip: 'Nib' })).toBe('Marmalade watches Nib')
  expect(named('no names here')).toBe('no names here')
  expect(NAMES_DEFAULT).toEqual({ cat: 'Biscuit', pip: 'Pip' })
  expect(cleanName('  Mar<b>malade  ')).toBe('Marbmalade')
  expect(cleanName('x'.repeat(40)).length).toBe(16)
  expect(cleanName('Nib \u{1F9D9}')).toBe('Nib')
  expect(cleanName("O'Hara-Smith")).toBe("O'Hara-Smith")
  expect(cleanName('<>')).toBe('')
})

test('/critter name renames the cat everywhere, and refuses what it cannot print', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never))
  expect(await run('name cat Marmalade')).toMatch(/The cat is Marmalade/)
  expect(await run('pet')).toMatch(/Marmalade allows it/)
  expect(await run('name pip Nib')).toMatch(/wizard critter is Nib/)
  expect(await run('treat')).toMatch(/Nib is sure/)
  expect(await run('name cat')).toMatch(/Usage/)
  expect(await run('name dog Rex')).toMatch(/Usage/)
  expect(await run('name cat <>')).toMatch(/Usage/)
})

test('the wizard has three forms: by the hour, the gold star always, the violet bolt always', async ($, on) => {
  const solo = (o: Partial<Scene>) => canvasOf({ ...initial(), cols: 40, cx: 3, kx: -60, kdir: 1, look: 'wizard' as const, wt: 8, tick: 0, ...o }, 40)
  const keys = (c: string[][], k: string) => c.flat().filter(x => k.includes(x)).length
  expect(keys(solo({ form: 'gold', night: true }), 'm')).toBeGreaterThan(0) // the gold star, even at night
  expect(keys(solo({ form: 'bolt', night: false }), 'm')).toBe(0) // not the star
  expect(keys(solo({ form: 'auto', night: false }), 'm')).toBeGreaterThan(0)
  expect(keys(solo({ form: 'auto', night: true }), 'm')).toBe(0) // by night the bolt hat
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never))
  expect(await run('wizard bolt')).toMatch(/violet bolt/)
  expect(await run('wizard gold')).toMatch(/gold star/)
  expect(await run('wizard auto')).toMatch(/follows the hour/)
  expect(await run('wizard purple')).toMatch(/Usage/)
})

test('a commit, a green run, a skill and a long turn each bring the wizard out; a short turn does not', () => {
  const s = initial()
  expect(react(s, 'commit').look).toBe('wizard')
  expect(react(s, 'test').look).toBe('wizard')
  expect(react(s, 'spell').look).toBe('wizard')
  const long = react(s, 'turn', 5 * 60_000)
  expect(long.look).toBe('wizard')
  expect(react(s, 'turn', 5_000).look).toBe('done')
  // the cast is brief: after a few beats the wizard goes back to resting, or to the cup
  let c = react(s, 'commit')
  for (let i = 0; i < 14; i++) c = step(c)
  expect(c.look).toBe('idle')
  let l = { ...long, label: 'done, 3 tools' }
  for (let i = 0; i < 14; i++) l = step(l)
  expect(l.look).toBe('done')
})

test('sound plays only when asked for, and a toast greets a commit and a green run', async ($, on) => {
  stub(on)
  const played: string[] = []
  const toasts: string[] = []
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('audio.play', (_: unknown, e: { clip: { asset?: string } }) => { played.push(e.clip.asset ?? ''); return { value: undefined } })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const run = (args: string) => $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)
  await $.tool.call({ tool: 'Skill' } as never)
  await run('pet')
  expect(played).toEqual([]) // off until asked
  expect(JSON.stringify(await run('sound maybe'))).toMatch(/Usage/)
  expect(JSON.stringify(await run('sound on'))).toMatch(/Sound is on/)
  await $.tool.call({ tool: 'Skill' } as never)
  await run('pet')
  expect(played).toEqual(['sounds/cast.wav', 'sounds/purr.wav'])
  await run('sound off')
  await run('pet')
  expect(played.length).toBe(2)
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  expect(toasts.some(x => /Pip drew a star/.test(x))).toBe(true)
  expect(toasts.some(x => /Biscuit allows it/.test(x))).toBe(true)
})

test('the critter and the cat never overlap while both wander, at any width', () => {
  for (const cols of [90, 100, 130]) {
    for (const seed of [3, 7, 11]) {
      let s = { ...initial(), cols, seed, cx: 4, kx: cols - CAT_W }
      let worst = Infinity
      for (let i = 0; i < 1200; i++) {
        s = step({ ...s, idle: 0 })
        if (s.look === 'coder' || s.mode === 'sit') continue
        worst = Math.min(worst, Math.max(s.cx - (s.kx + CAT_W), s.kx - (s.cx + CRIT_W))) // the gap between them, negative if they overlap
      }
      expect(worst).toBeGreaterThanOrEqual(0)
    }
  }
})

test('/critter offers its subcommands as you type, in the cat\'s voice, and only then', () => {
  const words = (text: string, n = NAMES_DEFAULT) => suggest(text, text.length, n).map(r => r.text)
  expect(words('/critter ')).toContain('pet')
  expect(words('/critter ')).toContain('stage')
  expect(words('/critter ca')).toEqual(['cast', 'cat'])
  expect(words('/critter pet')).toEqual([]) // already whole
  expect(words('/critter cat ')).toContain('orange')
  expect(words('/critter cat ti')).toEqual([])
  expect(words('/critter cat ta')).toEqual(['tabby'])
  expect(words('/critter wizard b')).toEqual(['bolt'])
  expect(words('/critter sound ')).toEqual(['on', 'off'])
  expect(words('/critter name ')).toEqual(['cat', 'pip'])
  expect(suggest('/critter pe', 11, { cat: 'Marmalade', pip: 'Nib' })[0]!.description).toBe('Marmalade allows it')
  // not for anything else, and not away from the end of the draft
  expect(words('hello ')).toEqual([])
  expect(words('/critter')).toEqual([])
  expect(words('/diary ')).toEqual([])
  expect(suggest('/critter pe', 3)).toEqual([])
})

test('the scene steps four times a second while anything moves, and once a second when both are still', () => {
  const still = { ...initial(), look: 'idle' as const, fx: [], jt: 0, mode: 'loaf' as const }
  expect(cadence(still)).toBe(4)
  expect(cadence({ ...still, look: 'done' })).toBe(4)
  for (const look of ['reader', 'coder', 'chef', 'wizard', 'writer', 'web'] as const) expect(cadence({ ...still, look })).toBe(1)
  expect(cadence({ ...still, jt: 3 })).toBe(1)
  expect(cadence({ ...still, fx: [{ k: 'spark', x: 1, y: 1, vx: 0, vy: 0, life: 5 }] })).toBe(1)
  expect(cadence({ ...still, game: { ...still.game, on: true } })).toBe(1)
  for (const mode of ['pounce', 'knock', 'swat', 'yawn'] as const) expect(cadence({ ...still, mode })).toBe(1)
  expect(cadence({ ...still, mode: 'walk' })).toBe(4) // an idle stroll is slow enough to be seen at once a second
})

test('the cat has legs and paws, and a walking cat lifts one', () => {
  const solo = (o: Partial<Scene>) => canvasOf({ ...initial(), cols: 40, cx: -80, kx: 4, kdir: 1, mode: 'loaf' as const, variant: 'orange' as const, ...o }, 40)
  const feet = (c: string[][]) => c.slice(H - 8).flat().filter(k => k !== '.').length // the bottom eight rows: paws and the legs above them
  const pale = (c: string[][]) => c.slice(H - 5).flat().filter(k => k === 'b').length // the pale paws
  const stand = solo({ tick: 0 })
  expect(feet(stand)).toBeGreaterThan(60)
  expect(pale(stand)).toBeGreaterThanOrEqual(8)
  // walking: on the odd beat a front paw is up, so there is less cat at the bottom
  const up = solo({ mode: 'walk' as const, tick: 1 }); const down = solo({ mode: 'walk' as const, tick: 0 })
  expect(feet(up)).toBeLessThan(feet(down))
  expect(pale(up)).toBeLessThan(pale(down))
})

test('the wizard casts alone: no cauldron stands beside him, on either side', () => {
  for (const cdir of [1, -1] as const) {
    const c = canvasOf({ ...initial(), cols: 80, cx: 30, cdir, kx: -80, look: 'wizard' as const, wt: 8, tick: 0, fx: [] }, 80)
    const keys = new Set(c.flat())
    expect(keys.has('Z')).toBe(false) // the cauldron's dark body
    expect(keys.has('T')).toBe(false) // and its teal rim
  }
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
  expect(s.log[s.log.length - 1]).toMatch(/Three now/)
  s = react(s, 'error')
  expect(s.log[s.log.length - 1]).toMatch(/already watching/)
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
  expect(quip('turn', s, 12, 3_000)).toMatch(/\{cat\}|gone/)
  expect(quip('turn', s, 12, 60_000)).toMatch(/\{pip\}/)
  expect(quip('turn', s, 12, 300_000)).toMatch(/dozed|naps|moved house/)
  const rough = { ...s, stats: { ...s.stats, errors: 1 }, log: ['It failed. I was already awake. I knew.'] }
  expect(quip('turn', rough, 12, 60_000)).toMatch(/error|blames|bumpy/)
  expect(quip('greet', s, 8)).toMatch(/morning/)
  expect(quip('greet', s, 23)).toMatch(/night|glass/)
  expect(quip('greet', s, 17)).toMatch(/evening|awake/)
  // 2026-11-08 10:00 UTC is a Sunday, 12:00 in Johannesburg; the next day is Monday
  const SUN = Date.UTC(2026, 10, 8, 10)
  expect(weekdayOf(SUN)).toBe(0)
  expect(weekdayOf(SUN + 86_400_000)).toBe(1)
  expect(weekdayOf(Date.UTC(2026, 10, 8, 22, 30))).toBe(1) // 00:30 Monday in Johannesburg
  expect(quip('greet', s, 8, 0, 1)).toMatch(/monday/)
  expect(quip('greet', s, 12, 0, 5)).toMatch(/friday/)
  expect(quip('greet', s, 23, 0, 5)).toMatch(/night|glass/) // the night keeps its own lines
  expect(quip('greet', s, 17, 0, 5)).toMatch(/evening|awake/) // the weekday tints the day, not the evening
  expect(quip('turn', s, 12, 3_000)).toBe(quip('turn', { ...s }, 12, 3_000))
  const next = react(s, 'turn', 3_000)
  expect(quip('turn', next, 12, 3_000)).not.toBe('')
  expect(quip('hint', { ...s, look: 'wizard' })).toBe('{pip} is casting')
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

test('the cat speaks through the model by default, goes quiet on /critter talk off, and /critter talk says what it costs', async ($, on) => {
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
  expect(asked).toBe(1) // on by default: exactly one small call per turn
  const usage = await $.command.run({ command: 'critter', args: 'talk', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(usage)).toMatch(/costs tokens/)
  await $.command.run({ command: 'critter', args: 'talk off', origin: { kind: 'composer' }, presentation: {} } as never)
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(1) // quiet: no model call, no tokens
  const on_ = await $.command.run({ command: 'critter', args: 'talk on', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(on_)).toMatch(/one small model call/)
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(2) // exactly one call per turn
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
  expect(await seen('ToolResult', { tool_use_id: 't1', tool: 'Bash', output: {}, isErrored: true }, /Biscuit|Pip|harmed/)).toBeDefined()
  expect(await seen('ToolResult', { tool_use_id: 't1', tool: 'Bash', output: {}, isErrored: false }, /Biscuit|Pip|harmed/)).toBeUndefined()
  expect(await seen('ToolGroup', { calls: [], isActive: true, isExpanded: false }, /▐/)).toBeDefined()
  expect(await seen('TurnDuration', { word: 'Baked', durationMs: 3000 }, /Biscuit|gone/)).toBeDefined()
  expect(await seen('TurnDuration', { word: 'Baked', durationMs: 300_000 }, /dozed|naps|moved house/)).toBeDefined()
  expect(await seen('InfoNotice', { text: 'Sonnet', command: null }, /critter-buddy: .* · \/critter/)).toBeDefined()
  // lite: the band, the wizard and the orb stay; the rows of the transcript go bare
  await $.command.run({ command: 'critter', args: 'lite', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(await seen('ToolUse', use, /▐/)).toBeUndefined()
  expect(await seen('TurnDuration', { word: 'Baked', durationMs: 3000 }, /Biscuit|gone/)).toBeUndefined()
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
  expect(await ui.find({ type: 'Text', text: /☾/ })).toBeDefined() // a moon by night
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
  expect((await said('diary')).text).toMatch(/Biscuit's diary\*\*\n\nNothing yet/)
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
    expect(await ui.find({ type: 'Text', text: /Nothing yet\. Biscuit is asleep/ })).toBeDefined()
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
  expect(Math.max(...xs)).toBeGreaterThan(20) // the stretch of the bar the cat leaves it
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
  expect(e.mode).toBe('pounce'); expect(e.stats.errors).toBe(1); expect(e.log[0]).toMatch(/watching/)
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
  expect((await said('pet')).text).toMatch(/Biscuit allows it/)
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

// ---- the prompt box: the draft is painted as it is typed ----
test('a /critter draft is painted: the command in clay, a real word in teal, a stray word underlined in gold, and the word explained', () => {
  const draft = (t: string) => draftRuns(t, NAMES_DEFAULT)
  expect(draft('hello there')).toEqual([]) // other drafts are left alone
  expect(draft('/critterish')).toEqual([])
  const pet = draft('/critter pet')
  expect(pet[0]).toMatchObject({ start: 0, end: 8, color: '#d97757', bold: true })
  expect(pet[1]).toMatchObject({ start: 9, end: 12, color: '#4fa39a' })
  expect(pet[2]).toMatchObject({ start: 12, end: 12, dimColor: true })
  expect(pet[2]!.virtualText).toBe(' · Biscuit allows it') // the ghost line says what the word does
  const typo = draft('/critter petty')
  expect(typo[1]).toMatchObject({ start: 9, end: 14, color: '#d4a548', underline: true })
  expect(typo.some(r => r.virtualText)).toBe(false)
  expect(draft('/critter')[0]).toMatchObject({ start: 0, end: 8 }) // the bare command is clay and has no ghost
  expect(draft('/critter').length).toBe(1)
  // arguments: a coat is teal, a wrong coat is gold, and the ghost follows the group
  const coat = draft('/critter cat siamese')
  expect(coat[2]).toMatchObject({ start: 13, end: 20, color: '#4fa39a' })
  expect(coat.at(-1)!.virtualText).toBe(' · Biscuit in siamese')
  expect(draft('/critter cat purple')[2]).toMatchObject({ color: '#d4a548', underline: true })
  // the draft's own names follow the person's renames
  expect(draft('/critter treat').at(-1)!.virtualText).toContain('Pip')
  expect(draftRuns('/critter treat', { cat: 'Mog', pip: 'Wick' }).at(-1)!.virtualText).toContain('Wick')
  // leading whitespace is not a command, and a long draft stays within its text
  expect(draft('  /critter pet')).toEqual([])
  for (const r of draft('/critter name cat Biscuit the Great')) expect(r.end).toBeLessThanOrEqual('/critter name cat Biscuit the Great'.length)
})

test('the prompt edit answer carries the paint, and a failing paint never holds up the keystroke', async ($, on) => {
  stub(on)
  on('prompt.edit', (_, e: { text: string; cursor: number }) => ({ text: e.text, cursor: e.cursor }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const out = (await $.prompt.edit({ text: '/critter pet', inputText: '/critter pet', cursor: 12, start: 12, end: 12 } as never)) as { text: string; decorations?: { color?: string }[] }
  expect(out.text).toBe('/critter pet')
  expect(out.decorations?.[0]?.color).toBe('#d97757')
  const plain = (await $.prompt.edit({ text: 'fix the bug', inputText: 'fix the bug', cursor: 11, start: 11, end: 11 } as never)) as { decorations?: unknown[] }
  expect(plain.decorations ?? []).toEqual([]) // an ordinary prompt is not touched
})

// ---- the diary ----
test("the diary is read as markdown: a time in code, the line plain, the newest first, and the header says whose it is", () => {
  expect(diaryParts('09:14 Biscuit allows it.')).toEqual({ time: '09:14', text: 'Biscuit allows it.' })
  expect(diaryParts('09:14  two spaces')).toEqual({ time: '09:14', text: 'two spaces' })
  expect(diaryParts('no time here')).toEqual({ time: '', text: 'no time here' })
  const md = diaryMarkdown(['08:01 first', '09:14 second', 'plain'], NAMES_DEFAULT)
  expect(md.split('\n')[0]).toBe("**Biscuit's diary** · 3 lines")
  expect(md).toContain('- `09:14` second')
  expect(md).toContain('- plain')
  expect(md.indexOf('second')).toBeLessThan(md.indexOf('first')) // newest first
  expect(diaryMarkdown([], NAMES_DEFAULT)).toBe("**Biscuit's diary**\n\nNothing yet. Biscuit was asleep.")
  expect(diaryMarkdown(Array.from({ length: 30 }, (_, i) => `10:${String(i).padStart(2, '0')} l${i}`), NAMES_DEFAULT).split('\n').filter(l => l.startsWith('- ')).length).toBe(12)
  expect(diaryMarkdown(['09:00 `code` and *stars*'], NAMES_DEFAULT)).toContain('\\`code\\` and \\*stars\\*') // a line cannot break the markdown
})

// ---- the band's controls: a status line, one row of buttons, and no margins (the desktop does not count them) ----
test('the band puts its status on one line and its buttons on the next, and uses spacer rows, never margins', async ($, on) => {
  stub(on)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const status = (await ui.find({ key: 'status' })) as { props?: Record<string, unknown> } | undefined
    expect(status?.props).toMatchObject({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' })
    expect(await ui.find({ type: 'Text', text: /^ready$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^· cat / })).toBeDefined()
    const bar = (await ui.find({ key: 'controls' })) as { props?: Record<string, unknown> } | undefined
    expect(bar?.props).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' })
    expect(bar?.props?.marginTop).toBeUndefined() // a margin is lost to the desktop's measure and clips the row beneath
    expect(bar?.props?.marginBottom).toBeUndefined()
    const others = (await ui.find({ key: 'others' })) as { props?: Record<string, unknown> } | undefined
    expect(others?.props?.marginTop).toBeUndefined()
    expect(await ui.find({ key: 'gap' })).toBeDefined() // a whole row of air before other mods' rows
    await ui.unmount()
  }
})

test('the buttons say what is true now: a sulking cat is made up with, a casting wizard is not asked to cast, and there is a nap', async ($, on) => {
  const base = { ...initial(), look: 'idle' as Look }
  expect(controlLabels(base, 'unbothered', NAMES_DEFAULT)).toEqual({ pet: 'pet Biscuit', feed: 'feed Biscuit', cast: 'Pip casts', nap: 'nap', corner: 'the corner' })
  expect(controlLabels(base, 'sulking', NAMES_DEFAULT).pet).toBe('make up with Biscuit')
  expect(controlLabels({ ...base, look: 'wizard' }, 'pleased', NAMES_DEFAULT).cast).toBe('Pip is casting')
  expect(controlLabels(base, 'pleased', { cat: 'Mog', pip: 'Wick' })).toMatchObject({ pet: 'pet Mog', cast: 'Wick casts' })
  stub(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const nap = (await ui.find({ key: 'nap' })) as { props?: { hotkey?: string; label?: string } } | undefined
  expect(nap?.props).toMatchObject({ hotkey: 'n', label: 'nap' })
  await ui.unmount()
})

// ---- the feel dial ----
test('calm keeps the pair still, warm is the usual, playful hops more; the feel only changes how they move', () => {
  expect(FEELS).toEqual(['calm', 'warm', 'playful'])
  const run = (feel: 'calm' | 'warm' | 'playful', n = 4000) => {
    let s: Scene = { ...initial(), cols: 60, look: 'idle', idle: 0 }
    let hops = 0
    for (let i = 0; i < n; i++) {
      const was = s.jt
      s = { ...stepFeel(s, feel), idle: Math.min(s.idle + 1, 60) } // kept awake: the idle clock never reaches sleep
      if (was === 0 && s.jt > 0) hops++
    }
    return hops
  }
  const [calm, warm, playful] = [run('calm'), run('warm'), run('playful')]
  expect(calm).toBe(0)
  expect(warm).toBeGreaterThan(0)
  expect(playful).toBeGreaterThan(warm)
  // warm is the plain step, bit for bit
  const base = { ...initial(), cols: 60 }
  expect(stepFeel(base, 'warm')).toEqual(step(base))
  // calm lets no spark or heart live, however they were made, and keeps the z of a sleeper
  const hot = react({ ...initial(), cols: 60 }, 'pet')
  expect(hot.fx.some(f => f.k === 'heart')).toBe(true)
  const cooled = stepFeel(hot, 'calm')
  expect(cooled.fx.some(f => f.k === 'heart' || f.k === 'spark')).toBe(false)
  expect(stepFeel(react({ ...initial(), cols: 60 }, 'spell'), 'playful').fx.some(f => f.k === 'spark')).toBe(true)
})

test('/critter feel sets the dial, says so, offers its words, and calm silences sound', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const said = async (args: string) => ((await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }).text ?? ''
  expect(await said('feel')).toMatch(/Usage: \/critter feel calm \| warm \| playful/)
  expect(await said('feel loud')).toMatch(/Usage/)
  expect(await said('feel calm')).toMatch(/Calm/)
  expect(await said('feel playful')).toMatch(/Playful/)
  expect(suggest('/critter feel ', 14).map(r => r.text)).toEqual(['calm', 'warm', 'playful'])
  expect(suggest('/critter ', 9).map(r => r.text)).toContain('feel')
  expect(draftRuns('/critter feel calm', NAMES_DEFAULT)[2]).toMatchObject({ color: '#4fa39a' })
  expect(draftRuns('/critter feel loud', NAMES_DEFAULT)[2]).toMatchObject({ color: '#d4a548', underline: true })
})

// ---- the family in the prompt box, the moods in words, the sky behind the chat ----
test('the family commands are painted too: /diary, /stunt and /everywhere, each with its own ghost line', () => {
  const draft = (t: string) => draftRuns(t, NAMES_DEFAULT)
  const diary = draft('/diary')
  expect(diary[0]).toMatchObject({ start: 0, end: 6, color: '#d97757', bold: true })
  expect(diary.at(-1)).toMatchObject({ start: 6, end: 6, dimColor: true, virtualText: ' · what Claude did, in order' })
  expect(draft('/diary copy')[1]).toMatchObject({ start: 7, end: 11, color: '#4fa39a' })
  expect(draft('/diary copy').at(-1)!.virtualText).toBe(' · the whole session, as markdown')
  expect(draft('/diary clone')[1]).toMatchObject({ color: '#d4a548', underline: true })
  expect(draft('/stunt').at(-1)!.virtualText).toBe(' · the critter in a pane, a card per call')
  expect(draft('/everywhere').at(-1)!.virtualText).toBe(' · your three most-used tools')
  expect(draft('/diaryish')).toEqual([])
  expect(draft('/critter').length).toBe(1) // the bare /critter stays quiet, as before
})

test('the moods are said in words as well as bars', () => {
  expect(moodLine('trust', 12)).toBe('trust █░░░░░░░░░ 12 · wary')
  expect(moodLine('trust', 50)).toContain('· warming')
  expect(moodLine('trust', 70)).toContain('· fond')
  expect(moodLine('trust', 95)).toContain('· devoted')
  expect(moodLine('joy', 10)).toContain('· flat')
  expect(moodLine('joy', 50)).toContain('· content')
  expect(moodLine('joy', 70)).toContain('· bright')
  expect(moodLine('joy', 90)).toContain('· delighted')
  expect(moodLine('joy', 150)).toContain('100') // out of range is held to the scale
})

test('the sky: a sun by day and a moon by night, a horizon either way, and the stars stay put', () => {
  expect(skyOf('day')).toMatchObject({ body: '●', bodyColor: '#d4a548', ground: '#f2eee3', paper: '#faf9f5' })
  expect(skyOf('night')).toMatchObject({ body: '☾', bodyColor: '#efe4c4', ground: '#1c1b19', paper: '#141413' })
  expect(skyOf('night').stars.length).toBe(22)
  expect(JSON.stringify(skyOf('night').stars)).toBe(JSON.stringify(skyOf('night').stars))
  expect(skyOf('day').stars.length).toBe(0)
})

test('the stage names whose it is and what hour, and the corner shows the moods in words', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const stage = await $.ui.mount({ plugin: 'critter-buddy', component: 'Pane', requestId: 'stage', props: { bodyColumns: 60 }, surface: 'desktop' } as never)
  expect(await stage.find({ type: 'Text', text: /Pip's stage · night/ })).toBeDefined() // the stub clock reads 03:00
  await stage.unmount()
  const corner = await $.ui.mount({ plugin: 'critter-buddy', component: 'Pane', requestId: 'cat-corner', props: { bodyColumns: 60 }, surface: 'desktop' } as never)
  expect(await corner.find({ type: 'Text', text: /trust .* · (wary|warming|fond|devoted)/ })).toBeDefined()
  expect(await corner.find({ type: 'Text', text: /joy .* · (flat|content|bright|delighted)/ })).toBeDefined()
  await corner.unmount()
})

// ---- the world: the hour, the season, the holidays, the session's weather, the streak, the props, the long wait ----
const sast = (y: number, m: number, d: number, h = 10) => Date.UTC(y, m - 1, d, h - 2) // h is the hour in Johannesburg

test('the hour sets the phase, the month the season (the southern hemisphere\'s), and the day is the Johannesburg day', () => {
  expect([3, 5, 6, 7, 12, 16, 17, 18, 19, 23].map(phaseOf)).toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'day', 'dusk', 'dusk', 'night', 'night'])
  expect(hourSast(sast(2026, 11, 8, 23))).toBe(23)
  expect(dayKey(Date.UTC(2026, 10, 8, 22, 30))).toBe('2026-11-09') // half past midnight in Johannesburg
  expect([sast(2026, 12, 1), sast(2027, 2, 28), sast(2027, 3, 1), sast(2027, 6, 1), sast(2027, 9, 1), sast(2027, 11, 30)].map(seasonOf)).toEqual(['summer', 'summer', 'autumn', 'winter', 'spring', 'spring'])
})

test('the public holidays are found, Easter moves, and one on a Sunday is kept on the Monday', () => {
  expect(easterOf(2027)).toEqual({ m: 3, d: 28 })
  expect(easterOf(2026)).toEqual({ m: 4, d: 5 })
  expect(holidayOf(sast(2027, 9, 24))?.key).toBe('heritage')
  expect(holidayOf(sast(2027, 3, 26))?.key).toBe('good-friday') // two days before Easter Sunday
  expect(holidayOf(sast(2027, 3, 29))?.key).toBe('family-day')
  expect(holidayOf(sast(2027, 3, 21))?.key).toBe('human-rights') // a Sunday in 2027
  expect(holidayOf(sast(2027, 3, 22))?.key).toBe('human-rights') // so Monday is kept too
  expect(holidayOf(sast(2026, 12, 25))?.line).toMatch(/lights/)
  expect(holidayOf(sast(2026, 11, 9))).toBeUndefined()
  expect(festiveOf(sast(2026, 12, 14))).toBe(true)
  expect(festiveOf(sast(2026, 12, 13))).toBe(false)
  expect(festiveOf(sast(2027, 1, 1))).toBe(true)
  expect(festiveOf(sast(2027, 1, 2))).toBe(false)
})

test('the weather is the pair\'s joy: errors darken it, good news clears it, and no forecast is asked for', () => {
  expect([80, 60, 59, 45, 44, 25, 24, 0].map(weatherOf)).toEqual(['clear', 'clear', 'cloud', 'cloud', 'rain', 'rain', 'storm', 'storm'])
  let s = initial()
  expect(weatherOf(s.joy)).toBe('clear')
  for (let i = 0; i < 5; i++) s = react(s, 'error')
  expect(weatherOf(s.joy)).toBe('rain') // five errors: 60 - 30
  s = react(react(s, 'test'), 'commit')
  expect(weatherOf(s.joy)).toBe('rain') // 30 + 6 + 8 = 44: not yet
  s = react(s, 'treat')
  expect(weatherOf(s.joy)).toBe('cloud') // a treat lifts it the rest of the way
})

test('the sky is made of the hour, the season, the weather and the lights, and each draws something different', () => {
  const night = skyFor({ phase: 'night', season: 'winter', weather: 'clear', festive: false })
  expect(night.stars.length).toBeGreaterThan(10)
  expect(night.key).toBe('night-winter-clear-plain')
  const storm = skyFor({ phase: 'night', season: 'summer', weather: 'storm', festive: true })
  expect(storm.bodyHidden).toBe(true)
  expect(storm.stars).toHaveLength(0)
  expect(storm.rain.length).toBeGreaterThan(40)
  expect(storm.bolt).toBeDefined()
  expect(storm.lights).toBe(true)
  const dawn = skyFor({ phase: 'dawn', season: 'spring', weather: 'cloud', festive: false })
  expect(dawn.bodyTop).toBeGreaterThan(skyFor({ phase: 'day', season: 'spring', weather: 'clear', festive: false }).bodyTop) // the sun is low at dawn
  expect(dawn.clouds).toHaveLength(3)
  expect(new Set(['day', 'dawn', 'dusk', 'night'].map(p => skyFor({ phase: p as 'day', season: 'summer', weather: 'clear', festive: false }).paper)).size).toBe(4)
})

test('the streak grows by one a day, counts a day once, restarts after a missed day, and the props come at 3, 7, 14 and 30', () => {
  let st = streakNext(undefined, '2026-11-08')
  expect(st).toEqual({ days: 1, last: '2026-11-08' })
  expect(streakNext(st, '2026-11-08')).toBe(st)
  st = streakNext(st, '2026-11-09')
  expect(st.days).toBe(2)
  expect(streakNext(st, '2026-11-11')).toEqual({ days: 1, last: '2026-11-11' })
  expect(streakNext({ days: 5, last: '2026-12-31' }, '2027-01-01').days).toBe(6) // across the year
  expect(streakAlive(st, '2026-11-09')).toBe(2)
  expect(streakAlive(st, '2026-11-10')).toBe(2) // yesterday still counts until today is over
  expect(streakAlive(st, '2026-11-11')).toBe(0) // a missed day ends it
  expect(streakAlive(undefined, '2026-11-11')).toBe(0)
  expect([0, 2, 3, 7, 14, 30].map(d => propsFor(d))).toEqual([[], [], ['yarn'], ['yarn', 'cushion'], ['yarn', 'cushion', 'plant'], ['yarn', 'cushion', 'plant', 'lamp']])
})

test('a streak puts props on the bar behind the pair, and a long call sends the cat to the window', () => {
  const s = { ...initial(), cols: 96, mode: 'loaf' as const }
  const bare = canvasOf(s, 96)
  const dressed = canvasOf({ ...s, streak: 30 }, 96)
  expect(dressed.flat().filter(k => k !== '.').length).toBeGreaterThan(bare.flat().filter(k => k !== '.').length)
  for (const p of Object.values(PROPS)) expect(new Set(p.map(r => r.length)).size).toBe(1) // every prop is a clean rectangle
  const waiting = react(s, 'wait')
  expect(waiting.mode).toBe('walk')
  expect(waiting.target).toBe(96 - CAT_W)
  expect(waiting.log.at(-1)).toMatch(/window/)
})

test('the greeting says the holiday and the streak, and the night keeps its own lines', () => {
  const s = { ...initial(), streak: 5 }
  expect(quip('greet', s, 9, 0, 5, 'Heritage Day. a braai')).toMatch(/^Heritage Day\. a braai · day 5 together · \/critter$/)
  expect(quip('greet', s, 23, 0, 5, 'Heritage Day. a braai')).toMatch(/night|glass/)
  expect(quip('greet', { ...initial(), streak: 1 }, 9, 0, 1)).not.toMatch(/together/) // a streak of one is not a streak
})

test('the corner and the stage are centred, with spacer rows, and the corner says the days and the next prop', async ($, on) => {
  stub(on)
  expect(nextProp(0)).toEqual({ prop: 'yarn', inDays: 3 })
  expect(nextProp(5)).toEqual({ prop: 'cushion', inDays: 2 })
  expect(nextProp(29)).toEqual({ prop: 'lamp', inDays: 1 })
  expect(nextProp(30)).toBeUndefined()
  for (const surface of ['terminal', 'desktop'] as const) {
    const corner = await $.ui.mount({ ...PANE, surface })
    for (const k of ['head', 'art', 'streak', 'actions']) {
      const box = (await corner.find({ key: k })) as { props?: Record<string, unknown> } | undefined
      expect(box?.props).toMatchObject({ flexDirection: 'row', justifyContent: 'center' })
    }
    expect(await corner.find({ type: 'Text', text: /come back tomorrow/ })).toBeDefined() // no streak yet
    for (const k of ['g1', 'g2', 'g3', 'g4']) expect(await corner.find({ key: k })).toBeDefined()
    await corner.unmount()
    const stage = await $.ui.mount({ ...PANE, requestId: 'stage', surface })
    for (const k of ['head', 'art', 'status', 'actions']) {
      const box = (await stage.find({ key: k })) as { props?: Record<string, unknown> } | undefined
      expect(box?.props).toMatchObject({ justifyContent: 'center' })
    }
    await stage.unmount()
  }
})
