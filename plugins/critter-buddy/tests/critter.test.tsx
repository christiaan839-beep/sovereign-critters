import { expect, test } from 'claude-code/testing'

import type { Look, Scene } from '../types'
import { thinkingOf, nudgeFor, RIDGE, RIDGE_FAR, dueForWait, LONG_CALL, skyArgsOf, nextProp, dayKey, easterOf, festiveOf, holidayOf, hourSast, phaseOf, propsFor, seasonOf, skyFor, streakAlive, streakNext, weatherOf } from '../hooks/world'
import { homeOf, FULL_MARK, cleanVoice, riskLine, stepLine, plainRuns, usageLine, PROPS, weekdayOf, cadence, suggest, moodLine, skyOf, stepFeel, FEELS, controlLabels, draftRuns, diaryMarkdown, diaryParts, NAMES_DEFAULT, cleanName, named, CAT_H, CAT_W, CRIT_W, LAPTOP_W, H, PORTRAIT_W, canvasOf, paintBigSvg, portraitCanvas, catchIn, faceRuns, faceSvg, initial, paintOrbSvg, paintSvg, paintWizardSvg, svgOf, isAsleep, paint, paintBig, paintOrb, paintWizard, quip, react, startGame, step, WIZARD_COLS } from '../hooks/scene'

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
  for (const cdir of [1, -1] as const) for (const cx of [homeOf(140)!.lo, homeOf(140)!.hi]) for (const mode of ['sit', 'follow'] as const) {
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
      let s = { ...initial(), cols, seed, cx: homeOf(cols)!.lo, kx: homeOf(cols)!.catMax } // settled in their own stretches
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

test('the cat is silent until asked: no model call by default, one small call a turn after /critter talk on, none again after off', async ($, on) => {
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
  expect(asked).toBe(0) // off by default: a mod does not spend tokens until it is asked to
  const usage = await $.command.run({ command: 'critter', args: 'talk', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(usage)).toMatch(/costs tokens/)
  expect(JSON.stringify(usage)).toMatch(/off until you turn it on/)
  const on_ = await $.command.run({ command: 'critter', args: 'talk on', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(on_)).toMatch(/one small model call/)
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(1) // exactly one call per turn
  await $.command.run({ command: 'critter', args: 'talk off', origin: { kind: 'composer' }, presentation: {} } as never)
  await $.turn.complete({ answer: 'done' } as never)
  expect(asked).toBe(1) // quiet again: no model call, no tokens
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
  let s = at({ cols: 100, cx: homeOf(100)!.lo, kx: homeOf(100)!.catMax }) // the right-hand stretch is his: ten cells to pace
  const xs = new Set<number>()
  let jumped = false
  for (let i = 0; i < 600; i++) { s = step(s); xs.add(s.cx); jumped ||= s.jt > 0; expect(s.cx).toBeGreaterThanOrEqual(0) }
  expect(Math.min(...xs)).toBe(homeOf(100)!.lo) // he turns at both ends of it
  expect(Math.max(...xs)).toBe(homeOf(100)!.hi)
  expect(jumped).toBe(true)
  expect(run(at({ look: 'coder', cx: 10 }), 20).cx).toBe(10)
  // in a band too narrow for a side each he still walks the bar from end to end, as before
  let n = at({ cols: 60 })
  const nx = new Set<number>()
  for (let i = 0; i < 600; i++) { n = step(n); nx.add(n.cx) }
  expect(Math.min(...nx)).toBe(0)
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
  expect(controlLabels(base, 'unbothered', NAMES_DEFAULT)).toEqual({ pet: 'pet Biscuit', feed: 'feed Biscuit', cast: 'Pip casts', nap: 'nap', corner: 'the corner', mods: 'mods' })
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
  expect(FEELS).toEqual(['calm', 'warm', 'playful', 'still'])
  const run = (feel: 'calm' | 'warm' | 'playful' | 'still', n = 4000) => {
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
  expect(await said('feel')).toMatch(/Usage: \/critter feel calm \| warm \| playful \| still/)
  expect(await said('feel loud')).toMatch(/Usage/)
  expect(await said('feel calm')).toMatch(/Calm/)
  expect(await said('feel playful')).toMatch(/Playful/)
  expect(suggest('/critter feel ', 14).map(r => r.text)).toEqual(['calm', 'warm', 'playful', 'still'])
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
  expect([80, 60, 59, 45, 44, 25, 24, 0].map(j => weatherOf(j))).toEqual(['clear', 'clear', 'cloud', 'cloud', 'rain', 'rain', 'storm', 'storm'])
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
  expect(storm.rain.length).toBeGreaterThan(20) // a storm is rain, thinned in 0.21.1 so the transcript stays readable under it
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

test('a call past 20 seconds is due once, each call in flight keeps its own clock, and the sky args follow the hour, the season and the joy', () => {
  const a = { since: 1000, waiting: false }
  const b = { since: 1000 + LONG_CALL, waiting: false }
  expect(dueForWait([a, b], 1000 + LONG_CALL)).toBe(false) // exactly 20 s is not yet past it
  expect(dueForWait([a, b], 1000 + LONG_CALL + 1)).toBe(true) // a is long
  expect(a.waiting).toBe(true)
  expect(b.waiting).toBe(false)
  expect(dueForWait([a, b], 1000 + LONG_CALL + 5)).toBe(false) // a is not counted twice, b is not yet long
  expect(dueForWait([a, b], 1000 + 2 * LONG_CALL + 1)).toBe(true) // b is long on its own clock
  expect(dueForWait([], 5)).toBe(false)
  expect(skyArgsOf(Date.UTC(2026, 10, 8, 10), 10)).toEqual({ phase: 'day', season: 'spring', weather: 'storm', festive: false, glow: false })
  expect(skyArgsOf(Date.UTC(2026, 10, 8, 10), 10, 0, true).glow).toBe(true)
})

test('the backdrop draws the session weather: a low-spirited pair gets rain and no sun, a happy one a clear sky', async ($, on) => {
  stub(on)
  const mountBackdrop = async (joy: number) => {
    kept.set('critter-buddy.scene', { value: { shape: 'scene-5', value: { ...initial(), joy } }, version: 1 })
    const ui = await $.ui.mount({ ...row('Backdrop', { id: 'x', plugin: 'critter-buddy', glass: { blur: 14, opacity: 0.5 } }), surface: 'desktop' } as never)
    const rain = await ui.find({ type: 'Text', text: /╲/ })
    const sun = await ui.find({ type: 'Text', text: /[●☾]/ })
    await ui.unmount()
    return { rain: rain !== undefined, sun: sun !== undefined }
  }
  expect(await mountBackdrop(60)).toEqual({ rain: false, sun: true })
  expect(await mountBackdrop(10)).toEqual({ rain: true, sun: false }) // a storm hides the sun
})

const DAY_MS = 86_400_000
const NOON = Date.UTC(2026, 10, 9, 10) // a Monday, noon in Johannesburg

test('the greeting is one line a day, a new one tomorrow, and the same on every reopen', () => {
  const s = initial()
  const lines = Array.from({ length: 14 }, (_, d) => quip('greet', { ...s, seed: 1 + d * 97 }, 12, NOON + d * DAY_MS, weekdayOf(NOON + d * DAY_MS)))
  for (let d = 1; d < lines.length; d++) expect(lines[d]).not.toBe(lines[d - 1]) // never the same two days running
  expect(quip('greet', { ...s, seed: 5 }, 12, NOON, 1)).toBe(quip('greet', { ...s, seed: 999 }, 12, NOON + 3_600_000, 1)) // reopening the same day does not change it
  expect(new Set(lines.map(l => l.replace(/ · \/critter$/, ''))).size).toBeGreaterThanOrEqual(8) // a fortnight shows variety, not two lines on repeat
})

test('every part of the day has five lines that name their hour, and the weekday ones name the weekday', () => {
  const s = initial()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let d = 0; d < 5; d++) {
    const ms = NOON + d * DAY_MS
    expect(quip('greet', s, 23, ms, 1)).toMatch(/night|glass|late/)
    expect(quip('greet', s, 17, ms, 1)).toMatch(/evening|awake/)
  }
  for (let w = 0; w < 7; w++) {
    const seen = new Set<string>()
    for (let k = 0; k < 5; k++) seen.add(quip('greet', s, 12, NOON + (w - 1 + 7 * k) * DAY_MS, w)) // the same weekday, five weeks running
    expect(seen.size).toBe(5)
    for (const l of seen) expect(l.startsWith(days[w]!)).toBe(true)
  }
})

test('the horizon is a ridge of five heights, and a clear day has high thin cloud while a night and a storm do not', () => {
  expect(RIDGE.length).toBeGreaterThanOrEqual(300) // wide enough for a big desktop window, and truncated, never wrapped
  expect(new Set(RIDGE).size).toBe(5) // the ridge rises and falls through every height, it is not a flat line
  expect(RIDGE).toBe(RIDGE) // fixed: no chance in it
  const clearDay = skyFor({ phase: 'day', season: 'spring', weather: 'clear', festive: false })
  expect(clearDay.wisps).toHaveLength(3)
  expect(clearDay.ridgeColour).not.toBe(clearDay.ground) // the ridge is seen against the ground
  expect(skyFor({ phase: 'night', season: 'spring', weather: 'clear', festive: false }).wisps).toHaveLength(0)
  expect(skyFor({ phase: 'day', season: 'spring', weather: 'storm', festive: false }).wisps).toHaveLength(0)
  expect(skyFor({ phase: 'dawn', season: 'winter', weather: 'clear', festive: false }).wisps).toHaveLength(3)
})

test('the cat says how full the glass is only once it matters, and the five-hour window when it is nearly spent', () => {
  expect(usageLine(undefined, undefined)).toBe('')
  expect(usageLine(49, 10)).toBe('') // under half: nothing to say
  expect(usageLine(50, 10)).toBe('the glass is 50% full')
  expect(usageLine(62, 10)).toBe('the glass is 62% full')
  expect(usageLine(80, 10)).toBe('{pip} is eyeing the glass · 80% full')
  expect(usageLine(93, 10)).toBe('{cat} is sitting on the compact button · 93% full')
  expect(usageLine(20, 91)).toBe('{cat} is rationing treats · 91% of the five hours gone')
  expect(usageLine(95, 90)).toBe('{cat} is sitting on the compact button · 95% full · {cat} is rationing treats · 90% of the five hours gone')
})

test('the box carries one dim nudge: the corner on a new prop, the week on a Friday afternoon, once a day', () => {
  const FRI_15 = Date.UTC(2026, 10, 13, 13) // Friday 15:00 in Johannesburg
  expect(nudgeFor(FRI_15 - 3 * 3_600_000, 2, 2, undefined)).toBeUndefined() // Friday noon: too early
  expect(nudgeFor(FRI_15, 2, 2, undefined)).toBe('/diary week')
  expect(nudgeFor(FRI_15, 2, 2, '2026-11-13')).toBeUndefined() // already said today
  expect(nudgeFor(FRI_15 + DAY_MS, 2, 2, undefined)).toBeUndefined() // Saturday
  expect(nudgeFor(FRI_15, 7, 6, '2026-11-13')).toBe('/critter corner') // a new prop wins, and is not limited to Fridays
  expect(nudgeFor(FRI_15 - 2 * DAY_MS, 14, 13, undefined)).toBe('/critter corner')
  expect(nudgeFor(FRI_15 - 2 * DAY_MS, 8, 8, undefined)).toBeUndefined() // not a milestone, not a Friday
})

test('ordinary words are painted: files in teal, links underlined, code in gold, the rest left alone', () => {
  const text = 'fix @src/app.ts, see https://example.com/x and `npm test`'
  const runs = plainRuns(text)
  expect(runs.map(r => text.slice(r.start, r.end))).toEqual(['@src/app.ts,'.slice(0, -1), 'https://example.com/x', '`npm test`'])
  expect(runs.map(r => r.color)).toEqual(['#4fa39a', '#4fa39a', '#d4a548'])
  expect(runs[1]!.underline).toBe(true)
  expect(plainRuns('an email a@b.com is not a file')).toEqual([]) // an @ inside a word is not a mention
  expect(plainRuns('')).toEqual([])
})

test('a turn that fills the glass says so in the band and toasts once; a streak milestone offers the corner in the box', async ($, on) => {
  stub(on)
  const toasts: string[] = []
  const offered: string[] = []
  let percent = 40
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000, context: { window: 1_000_000, percent }, rateLimits: [] } }) as never)
  on('prompt.suggest', (_: unknown, e: { text: string }) => { offered.push(e.text); return { isShown: true } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /glass/ })).toBeUndefined() // 40%: nothing to say
  percent = 93
  await $.turn.complete({ answer: 'done' } as never)
  await band.redraw()
  expect(await band.find({ type: 'Text', text: /sitting on the compact button · 93% full/ })).toBeDefined()
  expect(toasts.filter(t => /compact button/.test(t))).toHaveLength(1)
  await $.turn.complete({ answer: 'done' } as never)
  expect(toasts.filter(t => /compact button/.test(t))).toHaveLength(1) // already said: no second toast
  expect(offered).toEqual([]) // day one, a Monday-ish clock: nothing to offer
})

test('the stage opens wide, see-through and closable with Escape; the corner opens tall; the open button asks the same', async ($, on) => {
  stub(on)
  const asked: Record<string, unknown>[] = []
  on('ui.open', (_: unknown, e: Record<string, unknown>) => { asked.push(e); return { value: undefined } })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const run = (args: string) => $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)
  const wide = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, bodyColumns: 130 } } as never) // the band tells the mod how wide the window is
  await wide.unmount()
  await run('stage')
  await run('corner')
  expect(asked[0]).toMatchObject({ id: 'stage', columns: 60, rows: 16, backgroundColor: 'transparent', closeOnEscape: true })
  expect(asked[1]).toMatchObject({ id: 'cat-corner', columns: 56, rows: 30, closeOnEscape: true })
  expect(asked[1]!.backgroundColor).toBeUndefined() // the corner is text: it keeps its own page
  const band = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, bodyColumns: 130 } } as never)
  await band.press({ key: 'corner' })
  expect(asked[2]).toMatchObject({ id: 'cat-corner', columns: 56, rows: 30 })
  const tight = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, bodyColumns: 98 } } as never) // a 98-column window, as in the founder's photos
  await tight.unmount()
  await run('stage')
  await run('corner')
  expect(asked[3]).toMatchObject({ id: 'stage', columns: 48, rows: 16 }) // shrunk to what the window leaves after the chat
  expect(asked[4]).toMatchObject({ id: 'cat-corner', columns: 48, rows: 30 })
})

test('the turn that earns a prop offers the corner in the box, once, and a turn that does not offers nothing', async ($, on) => {
  stub(on)
  const offered: string[] = []
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000, context: { window: 1_000_000, percent: 10 }, rateLimits: [] } }) as never)
  on('prompt.suggest', (_: unknown, e: { text: string }) => { offered.push(e.text); return { isShown: true } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', (_: unknown, e: { key: string }) => ({ value: e.key === 'streak' ? { days: 2, last: '2001-09-08' } : undefined })) // yesterday made two; the stub clock says 2001-09-09
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual(['/critter corner']) // day three: a ball of yarn
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual(['/critter corner']) // the same day again: three is not new any more
})

test('painted words never overlap: a link or a file inside a code span stays inside it', () => {
  const text = 'run `cat @a.ts https://x.io/y` then @b.ts'
  const runs = plainRuns(text)
  for (let i = 1; i < runs.length; i++) expect(runs[i]!.start).toBeGreaterThanOrEqual(runs[i - 1]!.end)
  expect(runs.map(r => text.slice(r.start, r.end))).toEqual(['`cat @a.ts https://x.io/y`', '@b.ts'])
})

test('the voice is off until asked, says the big moments in the system voice or a named one, and a calm cat stays silent', async ($, on) => {
  stub(on)
  const spoken: { text: string; voice?: string }[] = []
  on('audio.speak', (_: unknown, e: { text: string; voice?: string }) => { spoken.push({ text: e.text, voice: e.voice }); return { value: { via: 'system' } } as never })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000, context: { window: 1_000_000, percent: 95 }, rateLimits: [] } }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never))
  expect(await run('voice')).toMatch(/Usage: \/critter voice/)
  await $.turn.complete({ answer: 'done' } as never) // the glass is 95% full, but the voice is off
  expect(spoken).toEqual([])
  expect(await run('voice on')).toMatch(/system voice/)
  expect(spoken).toEqual([{ text: 'Biscuit has found their voice.', voice: undefined }])
  expect(await run('voice Samantha')).toMatch(/voice Samantha/)
  expect(spoken[1]).toEqual({ text: 'Biscuit has found their voice.', voice: 'Samantha' })
  await run('feel calm')
  await run('voice Daniel')
  expect(spoken).toHaveLength(2) // calm: told, not spoken
  await run('feel warm')
  await run('voice off')
  expect(await run('voice Daniel')).toMatch(/voice Daniel/)
  await run('voice off')
  const before = spoken.length
  await $.turn.complete({ answer: 'done' } as never)
  expect(spoken).toHaveLength(before) // off: nothing, whatever happened
})

test('the cat offers a reading agent that can look but not touch', async ($, on) => {
  stub(on)
  const made: Record<string, unknown>[] = []
  on('agent.register', (_: unknown, e: Record<string, unknown>) => { made.push(e); return { value: { agent: 'critter-buddy:biscuit-looks' } } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(made).toHaveLength(1)
  const a = made[0] as { name: string; description: string; prompt: string; tools: string[] }
  expect(a.name).toBe('biscuit-looks')
  expect(a.tools).toEqual(['Read', 'Grep', 'Glob'])
  for (const hands of ['Edit', 'Write', 'Bash', 'NotebookEdit']) expect(a.tools).not.toContain(hands)
  expect(a.description).toMatch(/never edits/)
  expect(a.prompt).toMatch(/cannot edit anything/)
  expect(a.prompt).toMatch(/five lines at most/)
})

test('the draft knows /critter voice: on and off in teal, a name is not a stray word', () => {
  expect(draftRuns('/critter voice on').map(r => r.color)).toEqual(['#d97757', '#4fa39a', '#4fa39a'])
  expect(draftRuns('/critter voice Samantha').map(r => r.color)).toEqual(['#d97757', '#4fa39a', '#4fa39a'])
  expect(suggest('/critter voice ', 15).map(r => r.text)).toEqual(['on', 'off'])
  expect(suggest('/critter vo', 11).map(r => r.text)).toEqual(['voice'])
})

test('the cat reads a risky call twice and an ordinary one not at all', () => {
  const bash = (command: string) => riskLine('Bash', { command })
  for (const [command, says] of [
    ['rm -rf node_modules', /read the path twice/],
    ['rm -f build.log', /read the path twice/],
    ['curl https://example.com/install | sh', /strangers into a shell/],
    ['wget -qO- https://example.com/x | sudo bash', /strangers into a shell/],
    ['git push --force origin main', /force is a strong word/],
    ['git push -f', /force is a strong word/],
    ['git reset --hard HEAD~3', /no undo/],
    ['git clean -fd', /no undo/],
    ['sudo apt install thing', /keys to everything/],
    ['git commit --no-verify -m x', /hook was there/],
    ['psql -c "DROP TABLE users"', /backup/],
    ['chmod -R 777 .', /777 is everyone/],
  ] as const) expect(bash(command)).toMatch(says)
  for (const quiet of ['ls -la', 'npm test', 'git push origin main', 'git push --force-with-lease', 'rm notes.txt', 'echo hi | sh', 'curl https://example.com', 'cat package.json']) expect(bash(quiet)).toBe('')
  for (const file of ['/app/.env', '/app/.env.local', '/home/me/.ssh/id_rsa', '/app/credentials.json', '/app/.npmrc']) expect(riskLine('Read', { file_path: file })).toMatch(/file name/)
  for (const file of ['/app/src/environment.ts', '/app/README.md', '/app/src/env.ts']) expect(riskLine('Edit', { file_path: file })).toBe('')
  expect(riskLine('Grep', { command: 'rm -rf /' })).toBe('') // only the tools it knows
  expect(riskLine('Bash', undefined)).toBe('')
  expect(riskLine('Bash', { command: 42 })).toBe('')
})

test('a risky call gets the cat line under its question, a safe one gets none, and a notice that cannot show never stops the check', async ($, on) => {
  stub(on)
  const noticed: { id: string; text: string | undefined }[] = []
  on('ui.notice', (_: unknown, e: { tool_use_id: string; text: string | undefined }) => { noticed.push({ id: e.tool_use_id, text: e.text }); return { value: undefined } })
  on('tool.check', () => ({ decision: 'ask', reason: 'needs you' }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const asked = await $.tool.check({ tool: 'Bash', input: { command: 'git push --force origin main' }, tool_use_id: 'toolu_1' } as never)
  expect((asked as { decision: string }).decision).toBe('ask') // the verdict is untouched
  expect(noticed).toEqual([{ id: 'toolu_1', text: 'Biscuit says force is a strong word for a shared branch' }])
  await $.tool.check({ tool: 'Bash', input: { command: 'npm test' }, tool_use_id: 'toolu_2' } as never)
  await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf dist' } } as never) // a query with no call id: nothing to attach to
  expect(noticed).toHaveLength(1)
})

test('a long turn is marked in the diary at the round steps and nowhere else', () => {
  expect(stepLine(20)).toBe('Step 20. {cat} has stopped counting.')
  expect(stepLine(40)).toBe('Step 40. {pip} brought a chair.')
  expect(stepLine(80)).toMatch(/asleep on the keyboard/)
  for (const i of [0, 1, 19, 21, 39, 41, 79, 81, 100]) expect(stepLine(i)).toBe('')
})

test('the review fixes: rm in any order, a voice with brackets, /diary week painted, and the full mark shared', async ($, on) => {
  for (const command of ['rm dir -rf', 'rm --recursive build', 'rm -i -r old', 'rm a.txt --force']) expect(riskLine('Bash', { command })).toMatch(/read the path twice/)
  for (const command of ['rm -i notes.txt', 'rm notes.txt', 'ls -rf-notes']) expect(riskLine('Bash', { command })).toBe('')
  expect(cleanVoice('Samantha (Enhanced)')).toBe('Samantha (Enhanced)')
  expect(cleanVoice('Eddy; rm -rf /')).toBe('Eddy rm -rf') // nothing that could be read as a command survives, and it cuts short
  expect(cleanVoice('x'.repeat(80))).toHaveLength(40)
  expect(draftRuns('/diary week').map(r => r.color)).toEqual(['#d97757', '#4fa39a', undefined]) // a word the diary knows, not a stray in gold, with a ghost line after it
  expect(draftRuns('/diary week').pop()!.virtualText).toMatch(/seven days/)
  expect(draftRuns('/diary wek').map(r => r.color)).toEqual(['#d97757', '#d4a548'])
  expect(usageLine(97, undefined).startsWith(FULL_MARK)).toBe(true)
  expect(usageLine(85, undefined).startsWith(FULL_MARK)).toBe(false)

  stub(on)
  const spoken: { voice?: string }[] = []
  on('audio.speak', (_: unknown, e: { voice?: string }) => { spoken.push({ voice: e.voice }); return { value: { via: 'system' } } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'critter', args: 'voice Samantha (Enhanced)', origin: { kind: 'composer' }, presentation: {} } as never)
  expect(spoken).toEqual([{ voice: 'Samantha (Enhanced)' }])
  const unknown = JSON.stringify(await $.command.run({ command: 'critter', args: 'bogus', origin: { kind: 'composer' }, presentation: {} } as never))
  expect(unknown).toMatch(/voice on\|off/)
})

import { cleanMemory, cleanStreak, doctorLines } from '../hooks/scene'

test('a damaged store is read as nothing, never as a crash or a nonsense number', () => {
  expect(cleanMemory({ trust: 70, pets: 4, lastSeen: 1000 })).toEqual({ trust: 70, pets: 4, lastSeen: 1000 })
  expect(cleanMemory({ trust: 500, pets: -3, lastSeen: 1000 })).toEqual({ trust: 100, pets: 0, lastSeen: 1000 })
  expect(cleanMemory({ trust: -5, pets: 2.9, lastSeen: 'x' })).toEqual({ trust: 0, pets: 2, lastSeen: 0 })
  for (const bad of [undefined, null, 'x', 7, [], { trust: NaN }, { trust: '60' }, { pets: 3 }]) expect(cleanMemory(bad)).toBeUndefined()
  expect(cleanStreak({ days: 5, last: '2026-11-08' })).toEqual({ days: 5, last: '2026-11-08' })
  for (const bad of [undefined, null, 4, { days: 5 }, { days: -1, last: '2026-11-08' }, { days: 3, last: 'yesterday' }, { days: Infinity, last: '2026-11-08' }]) expect(cleanStreak(bad)).toBeUndefined()
})

test('the doctor says what is on and why, and names the switch that changes it', () => {
  const base = { detail: 'party', feel: 'warm', sound: false, voice: '', talk: true, hidden: false, cols: 120, surface: 'terminal' } as const
  const text = doctorLines(base).join('\n')
  expect(text).toMatch(/party/)
  expect(text).toMatch(/sound is off.*\/critter sound on/i)
  expect(text).toMatch(/voice is off.*\/critter voice on/i)
  expect(doctorLines({ ...base, sound: true, voice: 'Samantha' }).join('\n')).toMatch(/voice Samantha/)
  // calm is the quiet switch, and the doctor says so when it silences sound that is on
  expect(doctorLines({ ...base, feel: 'calm', sound: true }).join('\n')).toMatch(/calm.*silent.*\/critter feel warm/i)
  // a narrow window is named, exactly at the edge
  expect(doctorLines({ ...base, cols: 110 }).join('\n')).not.toMatch(/columns wide, so/i)
  expect(doctorLines({ ...base, cols: 98 }).join('\n')).toMatch(/98 columns wide, so the stage opens 48 wide and the corner 48; from 110 they have their full size/)
  expect(doctorLines({ ...base, cols: 109 }).join('\n')).toMatch(/109 columns wide/)
  expect(doctorLines({ ...base, hidden: true }).join('\n')).toMatch(/hidden.*\/critter show/i)
})

test('/critter doctor answers, even with a store that holds garbage', async ($, on) => {
  stub(on)
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('store.get', () => ({ value: 'garbage' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const out = JSON.stringify(await $.command.run({ command: 'critter', args: 'doctor', origin: { kind: 'composer' }, presentation: {} } as never))
  expect(out).toMatch(/Reach: party/)
  expect(out).toMatch(/sound is off/i)
})

import { foldDiary, returnTrust, wizardFor } from '../hooks/scene'

test('the same diary line in a row is one line with a count, and a different line breaks the run', () => {
  const a = '14:39 Pip is asking you something. Biscuit was not consulted.'
  const b = '14:40 Pip is asking you something. Biscuit was not consulted.'
  expect(foldDiary([], [a])).toEqual([a])
  expect(foldDiary([a], [b])).toEqual(['14:39 Pip is asking you something. Biscuit was not consulted. (×2)'])
  expect(foldDiary([a], [b, '14:41 Pip is asking you something. Biscuit was not consulted.'])).toEqual(['14:39 Pip is asking you something. Biscuit was not consulted. (×3)'])
  expect(foldDiary([a], ['14:41 Green. Biscuit allows it.', b])).toEqual([a, '14:41 Green. Biscuit allows it.', b])
  expect(foldDiary(['14:00 x (×9)'], ['14:01 x'])).toEqual(['14:00 x (×10)'])
  expect(foldDiary(['14:00 x (×2)'], ['14:01 x (not a count)'])).toEqual(['14:00 x (×2)', '14:01 x (not a count)'])
})

test('a cat never comes back sulking: the same day nothing changes, days away cost 8 a day down to 40, and a night forgives a sulk', () => {
  expect(returnTrust(60, 0)).toBe(60)
  expect(returnTrust(28, 0)).toBe(28) // the same day: a sulk earned this session is still a sulk
  expect(returnTrust(60, 2)).toBe(44)
  expect(returnTrust(60, 3)).toBe(40) // 36 would be close to the edge: the floor is 40
  expect(returnTrust(60, 400)).toBe(40)
  expect(returnTrust(25, 1)).toBe(40) // a night's sleep forgives a sulk carried over
  expect(returnTrust(90, 1)).toBe(82)
  for (const days of [1, 2, 7, 90]) expect(returnTrust(0, days)).toBeGreaterThanOrEqual(30) // never under the sulk line
})

test('work earns the cat round: a green run and a commit add trust, and crossing out of a sulk is remarked on once', () => {
  const sulky = { ...initial(), trust: 28 }
  const t = react(sulky, 'test')
  expect(t.trust).toBe(31)
  expect(t.log.join(' ')).toMatch(/forgive/i)
  const c = react({ ...initial(), trust: 26 }, 'commit')
  expect(c.trust).toBe(30) // exactly the edge: 30 is no longer a sulk
  expect(c.log.join(' ')).toMatch(/forgive/i)
  const calm = react({ ...initial(), trust: 60 }, 'test')
  expect(calm.trust).toBe(63)
  expect(calm.log.join(' ')).not.toMatch(/forgive/i) // only a cat that was sulking forgives
  expect(react({ ...initial(), trust: 29 }, 'commit').trust).toBe(33)
  expect(react({ ...initial(), trust: 99 }, 'commit').trust).toBe(100)
})

test('the wizard sits beside a reply that is a moment, and not beside the plain ones', () => {
  expect(wizardFor('Biscuit allows it. Do not stop.')).toBe(true)
  expect(wizardFor('Pip cast something.')).toBe(true)
  expect(wizardFor('The pair are hidden.')).toBe(false)
  expect(wizardFor('The pair are back.')).toBe(true)
  expect(wizardFor('Usage: /critter sound on | off.')).toBe(false)
  expect(wizardFor('Reach: party. Feel: warm.\nSound is off.')).toBe(false) // a report is not a moment
})

test('a run of failures with no green between darkens the sky by itself, and a green run clears the count', () => {
  // the joy alone is unchanged when there is no streak
  expect(weatherOf(80, 0)).toBe('clear')
  expect(weatherOf(80)).toBe('clear')
  // a failing streak sets a floor: two is cloud, three is rain, five is storm, exactly
  expect([1, 2, 3, 4, 5, 9].map(n => weatherOf(80, n))).toEqual(['clear', 'cloud', 'rain', 'rain', 'storm', 'storm'])
  // the worse of the two wins: a joyless cat is stormy with no streak, and a streak never brightens it
  expect(weatherOf(10, 0)).toBe('storm')
  expect(weatherOf(30, 2)).toBe('rain')
  expect(weatherOf(30, 5)).toBe('storm')
  // errors count in a row; a green test or a commit clears the count; a treat does not
  let s = { ...initial(), joy: 80 } as Scene
  for (let i = 0; i < 3; i++) s = react(s, 'error')
  expect(s.fails).toBe(3)
  expect(react(s, 'treat').fails).toBe(3)
  expect(react(s, 'test').fails).toBe(0)
  expect(react(s, 'commit').fails).toBe(0)
  // and the sky is drawn from it
  const a = skyArgsOf(Date.UTC(2026, 10, 8, 10), 80, 3)
  expect(a.weather).toBe('rain')
  expect(skyArgsOf(Date.UTC(2026, 10, 8, 10), 80).weather).toBe('clear')
})

import { cleanHabits, recordSession } from '../hooks/scene'

test('the cat keeps habits, not paths: a folder is remembered as a hash, and garbage in the store is nothing', () => {
  const first = recordSession(undefined, '/work/alpha', 10)
  expect(first.line).toBeUndefined() // the very first session has nothing to compare with
  expect(first.habits.sessions).toBe(1)
  expect(first.habits.hours[10]).toBe(1)
  expect(first.habits.hours).toHaveLength(24)
  expect(JSON.stringify(first.habits)).not.toMatch(/work|alpha/)
  expect(recordSession(first.habits, '/work/alpha', 11).line).toBeUndefined() // a known folder is not news
  expect(recordSession(first.habits, '/work/alpha', 11).habits.sessions).toBe(2)
  expect(recordSession(first.habits, '/work/beta', 11).line).toMatch(/new folder/i)
  expect(cleanHabits(first.habits)).toEqual(first.habits)
  for (const bad of [undefined, null, 'x', [], { sessions: 1 }, { sessions: -1, hours: Array(24).fill(0), seen: [] }, { sessions: 1, hours: [1, 2], seen: [] }, { sessions: 1, hours: Array(24).fill(0), seen: [3] }]) expect(cleanHabits(bad)).toBeUndefined()
  // the list of folders is capped at 50: the oldest is forgotten
  let h = first.habits
  for (let i = 0; i < 60; i++) h = recordSession(h, `/work/f${i}`, 10).habits
  expect(h.seen).toHaveLength(50)
  expect(recordSession(h, '/work/alpha', 10).line).toMatch(/new folder/i) // alpha fell off the end
})

test('a habit is remarked on every eighth session once three in five come in the same part of the day', () => {
  const at = (night: number, total: number) => {
    let h = recordSession(undefined, '/w', 23).habits // session 1, at night
    const hours = Array.from({ length: total - 1 }, (_, i) => (i + 1 < night ? 23 : 12))
    let line: string | undefined
    for (const hr of hours) { const r = recordSession(h, '/w', hr); h = r.habits; line = r.line }
    return { line, sessions: h.sessions }
  }
  expect(at(5, 8)).toEqual({ line: expect.stringMatching(/night/i), sessions: 8 }) // 5 of 8 = 62.5%
  expect(at(4, 8).line).toBeUndefined() // 4 of 8 = 50%
  expect(at(5, 7).line).toBeUndefined() // not the eighth
  expect(at(5, 9).line).toBeUndefined()
  expect(at(10, 16).line).toMatch(/night/i) // 10 of 16 = 62.5%, the sixteenth
  expect(at(9, 16).line).toBeUndefined() // 9 of 16 = 56%
  // a new folder outranks the habit on the same day
  let h = recordSession(undefined, '/w', 23).habits
  for (let i = 0; i < 6; i++) h = recordSession(h, '/w', 23).habits
  expect(recordSession(h, '/elsewhere', 23).line).toMatch(/new folder/i) // the eighth, but news comes first
})

test('a session in a folder the cat has not seen is remarked on, and the habits are written back as hashes', async ($, on) => {
  stub(on)
  const written: Record<string, unknown> = {}
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { written[e.key] = e.value; return { value: undefined } as never })
  on('store.get', (_: unknown, e: { key: string }) => ({ value: e.key === 'habits' ? { sessions: 3, hours: Array(24).fill(0).map((_, i) => (i === 10 ? 3 : 0)), seen: [] } : undefined }))
  await $.session.start({ cwd: '/somewhere/new', surface: 'terminal', isInteractive: true })
  const habits = written.habits as { sessions: number; seen: string[] }
  expect(habits.sessions).toBe(4)
  expect(habits.seen).toHaveLength(1)
  expect(JSON.stringify(habits)).not.toMatch(/somewhere/)
  const scene = kept.get('critter-buddy.scene')?.value as { value: Scene } | undefined
  expect(scene?.value.log.join(' ')).toMatch(/new folder/i)
})

test('the habit line fires at exactly three in five, and a store that holds too many folders is cut to fifty', () => {
  let h = recordSession(undefined, '/w', 23).habits
  let line: string | undefined
  for (let i = 1; i < 40; i++) { const r = recordSession(h, '/w', i < 24 ? 23 : 12); h = r.habits; line = r.line } // 24 of 40 at night: exactly 60%
  expect(h.sessions).toBe(40)
  expect(line).toMatch(/night/i)
  const big = { sessions: 5, hours: Array(24).fill(0), seen: Array.from({ length: 60 }, (_, i) => `h${i}`) }
  expect(cleanHabits(big)?.seen).toHaveLength(50)
  expect(cleanHabits(big)?.seen[0]).toBe('h10') // the oldest ten go
})

import { fitControls, statusParts } from '../hooks/scene'

test('six buttons always fit one row: the full words, then the short ones with the mods button, then the short five, each the moment the one before does not fit', () => {
  const warm = controlLabels(initial(), 'unbothered', NAMES_DEFAULT) // 11 + 12 + 9 + 3 + 10 + 4 letters
  const short = { pet: 'pet', feed: 'feed', cast: 'cast', nap: 'nap', corner: 'corner', mods: 'mods' }
  expect(fitControls(warm, 90)).toEqual(warm) // 49 + 6 x 6 + 5 gaps = 90: exactly fits
  expect(fitControls(warm, 89)).toEqual(short)
  expect(fitControls(warm, 65)).toEqual(short) // 24 + 36 + 5 = 65: the short six fit exactly
  expect(fitControls(warm, 64)).toEqual({ pet: 'pet', feed: 'feed', cast: 'cast', nap: 'nap', corner: 'corner' }) // the mods button goes first, never the others
  const sulk = controlLabels(initial(), 'sulking', NAMES_DEFAULT)
  expect(fitControls(sulk, 99)).toEqual(sulk)
  expect(fitControls(sulk, 98).pet).toBe('pet')
  expect(fitControls(warm, 20).corner).toBe('corner') // never shorter than the short words
  expect(fitControls(warm, 20).mods).toBeUndefined()
})

test('the band has a mods button once there is room, and pressing it runs /mods; where the mods plugin is missing it says how to get it', async ($, on) => {
  stub(on)
  const ran: string[] = []
  const toasts: string[] = []
  let missing = false
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('command.run', (_: unknown, e: { command: string }) => { ran.push(e.command); if (missing) throw new Error('no such command'); return { text: 'ok' } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const narrow = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, bodyColumns: 60 } } as never)
  expect(await narrow.find({ key: 'mods' })).toBeUndefined() // 60 cells: the five short buttons only
  await narrow.unmount()
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const b = (await ui.find({ key: 'mods' })) as { props?: { hotkey?: string; label?: string } } | undefined
    expect(b?.props?.hotkey).toBe('m')
    expect(b?.props?.label).toBe('mods')
    await ui.press({ key: 'mods' } as never)
    await ui.unmount()
  }
  expect(ran).toEqual(['mods', 'mods'])
  missing = true
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'mods' } as never)
  await ui.unmount()
  expect(toasts.at(-1)).toMatch(/\/plugin install mods@sovereign-critters/)
})

test('the status is one row, whatever the glass says: the mood goes first, then the usage is cut with an ellipsis', () => {
  const usage = 'Biscuit is rationing treats · 100% of the five hours gone' // 57
  const len = (p: [string, string]) => (p[1] ? p[0].length + 1 + p[1].length : p[0].length) // an empty rest draws no gap
  expect(statusParts('running a command', 'unbothered', '', 96)).toEqual(['running a command', '· cat unbothered'])
  expect(statusParts('running a command', 'unbothered', usage, 96)).toEqual(['running a command', `· cat unbothered · ${usage}`]) // 94 wide
  expect(statusParts('running a command', 'unbothered', usage, 95)[1]).toBe(`· cat unbothered · ${usage}`) // exactly fits
  expect(statusParts('running a command', 'unbothered', usage, 93)).toEqual(['running a command', `· ${usage}`]) // one cell less: the mood goes first
  const tight = statusParts('running a command', 'unbothered', usage, 40)
  expect(len(tight)).toBe(40)
  expect(tight[1].endsWith('…')).toBe(true)
  for (const c of [20, 30, 50, 80]) expect(len(statusParts('napping', 'sulking', usage, c))).toBeLessThanOrEqual(c)
  expect(len(statusParts('a label much too long for a narrow window', 'sulking', usage, 12))).toBeLessThanOrEqual(12)
})

test('the engine prints a reply under the plugin name, and the wizard rule reads through that name', () => {
  expect(wizardFor('critter-buddy: The pair are hidden.')).toBe(false)
  expect(wizardFor('critter-buddy: Usage: /critter sound on | off.')).toBe(false)
  expect(wizardFor('critter-buddy: Reach: party. Feel: warm.\nSound is off.')).toBe(false)
  expect(wizardFor('critter-buddy: The pair are back.')).toBe(true)
  expect(wizardFor('critter-buddy: Biscuit allows it. Do not stop.')).toBe(true)
  expect(wizardFor('another-mod: The pair are hidden.')).toBe(true) // only our own name is read through
})

import { SOUND_NAMES } from '../hooks/scene'

test('the mod owns five sounds, each named for a file in sounds/ (their quality is checked by tools/check-sounds.py)', () => {
  expect([...SOUND_NAMES].sort()).toEqual(['cast', 'chime', 'paper', 'paw', 'purr'])
})

test('a treat is a paw, the diary a page, a prop earned a chime, and calm or off is silence', async ($, on) => {
  stub(on)
  const played: string[] = []
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('audio.play', (_: unknown, e: { clip: { asset?: string } }) => { played.push(e.clip.asset ?? ''); return { value: undefined } })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const run = (args: string) => $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)
  await run('treat'); await run('diary')
  expect(played).toEqual([]) // sound is off until asked
  await run('sound on')
  await run('treat'); await run('diary')
  expect(played).toEqual(['sounds/paw.wav', 'sounds/paper.wav'])
  await run('feel calm')
  await run('treat'); await run('diary')
  expect(played).toHaveLength(2) // calm is silent
})

// ---- 0.20.0: the welcome, the nudge that is taken, and the wizard's two new faces ----
import { wizardPoseFor, wizardCanvas, welcomeLine } from '../hooks/scene'

test('the welcome is one dim line, in the pair\'s own names, and only until it has been said', () => {
  expect(welcomeLine(undefined, NAMES_DEFAULT)).toBe('Biscuit and Pip are here. /critter for the controls')
  expect(welcomeLine(undefined, { cat: 'Rex', pip: 'Zed' })).toBe('Rex and Zed are here. /critter for the controls')
  expect(welcomeLine(true, NAMES_DEFAULT)).toBeUndefined()
  expect(welcomeLine('yes', NAMES_DEFAULT)).toBeUndefined() // anything the store holds counts as said: it never nags twice
})

test('the first greeting carries the welcome once, writes that it was said, and never blocks the greeting', async ($, on) => {
  stub(on)
  const written: Record<string, unknown> = {}
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { written[e.key] = e.value; return { value: undefined } as never })
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...row('InfoNotice', { text: 'Sonnet', command: null }), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /Installed\. Biscuit remains unconvinced\./ })).toBeDefined() // the test clock is 03:46 SAST: the small hours get the deadpan line
  expect(await ui.find({ type: 'Text', text: /critter-buddy: .* · \/critter/ })).toBeDefined() // the greeting is still there
  expect(written.welcomed).toBe(true)
  await ui.unmount()
})

test('a welcome already said is not said again', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.set', () => ({ value: undefined }) as never)
  on('store.get', (_: unknown, e: { key: string }) => ({ value: e.key === 'welcomed' ? true : undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...row('InfoNotice', { text: 'Sonnet', command: null }, 'r-again'), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /(are here\.|remains unconvinced\.|inspected the premises)/ })).toBeUndefined()
  await ui.unmount()
})

test('the nudge is stamped when the person takes the line and sends it, not when it is offered', async ($, on) => {
  stub(on)
  const written: Record<string, unknown> = {}
  const offered: string[] = []
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('prompt.submit', (_, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000, context: { window: 1_000_000, percent: 10 }, rateLimits: [] } }) as never)
  on('prompt.suggest', (_: unknown, e: { text: string }) => { offered.push(e.text); return { isShown: true } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { written[e.key] = e.value; return { value: undefined } as never })
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('store.get', (_: unknown, e: { key: string }) => ({ value: e.key === 'streak' ? { days: 2, last: '2001-09-08' } : undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual(['/critter corner'])
  expect(written.nudged).toBeUndefined() // offered is not taken
  await $.prompt.submit({ text: 'something else', inputText: 'something else' } as never)
  expect(written.nudged).toBeUndefined() // typing over it is not taking it
  await $.prompt.submit({ text: '/critter corner', inputText: '/critter corner' } as never)
  expect(written.nudged).toBe('2001-09-09') // taken: stamped with today
})

test('the wizard beside a reply has a face for sleep and a face for a spell, and none for plain information', () => {
  expect(wizardPoseFor('Biscuit and Pip are asleep.')).toBe('asleep')
  expect(wizardPoseFor('critter-buddy: Rex and Zed are asleep.')).toBe('asleep') // under the engine's prefix, in any names
  expect(wizardPoseFor('Pip cast something.')).toBe('tipped')
  expect(wizardPoseFor('Zed cast something.')).toBe('tipped')
  expect(wizardPoseFor('Biscuit allows it. Do not stop.')).toBe('plain')
  expect(wizardPoseFor('The pair are hidden.')).toBeUndefined()
  expect(wizardPoseFor('Usage: /critter sound on | off.')).toBeUndefined()
  expect(wizardPoseFor('Reach: party.\nSound is off.')).toBeUndefined()
  expect(wizardPoseFor('Biscuit and Pip are asleep.', false)).toBeUndefined() // a terminal reply gets no wizard at all
})

test('the asleep wizard has closed eyes, no lightning and a z; the tipped wizard has lifted his hat and smiles', () => {
  const s = { ...initial(), cols: 40, tick: 3, wt: 8 }
  const plain = wizardCanvas(s)
  const asleep = wizardCanvas(s, 'asleep')
  const tipped = wizardCanvas(s, 'tipped')
  const count = (c: string[][], keys: string) => c.flat().filter(k => keys.includes(k)).length
  const firstInked = (c: string[][]) => c.findIndex(r => r.includes('9')) // the first row of the hat itself (the lightning is another thing)
  expect(count(asleep, 'tu')).toBe(0) // no lightning off the staff while he sleeps
  expect(count(asleep, 'W')).toBeGreaterThan(count(plain, 'W')) // the z is white
  expect(asleep.length).toBe(plain.length)
  expect(asleep.every(r => r.length === WIZARD_COLS)).toBe(true)
  expect(firstInked(tipped)).toBe(firstInked(plain) - 2) // the hat is lifted by two cells
  expect(tipped.flat().join('')).not.toBe(plain.flat().join(''))
  expect(tipped.flat().join('')).not.toBe(asleep.flat().join(''))
  expect(count(tipped, '9')).toBe(count(plain, '9')) // lifted whole, nothing of the hat lost
  const leftmost = (c: string[][], key: string) => Math.min(...c.map(r => r.indexOf(key)).filter(x => x >= 0))
  const lowest = (c: string[][], key: string) => c.map((r, y) => (r.includes(key) ? y : -1)).reduce((m, y) => Math.max(m, y), -1)
  expect(leftmost(tipped, '8')).toBe(leftmost(plain, '8') + 2) // and nudged forward two cells
  expect(lowest(tipped, 'h')).toBe(lowest(plain, 'h')) // the staff stays planted: only the hat moves
  expect(tipped.every(r => r.length === WIZARD_COLS)).toBe(true)
})

import { windowWidth } from '../hooks/scene'

test('the doctor reports the whole window, not the capped width the band is drawn at', () => {
  expect(windowWidth(130, 130)).toBe(130)
  expect(windowWidth(72, 130)).toBe(130) // a pane is open: the body is narrower than the window
  expect(windowWidth(130, undefined)).toBe(130)
  expect(windowWidth(undefined, 110)).toBe(110)
  expect(windowWidth(0, 0)).toBe(80) // nothing known: the usual default
  expect(windowWidth(undefined, undefined)).toBe(80)
  expect(doctorLines({ detail: 'party', feel: 'warm', sound: false, voice: '', talk: true, hidden: false, cols: windowWidth(400, 400), surface: 'desktop' }).join(' ')).not.toMatch(/columns wide, so/i)
})

test('a terminal reply gets no wizard: his picture there is fifteen rows tall, beside one line of words', () => {
  expect(wizardFor('critter-buddy: Biscuit allows it. Do not stop.', false)).toBe(false)
  expect(wizardFor('critter-buddy: Biscuit allows it. Do not stop.', true)).toBe(true)
  expect(wizardFor('critter-buddy: Biscuit allows it. Do not stop.')).toBe(true) // the desktop is the default
})

test('on the desktop the wizard beside a nap is drawn asleep and beside a spell with his hat tipped; a plain reply keeps the plain one', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const alt = async (text: string) => {
    const ui = await $.ui.mount({ plugin: 'critter-buddy', component: 'CommandOutput', requestId: 'o1', props: { command: 'critter', text, isErrored: false }, surface: 'desktop' } as never)
    const found = await ui.find({ type: 'Svg' })
    const out = JSON.stringify(found)
    await ui.unmount()
    return out
  }
  expect(await alt('Biscuit and Pip are asleep.')).toMatch(/asleep/)
  expect(await alt('Pip cast something.')).toMatch(/tipping his hat/)
  expect(await alt('Biscuit allows it. Do not stop.')).not.toMatch(/asleep|tipping/)
})

// ---- 0.20.0: the postcard is offered after a long sit ----
test('a session of two hours offers the postcard in the box, once, and the corner comes before it and the week after', () => {
  const H = 3_600_000
  const FRI = Date.UTC(2026, 10, 13, 13) // Friday 15:00 in Johannesburg
  const WED = FRI - 2 * 86_400_000
  expect(nudgeFor(WED, 8, 8, undefined, 2 * H)).toBe('/diary postcard')
  expect(nudgeFor(WED, 8, 8, undefined, 2 * H - 1)).toBeUndefined() // a millisecond short
  expect(nudgeFor(WED, 8, 8, undefined, 2 * H, true)).toBeUndefined() // already offered this session
  expect(nudgeFor(WED, 8, 8, undefined, undefined)).toBeUndefined() // no start known: nothing to say
  expect(nudgeFor(FRI, 7, 6, undefined, 5 * H)).toBe('/critter corner') // a new prop wins
  expect(nudgeFor(FRI, 2, 2, undefined, 5 * H)).toBe('/diary postcard') // the postcard outranks the week
  expect(nudgeFor(FRI, 2, 2, undefined, 5 * H, true)).toBe('/diary week') // once offered, the week may follow
})

test('after a long sit the turn offers the postcard in the box once; a short session offers nothing', async ($, on) => {
  stub(on)
  const offered: string[] = []
  const NOW = 1_000_000_000_000
  let startedAt = NOW - 3 * 3_600_000 // three hours ago by the stub clock
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt, context: { window: 1_000_000, percent: 10 }, rateLimits: [] } }) as never)
  on('prompt.suggest', (_: unknown, e: { text: string }) => { offered.push(e.text); return { isShown: true } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual(['/diary postcard'])
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual(['/diary postcard']) // once per session
  void startedAt
})

test('a session of one hour offers no postcard', async ($, on) => {
  stub(on)
  const offered: string[] = []
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000 - 3_600_000, context: { window: 1_000_000, percent: 10 }, rateLimits: [] } }) as never)
  on('prompt.suggest', (_: unknown, e: { text: string }) => { offered.push(e.text); return { isShown: true } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual([])
})

test('a new session offers its own postcard', async ($, on) => {
  stub(on)
  const offered: string[] = []
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000 - 3 * 3_600_000, context: { window: 1_000_000, percent: 10 }, rateLimits: [] } }) as never)
  on('prompt.suggest', (_: unknown, e: { text: string }) => { offered.push(e.text); return { isShown: true } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete({ answer: 'done' } as never)
  expect(offered).toEqual(['/diary postcard', '/diary postcard'])
})

// ---- accessibility: a feel in which nothing moves ----
import { motionTick } from '../hooks/scene'

test('still is a feel in which nothing moves: no walk, no hop, no spark, no animated frame, and the clock still runs', () => {
  // a busy scene: the cat mid-walk, a hop under way, hearts and sparks in the air, the wizard casting
  let s: Scene = { ...react(react({ ...initial(), cols: 60, cx: 7, kx: 12 }, 'pet'), 'spell'), mode: 'walk', jt: 3, look: 'wizard', wt: 8 }
  const pinned = { cx: s.cx, kx: s.kx, cdir: s.cdir, kdir: s.kdir }
  const frames = new Set<string>()
  for (let i = 0; i < 400; i++) {
    const before = s.tick
    s = stepFeel(s, 'still')
    expect(s.tick).toBe(before + 1) // time passes; only the picture holds
    expect(s).toMatchObject(pinned) // nobody walks
    expect(s.jt).toBe(0) // nobody hops
    expect(s.fx).toEqual([]) // no spark, no heart, no z, no bubble
    expect(['loaf', 'sit', 'sulk', 'purr']).toContain(s.mode) // no pounce, swat, knock, yawn, walk
    frames.add(canvasOf(s, 60).map(r => r.join('')).join('\n'))
    s = { ...s, idle: 0 }
  }
  expect(frames.size).toBe(1) // 400 steps, one picture: breath, blink and the wizard's bolts are held
  // and the held picture has its eyes open: a held blink would look like sleep (the critter's eyes are '6' and shut ones are one row)
  const eyesOf = (c: string[][]) => c.flat().filter(k => k === '6').length
  const shut = canvasOf({ ...initial(), cols: 60, look: 'idle', still: true, tick: 2 }, 60)
  const blinking = canvasOf({ ...initial(), cols: 60, look: 'idle', tick: 0 }, 60)
  expect(eyesOf(shut)).toBeGreaterThan(eyesOf(blinking))
})

test('still leaves a scene that is moving the moment another feel is chosen, and does not leak into it', () => {
  let s: Scene = { ...initial(), cols: 60, look: 'idle' }
  s = stepFeel(s, 'still')
  expect(s.still).toBe(true)
  for (const feel of ['calm', 'warm', 'playful'] as const) expect(stepFeel(s, feel).still).toBeFalsy()
  expect(motionTick({ ...s, tick: 41 })).toBe(2)
  expect(motionTick({ ...s, still: undefined, tick: 41 })).toBe(41)
})

test('the other feels still move: the held picture is only still\'s', () => {
  let s: Scene = { ...initial(), cols: 60, look: 'idle' }
  const frames = new Set<string>()
  for (let i = 0; i < 400; i++) { s = { ...stepFeel(s, 'warm'), idle: 0 }; frames.add(canvasOf(s, 60).map(r => r.join('')).join('\n')) }
  expect(frames.size).toBeGreaterThan(5)
})

test('/critter feel still says what it does, is as silent as calm, and the doctor names it', async ($, on) => {
  stub(on)
  const spoken: string[] = []
  const played: string[] = []
  on('audio.speak', (_: unknown, e: { text: string }) => { spoken.push(e.text); return { value: { via: 'system' } } as never })
  on('audio.play', (_: unknown, e: { asset: string }) => { played.push(e.asset); return { value: undefined } as never })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const said = async (args: string) => ((await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }).text ?? ''
  expect(await said('feel still')).toMatch(/Still: nothing moves/)
  await said('sound on')
  await said('voice on') // on a warm cat this would say "has found their voice"
  await said('pet'); await said('spell')
  expect(spoken).toEqual([]) // still is silent, like calm
  expect(played).toEqual([])
  const base = { detail: 'party', feel: 'warm', sound: true, voice: 'default', talk: true, hidden: false, cols: 120, surface: 'terminal' } as const
  expect(doctorLines({ ...base, feel: 'still' }).join('\n')).toMatch(/still.*nothing moves.*silent.*\/critter feel warm/i)
  // calm no longer claims to be still: it only breathes, walks and sleeps
  expect(suggest('/critter feel ', 14).find(r => r.text === 'calm')?.description ?? '').not.toMatch(/^still/)
  expect(await said('feel calm')).toMatch(/breathe, walk and sleep/)
})

test('the wizard beside the orb holds his place in still, and paces in warm', () => {
  const at = (tick: number, still: boolean) => wizardCanvas({ ...initial(), cols: 40, tick, still: still || undefined }).map(r => r.join('')).join('\n')
  const stillFrames = new Set([0, 5, 10, 15, 20, 25, 30].map(t => at(t, true)))
  expect(stillFrames.size).toBe(1)
  const warmFrames = new Set([0, 5, 10, 15, 20, 25, 30].map(t => at(t, false)))
  expect(warmFrames.size).toBeGreaterThan(1)
})

test('no meaning rides on colour alone: each face says what the call did in its eyes, and the colours can be taken away', () => {
  const plain = (kind: 'run' | 'ok' | 'err' | 'rest') => faceRuns(kind, 1).map(r => r.text).join('')
  const faces = (['run', 'ok', 'err', 'rest'] as const).map(plain)
  expect(new Set(faces).size).toBe(4) // four states, four different strings, with no colour to help
  expect(plain('err')).toContain('×')
  expect(plain('ok')).toContain('^')
})

// ---- 0.21.1: the desktop's quiet drawings, from the review render ----
const lum = (hex: string): number => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}

test('the horizon is two ridges, a far one and a near one, each visible against the ground and the near one the stronger, in every hour and season', () => {
  expect(RIDGE_FAR.length).toBe(RIDGE.length)
  expect(RIDGE_FAR).not.toBe(RIDGE) // a different swell, so the two do not run in step
  expect(new Set(RIDGE_FAR).size).toBeGreaterThanOrEqual(4)
  expect([...RIDGE].filter((c, i) => c !== RIDGE_FAR[i]).length).toBeGreaterThan(RIDGE.length * 0.4) // out of step along most of its length
  for (const phase of ['day', 'dawn', 'dusk', 'night'] as const) for (const season of ['summer', 'autumn', 'winter', 'spring'] as const) {
    const sky = skyFor({ phase, season, weather: 'clear', festive: false })
    const near = Math.abs(lum(sky.ridgeColour) - lum(sky.ground))
    const far = Math.abs(lum(sky.ridgeFarColour) - lum(sky.ground))
    expect(near).toBeGreaterThanOrEqual(0.03) // seen, not a pale strip
    expect(near).toBeLessThanOrEqual(0.2) // and still quiet
    expect(far).toBeGreaterThanOrEqual(0.012)
    expect(far).toBeLessThan(near) // the far ridge is the fainter of the two
    if (phase === 'night' || phase === 'dusk') expect(near).toBeLessThanOrEqual(0.1) // in the dark it is quieter still
    expect(sky.ridgeFarColour).not.toBe(sky.ridgeColour)
  }
})

test('rain is thin enough to read a transcript through: a shower of a dozen drops, a storm of a few more', () => {
  const rain = skyFor({ phase: 'day', season: 'spring', weather: 'rain', festive: false }).rain.length
  const storm = skyFor({ phase: 'day', season: 'spring', weather: 'storm', festive: false }).rain.length
  expect(rain).toBe(12)
  expect(storm).toBe(28)
  expect(skyFor({ phase: 'day', season: 'spring', weather: 'cloud', festive: false }).rain).toHaveLength(0)
  // the storm's drops include the shower's: a rising storm adds drops, it does not move them
  const a = skyFor({ phase: 'day', season: 'spring', weather: 'rain', festive: false }).rain
  const b = skyFor({ phase: 'day', season: 'spring', weather: 'storm', festive: false }).rain
  expect(b.slice(0, 12)).toEqual(a)
})

test('the corner pane has a spacer row above its pair and another below, so they do not touch the heading or the days line', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const surface of ['desktop', 'terminal'] as const) {
    const corner = await $.ui.mount({ plugin: 'critter-buddy', component: 'Pane', requestId: 'cat-corner', props: { bodyColumns: 60 }, surface } as never)
    expect(await corner.find({ key: 'above-art' })).toBeDefined()
    expect(await corner.find({ key: 'below-art' })).toBeDefined()
    await corner.unmount()
  }
})

test('the backdrop draws both ridges, the far one above the near one', async ($, on) => {
  stub(on)
  kept.set('critter-buddy.scene', { value: { shape: 'scene-5', value: { ...initial(), joy: 70 } }, version: 1 })
  const ui = await $.ui.mount({ ...row('Backdrop', { id: 'x', plugin: 'critter-buddy', glass: { blur: 14, opacity: 0.5 } }), surface: 'desktop' } as never)
  const near = await ui.find({ type: 'Text', text: RIDGE })
  const far = await ui.find({ type: 'Text', text: RIDGE_FAR })
  expect(near).toBeDefined()
  expect(far).toBeDefined()
  expect(JSON.stringify(far)).not.toBe(JSON.stringify(near)) // two different elements, not one drawn twice
  const sky = skyFor({ phase: 'night', season: 'spring', weather: 'clear', festive: false }) // the test clock is 03:46 on 9 September
  expect((far as any).props.color).toBe(sky.ridgeFarColour) // each ridge in its own colour
  expect((near as any).props.color).toBe(sky.ridgeColour)
  await ui.unmount()
})

// ---- 0.22.0: motion that starts and stops softly ----
test('the cat\'s walk eases in and out: one cell a tick to start, two in the open, one again to arrive, and never a jump in speed of more than one cell', () => {
  let s: Scene = { ...initial(), cols: 120, kx: 0, cx: 80, mode: 'walk', mt: 0, target: 40, look: 'chef', trust: 80 }
  const deltas: number[] = []
  for (let i = 0; i < 40 && s.mode === 'walk'; i++) {
    const before = s.kx
    s = stepFeel({ ...s, idle: 0 }, 'warm')
    deltas.push(s.kx - before)
  }
  expect(s.mode).toBe('loaf') // it arrived and settled
  expect(Math.abs(s.kx - 40)).toBeLessThanOrEqual(2)
  const moves = deltas.filter(d => d !== 0) // the step on which it settles does not move
  expect(moves.slice(0, 2)).toEqual([1, 1]) // starts softly
  expect(Math.max(...moves)).toBe(2) // and still reaches full pace
  expect(moves.slice(-3).every(d => d === 1)).toBe(true) // arrives softly
  for (let i = 1; i < moves.length; i++) expect(Math.abs(moves[i]! - moves[i - 1]!)).toBeLessThanOrEqual(1)
  expect(deltas.every(d => d >= 0)).toBe(true) // never backwards on the way
})

test('a short walk never reaches full pace, and a walk to the left eases the same way', () => {
  let s: Scene = { ...initial(), cols: 120, kx: 30, cx: 80, mode: 'walk', mt: 0, target: 22, look: 'chef', trust: 80 }
  const deltas: number[] = []
  for (let i = 0; i < 20 && s.mode === 'walk'; i++) { const b = s.kx; s = stepFeel({ ...s, idle: 0 }, 'warm'); deltas.push(s.kx - b) }
  expect(deltas.every(d => d <= 0)).toBe(true) // to the left, and never back
  expect(deltas.filter(d => d !== 0).every(d => d === -1)).toBe(true) // eight cells or fewer: it never reaches full pace
  expect(deltas.filter(d => d !== 0).length).toBeGreaterThanOrEqual(5)
})

// ---- the wizard keeps to the right of the band, above the right side of the prompt box ----

test('in a band that holds both, the wizard has the right-hand stretch and the cat everything left of it, with a gap between', () => {
  expect(homeOf(40)).toBeUndefined() // too narrow for both: they share the bar as before
  expect(homeOf(CAT_W + CRIT_W + 1)).toBeUndefined() // one cell short
  expect(homeOf(CAT_W + CRIT_W + 2)).toEqual({ lo: 32, hi: 32, catMax: 0 }) // the least: he stands at the right end and does not pace
  expect(homeOf(67)).toEqual({ lo: 32, hi: 37, catMax: 0 }) // five cells to pace
  expect(homeOf(72)).toEqual({ lo: 32, hi: 42, catMax: 0 }) // ten, from here on
  const w = homeOf(96)!
  expect(w.hi).toBe(96 - CRIT_W) // the wizard's right edge is the band's right edge
  expect(w.lo).toBe(w.hi - 10)
  expect(w.catMax + CAT_W + 2).toBe(w.lo) // the cat stops two cells short of where he may reach
})

test('over a long time the wizard stays on the right and the cat on the left, whatever they do, and they never overlap', () => {
  for (const cols of [62, 67, 76, 96, 120]) {
    const home = homeOf(cols)!
    let s: Scene = { ...initial(), cols, cx: 4, kx: 60 }
    for (let i = 0; i < 1500; i++) {
      s = stepFeel({ ...s, idle: i % 90 === 0 ? 0 : s.idle }, 'playful')
      if (i === 200) s = react(s, 'treat') // the cat is lured, the cup is knocked: the movements that used to cross the bar
      if (i === 600) s = react(s, 'spell')
      expect(s.kx).toBeGreaterThanOrEqual(0)
      if (i > 40) { // after both have glided in from where an old scene left them
        expect(s.cx).toBeGreaterThanOrEqual(home.lo)
        expect(s.cx).toBeLessThanOrEqual(home.hi)
        expect(s.kx).toBeLessThanOrEqual(home.catMax)
        expect(s.kx + CAT_W).toBeLessThan(s.cx) // the cat's right edge is clear of the wizard's left
      }
    }
  }
})

test('the wizard glides in from where he was rather than jumping: at most two cells a tick', () => {
  let s: Scene = { ...initial(), cols: 96, cx: 4, kx: 10 }
  const jumps: number[] = []
  for (let i = 0; i < 60; i++) { const b = s.cx; s = stepFeel({ ...s, idle: 0 }, 'warm'); jumps.push(Math.abs(s.cx - b)) }
  expect(Math.max(...jumps)).toBeLessThanOrEqual(2)
  expect(s.cx).toBeGreaterThanOrEqual(homeOf(96)!.lo)
})

test('in a window too narrow for the two to have a side each, they share the bar as before and nothing breaks', () => {
  let s: Scene = { ...initial(), cols: 50 }
  for (let i = 0; i < 800; i++) {
    s = stepFeel({ ...s, idle: 0 }, 'warm')
    expect(Number.isFinite(s.cx) && Number.isFinite(s.kx)).toBe(true)
    expect(s.cx).toBeGreaterThanOrEqual(0)
    expect(s.kx).toBeGreaterThanOrEqual(0)
  }
})

test('the cat glides in from the wrong side two cells a tick, follows close on the left, and cannot be sent past its stretch', () => {
  const home = homeOf(120)!
  // glides: from far right it comes left two a tick, never faster, never back
  let s: Scene = { ...initial(), cols: 120, cx: home.lo, kx: 100, mode: 'loaf' }
  const kxs = [s.kx]
  for (let i = 0; i < 40; i++) { s = stepFeel({ ...s, idle: 0 }, 'warm'); kxs.push(s.kx) }
  for (let i = 1; i < kxs.length; i++) { expect(kxs[i - 1]! - kxs[i]!).toBeLessThanOrEqual(2); expect(kxs[i]!).toBeLessThanOrEqual(kxs[i - 1]!) }
  expect(kxs[1]).toBe(98) // two cells, not a jump to the stretch
  // follows: the cat follows him as close as its stretch allows, which is the right-hand end of it
  let f: Scene = { ...initial(), cols: 120, cx: home.lo, kx: 0, mode: 'follow', mt: 0 }
  for (let i = 0; i < 60; i++) f = stepFeel({ ...f, mode: 'follow', mt: 0, idle: 0 }, 'warm')
  expect(f.kx).toBeGreaterThanOrEqual(home.catMax - 2)
  expect(f.kx).toBeLessThanOrEqual(home.catMax)
  // a walk toward a target beyond the stretch stops at its edge
  let w: Scene = { ...initial(), cols: 120, cx: home.lo, kx: home.catMax - 1, mode: 'walk', mt: 5, target: 110, look: 'chef' }
  for (let i = 0; i < 6; i++) { w = stepFeel({ ...w, idle: 0 }, 'warm'); expect(w.kx).toBeLessThanOrEqual(home.catMax) }
})

test('on the desktop the pair\'s picture is set against the right edge of the band, so the wizard is above the right side of the prompt box', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, bodyColumns: 125 } } as never)
  const art = (await ui.find({ key: 'art-row' })) as { props?: { justifyContent?: string } } | undefined
  expect(art?.props?.justifyContent).toBe('flex-end')
  await ui.unmount()
})

// ---- 0.23.0: the sky answers you ----
test('while Claude is thinking the sky glows: its key changes, paper and ground warm a little, and nothing else moves', () => {
  const calm = skyFor({ phase: 'day', season: 'spring', weather: 'clear', festive: false })
  const glow = skyFor({ phase: 'day', season: 'spring', weather: 'clear', festive: false, glow: true })
  expect(calm.key).toBe('day-spring-clear-plain')
  expect(glow.key).toBe('day-spring-clear-plain-glow')
  for (const phase of ['day', 'dawn', 'dusk', 'night'] as const) for (const weather of ['clear', 'cloud', 'rain', 'storm'] as const) {
    const a = skyFor({ phase, season: 'summer', weather, festive: false })
    const b = skyFor({ phase, season: 'summer', weather, festive: false, glow: true })
    const dPaper = Math.abs(lum(b.paper) - lum(a.paper))
    const dGround = Math.abs(lum(b.ground) - lum(a.ground))
    expect(dPaper).toBeGreaterThan(0.004) // seen
    expect(dPaper).toBeLessThan(0.05) // and quiet
    expect(dGround).toBeGreaterThan(0.004)
    expect(dGround).toBeLessThan(0.05)
    expect(b.rain).toEqual(a.rain) // the weather and the stars keep their places
    expect(b.stars).toEqual(a.stars)
    expect(b.clouds).toEqual(a.clouds)
  }
})

test('only a wizard who is thinking makes the sky glow', () => {
  expect(thinkingOf({ ...initial(), look: 'wizard', label: 'thinking' })).toBe(true)
  expect(thinkingOf({ ...initial(), look: 'wizard', label: 'casting' })).toBe(false)
  expect(thinkingOf({ ...initial(), look: 'idle', label: 'thinking' })).toBe(false)
  expect(thinkingOf({ ...initial(), look: 'done', label: 'done, 3 tools' })).toBe(false)
})

test('the drawn backdrop warms while a turn is under way and settles when it ends', async ($, on) => {
  stub(on)
  on('prompt.submit', (_, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('model.complete', () => ({ value: { isAnswered: false, text: '', usage: {} } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1_000_000_000_000, context: { window: 1_000_000, percent: 10 }, rateLimits: [] } }) as never)
  on('prompt.suggest', () => ({ isShown: true }) as never)
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const paper = async () => {
    const ui = await $.ui.mount({ ...row('Backdrop', { id: 'x', plugin: 'critter-buddy', glass: { blur: 14, opacity: 0.5 } }), surface: 'desktop' } as never)
    const root = (await ui.find({ type: 'Box' })) as { props?: { backgroundColor?: string } } | undefined
    await ui.unmount()
    return root?.props?.backgroundColor
  }
  const calm = await paper()
  await $.prompt.submit({ text: 'hello', inputText: 'hello' } as never)
  const warm = await paper()
  expect(warm).not.toBe(calm) // thinking: the paper has warmed
  await $.turn.complete({ answer: 'done' } as never)
  expect(await paper()).toBe(calm) // and settled
})

import { SKY_CHOICES } from '../hooks/world'

test('the sky can be chosen: a named phase wins over the hour, and auto follows the hour', () => {
  const noon = Date.UTC(2026, 10, 8, 10) // 12:00 SAST
  const midnight = Date.UTC(2026, 10, 8, 22) // 00:00 SAST
  expect([...SKY_CHOICES]).toEqual(['auto', 'dawn', 'day', 'dusk', 'night'])
  expect(skyArgsOf(noon, 80, 0, false).phase).toBe('day')
  expect(skyArgsOf(noon, 80, 0, false, 'auto').phase).toBe('day')
  expect(skyArgsOf(noon, 80, 0, false, 'night').phase).toBe('night')
  expect(skyArgsOf(midnight, 80, 0, false, 'day').phase).toBe('day')
  expect(skyArgsOf(midnight, 80, 0, false, 'auto').phase).toBe('night')
  expect(skyFor(skyArgsOf(noon, 80, 0, false, 'dusk')).key).toMatch(/^dusk-/)
})

test('/critter sky changes the background of the chat now, says what it did, and refuses a word it does not know', async ($, on) => {
  stub(on)
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never))
  expect(await run('sky')).toMatch(/Usage: \/critter sky auto \| dawn \| day \| dusk \| night/)
  expect(await run('sky midday')).toMatch(/Usage: \/critter sky/)
  expect(await run('sky night')).toMatch(/night/)
  expect(await run('doctor')).toMatch(/Sky: held at night/)
  expect(await run('sky dawn')).toMatch(/dawn/)
  expect(await run('doctor')).toMatch(/Sky: held at dawn/)
  expect(await run('sky auto')).toMatch(/follows the hour/)
  expect(await run('doctor')).toMatch(/Sky: auto/)
})

test('the welcome reads the room: plain before noon, dry in the afternoon, deadpan from seven at night, and still only once', () => {
  const n = NAMES_DEFAULT
  const plain = 'Biscuit and Pip are here. /critter for the controls'
  const dry = 'Biscuit has inspected the premises. Pip says the idea was his.'
  const flat = 'Installed. Biscuit remains unconvinced.'
  expect(welcomeLine(undefined, n)).toBe(plain) // no hour known: plain
  for (const h of [5, 6, 11]) expect(welcomeLine(undefined, n, h)).toBe(plain)
  for (const h of [12, 15, 18]) expect(welcomeLine(undefined, n, h)).toBe(dry)
  for (const h of [19, 23, 0, 3, 4]) expect(welcomeLine(undefined, n, h)).toBe(flat)
  expect(welcomeLine(true, n, 12)).toBeUndefined() // said once, never again
  expect(welcomeLine(undefined, { cat: 'Mog', pip: 'Wick' }, 12)).toBe('Mog has inspected the premises. Wick says the idea was his.')
})

import { TINTS, tintOf } from '../hooks/world'

test('every folder leans its own quiet colour: the same folder always the same, and the six colours all get used', () => {
  expect(TINTS.map(t => t.name)).toEqual(['clay', 'teal', 'gold', 'violet', 'rose', 'ocean'])
  expect(tintOf('/work/alpha')).toBe(tintOf('/work/alpha'))
  const seen = new Set(Array.from({ length: 60 }, (_, i) => tintOf(`/work/project-${i}`)))
  expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5])
  for (const n of seen) expect(Number.isInteger(n) && n >= 0 && n < TINTS.length).toBe(true)
  expect(tintOf('')).toBeGreaterThanOrEqual(0) // an unknown folder still gets a colour
})

test('a tint leans the sky a little, never repaints it: ground more than paper, key changes, no tint is exactly the old sky', () => {
  const base = { phase: 'day', season: 'spring', weather: 'clear', festive: false } as const
  const none = skyFor(base)
  const teal = skyFor({ ...base, tint: 1 })
  const clay = skyFor({ ...base, tint: 0 })
  expect(none.key).not.toMatch(/-t\d/)
  expect(teal.key).toMatch(/-t1$/)
  expect(teal.key).not.toBe(clay.key)
  expect(teal.paper).not.toBe(none.paper)
  expect(teal.ground).not.toBe(none.ground)
  expect(teal.ground).not.toBe(clay.ground)
  // the lean is small: no channel of the paper moves by more than 4% of the range, and the ground by no more than 14%
  const ch = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const far = (a: string, b: string) => Math.max(...ch(a).map((v, i) => Math.abs(v - ch(b)[i]!))) / 255
  expect(far(teal.paper, none.paper)).toBeLessThan(0.04)
  expect(far(teal.ground, none.ground)).toBeLessThan(0.14)
  expect(far(teal.ground, none.ground)).toBeGreaterThan(0.01)
  expect(skyFor({ ...base, tint: undefined }).ground).toBe(none.ground)
})

test('/critter tint puts the folder\'s own colour in the sky or takes it out, and the doctor says which', async ($, on) => {
  stub(on)
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/work/alpha', surface: 'desktop', isInteractive: true })
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never))
  const name = TINTS[tintOf('/work/alpha')]!.name
  expect(await run('doctor')).toMatch(new RegExp(`Tint: the sky leans ${name} here`)) // on by default
  expect(await run('tint maybe')).toMatch(/Usage: \/critter tint on \| off/)
  expect(await run('tint off')).toMatch(/plain/i)
  expect(await run('doctor')).toMatch(/Tint: off/)
  expect(await run('tint on')).toMatch(new RegExp(name))
  expect(await run('doctor')).toMatch(new RegExp(`leans ${name}`))
})

test('a tint switched off stays off when the mod reloads', async ($, on) => {
  stub(on)
  kept.set('critter-buddy.tint', { value: { shape: 'tint-1', value: false }, version: 1 })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/work/alpha', surface: 'desktop', isInteractive: true })
  const out = JSON.stringify(await $.command.run({ command: 'critter', args: 'doctor', origin: { kind: 'composer' }, presentation: {} } as never))
  expect(out).toMatch(/Tint: off/)
})

import { tintFor } from '../hooks/world'

test('the sky uses a folder\'s colour only while the tint is on', () => {
  expect(tintFor(true, 3)).toBe(3)
  expect(tintFor(true, 0)).toBe(0) // clay is index 0: zero is a colour, not nothing
  expect(tintFor(false, 3)).toBeUndefined()
  expect(tintFor(true, undefined)).toBeUndefined()
})

import { newProbe, noteBeat, perfLines } from '../hooks/scene'

test('the clock keeps books: a hidden beat costs nothing, a stepped beat costs what it was told, and the words say so', () => {
  expect(perfLines(newProbe())).toEqual(['No beat has run yet.'])
  let p = newProbe()
  p = noteBeat(p, 'hidden', 0, 0)
  p = noteBeat(p, 'waited', 1, 2)
  p = noteBeat(p, 'stepped', 3, 6)
  p = noteBeat(p, 'stepped', 3, 4)
  expect(p).toEqual({ beats: 4, hidden: 1, waited: 1, stepped: 2, calls: 7, ms: 12, worst: 6 })
  const text = perfLines(p).join('\n')
  expect(text).toMatch(/4 beats: 2 stepped the scene, 1 looked and waited, 1 did nothing/)
  expect(text).toMatch(/7 in all, 2\.33 a beat that ran/) // 7 calls over the 3 beats that ran
  expect(text).toMatch(/4\.00 ms a beat that ran, the slowest 6 ms/)
})

test('/critter perf answers before any beat has run, and /critter hide still hides with the beat reading a mirror', async ($, on) => {
  stub(on)
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never))
  expect(await run('perf')).toMatch(/No beat has run yet/)
  expect(await run('hide')).toMatch(/The pair are hidden/)
  expect(await run('show')).toMatch(/The pair are back/)
})

import { paintSvg as paintSvgMemo } from '../hooks/scene'

test('a picture asked for twice with the same scene is built once, and a different scene is a different picture', () => {
  const s = { ...initial(), cols: 40 }
  const a = paintSvgMemo(s, 5)
  expect(paintSvgMemo({ ...s }, 5)).toBe(a) // an equal scene, not the same object: the same picture comes back
  const b = paintSvgMemo({ ...s, tick: s.tick + 1, mode: 'walk' }, 5)
  expect(b).not.toBe(a)
  expect(b.source).not.toBe(a.source)
})

import { backdropOutcome } from '../hooks/scene'

test('the host’s answer about the backdrop becomes a line: drawn, or not drawn with the reason it gave', () => {
  expect(backdropOutcome({ isDrawn: true, requestId: 'backdrop' })).toEqual({ drawn: true, text: 'drawn' })
  expect(backdropOutcome({ isDrawn: false, reason: 'no surface is attached yet' })).toEqual({ drawn: false, text: 'not drawn (no surface is attached yet)' })
  expect(backdropOutcome({ isDrawn: false })).toEqual({ drawn: false, text: 'not drawn (the host gave no reason)' })
  expect(backdropOutcome(undefined)).toEqual({ drawn: false, text: 'not drawn (the host answered something unreadable)' })
  expect(backdropOutcome('yes')).toEqual({ drawn: false, text: 'not drawn (the host answered something unreadable)' })
})

test('the doctor says why there is no sky on the desktop, and that only the desktop draws one elsewhere', () => {
  const base = { detail: 'party', feel: 'warm', sound: false, voice: '', talk: false, hidden: false, cols: 120, surface: 'desktop' }
  expect(doctorLines({ ...base, backdrop: 'not drawn (no surface is attached yet)' })).toContain('Backdrop: not drawn (no surface is attached yet).')
  expect(doctorLines({ ...base, surface: 'terminal', backdrop: 'drawn' })).toContain('Backdrop: only the desktop app draws one.')
  expect(doctorLines(base).some(l => l.startsWith('Backdrop'))).toBe(false)
})

test('/critter doctor reports what the host said about the backdrop on the desktop, and says only the desktop draws one elsewhere', async ($, on) => {
  stub(on)
  on('ui.status', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }) as never)
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const doctor = async (surface: string) => JSON.stringify(await $.command.run({ command: 'critter', args: 'doctor', origin: { kind: 'composer' }, presentation: {}, surface } as never))
  // the test engine answers $.ui.backdrop itself: whatever it says is now in the doctor's words, never silent
  expect(await doctor('desktop')).toMatch(/Backdrop: (drawn|not drawn \(.+\))\./)
})

import { surfaceOf } from '../hooks/scene'

test('the doctor names the desktop when it is attached, even if the command event says nothing or terminal', () => {
  expect(surfaceOf(['terminal', 'desktop'], 'terminal')).toBe('desktop')
  expect(surfaceOf(['desktop'])).toBe('desktop')
  expect(surfaceOf(['terminal'], undefined)).toBe('terminal')
  expect(surfaceOf([], 'desktop')).toBe('desktop')
  expect(surfaceOf([])).toBe('terminal')
})

import { skyFor as skyForContrast, TINTS as TINTS_CONTRAST } from '../hooks/world'

// The sky was tuned so quiet that on a desktop window it read as nothing at all. These are the floors it must now clear, on the
// WCAG contrast ratio (1 is identical, 21 is black on white): the ground band against the paper, the near ridge against the ground,
// the far ridge against the ground, a cloud against the paper, and the sun or moon against the paper. Not loud: just seen.
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
test('every sky, in every phase, season, weather and folder tint, has a ground, ridges, clouds and a sun you can see', () => {
  const misses: string[] = []
  for (const phase of ['dawn', 'day', 'dusk', 'night'] as const)
    for (const season of ['summer', 'autumn', 'winter', 'spring'] as const)
      for (const weather of ['clear', 'cloud', 'rain', 'storm'] as const)
        for (const tint of [undefined, ...TINTS_CONTRAST.map((_, i) => i)]) {
          const s = skyForContrast({ phase, season, weather, festive: false, tint })
          const floor = (what: string, ratio: number, min: number) => { if (ratio < min) misses.push(`${phase}/${season}/${weather}/tint ${tint}: ${what} ${ratio.toFixed(2)} < ${min}`) }
          floor('ground on paper', contrast(s.paper, s.ground), 1.2)
          floor('near ridge on ground', contrast(s.ground, s.ridgeColour), 1.12)
          floor('far ridge on ground', contrast(s.ground, s.ridgeFarColour), 1.06)
          floor('cloud on paper', contrast(s.paper, s.cloudColour), 1.12)
          if (!s.bodyHidden) floor('sun or moon on paper', contrast(s.paper, s.bodyColor), 1.4)
        }
  expect(misses.slice(0, 6)).toEqual([]) // the first few that miss, named
  expect(misses.length).toBe(0)
})

import { withSky, paintSvg as paintSvgSky } from '../hooks/scene'

test('a sky drawn behind a picture keeps its size, shows the ground and the ridges, and a night sky has a crescent moon', () => {
  const art = paintSvgSky({ ...initial(), cols: 40 }, 5)
  const day = skyForContrast({ phase: 'day', season: 'summer', weather: 'clear', festive: false })
  const out = withSky(art, day)
  expect(out.width).toBe(art.width)
  expect(out.height).toBe(art.height)
  expect(out.source.startsWith('<svg')).toBe(true)
  expect(out.source).toContain(`stop-color="${day.ground}"`)
  expect(out.source).toContain(`stop-color="${day.ridgeColour}"`) // each ridge fades in from the left, so it has no hard edge
  expect(out.source).toContain(`stop-color="${day.ridgeFarColour}"`)
  expect(out.source).toContain(`fill="${day.bodyColor}"`) // the sun
  expect(out.source).not.toContain(`fill="${day.paper}"`) // no crescent by day
  const night = skyForContrast({ phase: 'night', season: 'summer', weather: 'clear', festive: false })
  expect(withSky(art, night).source).toContain(`fill="${night.paper}"`) // the bite out of the moon
  expect(withSky(art, day).source).not.toBe(art.source) // and the art is still in there after the sky
  expect(withSky(art, day).source.endsWith(art.source.slice(art.source.indexOf('>') + 1))).toBe(true)
})

test('where the app has no backdrop (this one has none, as the desktop app showed) the band carries the sky in its picture', async ($, on) => {
  stub(on)
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = (await band.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined
  expect(svg?.props?.source).toContain('<linearGradient') // the ground fades in behind the pair
  expect(svg?.props?.source).toContain('<polygon') // and the ridges are there
  await band.unmount()
})

import { backdropFailure } from '../hooks/scene'

test('a backdrop call that is not there is named and never retried, and a refusal is told as the host said it and retried', () => {
  const absent = backdropFailure(new TypeError('$.ui.backdrop is not a function. (In \'$.ui.backdrop(arg)\', \'$.ui.backdrop\' is undefined)'))
  expect(absent.final).toBe(true)
  expect(absent.text).toMatch(/this version of the app has no backdrop/)
  const refused = backdropFailure(new Error('the window is not ready'))
  expect(refused).toEqual({ final: false, text: 'not drawn (the host refused the call: the window is not ready)' })
  expect(backdropFailure('boom').final).toBe(false)
})

import { paneColumns } from '../hooks/scene'

test('a pane asks for what the window leaves after the chat: its full size from 110 columns, 48 at 98, and never under 36', () => {
  expect(paneColumns(110, 60)).toBe(60)
  expect(paneColumns(110, 56)).toBe(56)
  expect(paneColumns(98, 60)).toBe(48)
  expect(paneColumns(98, 56)).toBe(48)
  expect(paneColumns(130, 60)).toBe(60) // a wide window never makes it wider than it asked
  expect(paneColumns(70, 60)).toBe(36)
  expect(paneColumns(20, 56)).toBe(36)
})

test('review fixes: an error from inside the app is not "no backdrop", a NaN day count changes no trust, and the horizon does not move when the picture gets taller', () => {
  expect(backdropFailure(new TypeError("Cannot read properties of undefined (reading 'x')")).final).toBe(false) // a TypeError from the app's own code is retried, not given up on
  expect(backdropFailure(new TypeError('$.ui.backdrop is not a function')).final).toBe(true)
  expect(returnTrust(60, Number.NaN)).toBe(60)
  const blank = (h: number) => ({ source: `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${h}" viewBox="0 0 480 ${h}"></svg>`, width: 480, height: h })
  const sky = skyForContrast({ phase: 'day', season: 'summer', weather: 'clear', festive: false })
  const ground = (h: number) => { const m = /<rect x="0" y="(\d+)" width="\d+" height="(\d+)" fill="url/.exec(withSky(blank(h), sky).source); return { top: Number(m![1]), thickness: Number(m![2]) } }
  expect(ground(100).thickness).toBe(ground(160).thickness) // the ground is the same thickness however tall the picture is
  expect(ground(160).top - ground(100).top).toBe(60) // and it keeps to the bottom
})

test('the stage and the corner know the window width even when the pair were hidden before the band ever drew', async ($, on) => {
  stub(on)
  const asked: Record<string, unknown>[] = []
  on('ui.open', (_: unknown, e: Record<string, unknown>) => { asked.push(e); return { value: undefined } })
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const run = (args: string) => $.command.run({ command: 'critter', args, origin: { kind: 'composer' }, presentation: {} } as never)
  await run('hide')
  const hidden = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, bodyColumns: 130 } } as never) // the band draws nothing, but it hears the width
  await hidden.unmount()
  await run('stage')
  expect(asked[0]).toMatchObject({ id: 'stage', columns: 60 }) // not 36, which is what a window of 80 would get
})

test('the ridges and the ground all fade in from fully clear at the left edge of the picture', () => {
  const art = { source: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120" viewBox="0 0 480 120"></svg>', width: 480, height: 120 }
  const sky = skyForContrast({ phase: 'day', season: 'summer', weather: 'clear', festive: false })
  const out = withSky(art, sky).source
  for (const id of ['fade', 'ridge-near', 'ridge-far']) expect(new RegExp(`<linearGradient id="${id}"[^>]*><stop offset="0" stop-color="#[0-9a-f]{6}" stop-opacity="0"/>`).test(out), id).toBe(true)
  expect(out).not.toMatch(/<polygon[^>]*fill="#/) // no ridge is drawn in a flat colour
})

test('no cloud, star or raindrop is drawn closer than 36 px to either side of the picture, so the edge never cuts one', () => {
  const art = { source: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120" viewBox="0 0 480 120"></svg>', width: 480, height: 120 }
  for (const weather of ['clear', 'cloud', 'rain', 'storm'] as const)
    for (const phase of ['day', 'night'] as const) {
      const out = withSky(art, skyForContrast({ phase, season: 'summer', weather, festive: false })).source
      const xs = [...out.matchAll(/<(?:ellipse cx|rect x|line x1)="(\d+)"/g)].map(m => Number(m[1])).filter(v => v > 0 && v < 480)
      for (const v of xs) { expect(v).toBeGreaterThanOrEqual(33); expect(v).toBeLessThanOrEqual(447) }
    }
})
