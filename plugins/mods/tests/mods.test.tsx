import { expect, test } from 'claude-code/testing'

import { DIALS, HUB, MARKET, MODS, actionFor, cellsOf, fit, idOf, installArgv, listLine, parseList, restartNeeded, stateOf, toggleArgv } from '../hooks/catalog'
import type { Installed } from '../hooks/catalog'

const on_ = (id: string, version = '1.0.0'): Installed => ({ id: `${id}@${MARKET}`, version, enabled: true })
const off_ = (id: string, version = '1.0.0'): Installed => ({ id: `${id}@${MARKET}`, version, enabled: false })

// ---- the catalogue -----------------------------------------------------------

test('the control room knows the eight mods, critter-buddy first, each with a line of its own and the commands that open it', () => {
  expect(MODS.map(m => m.id)).toEqual(['critter-buddy', 'session-diary', 'build-bell', 'guard', 'stunt', 'crab', 'forge', 'everywhere'])
  expect(new Set(MODS.map(m => m.line)).size).toBe(8) // no two alike
  for (const m of MODS) {
    expect(m.line.length).toBeGreaterThan(20)
    expect(m.line.length).toBeLessThanOrEqual(90)
    expect(m.id).toMatch(/^[a-z-]+$/)
    for (const o of m.opens) {
      expect(o.command).toMatch(/^[a-z]+$/)
      expect(o.args).not.toMatch(/[;&|`$\n]/)
    }
  }
  expect(MODS[0]!.opens.map(o => o.label)).toEqual(['corner', 'stage'])
  expect(MODS.find(m => m.id === 'session-diary')!.opens.map(o => `${o.command} ${o.args}`.trim())).toEqual(['diary', 'diary week', 'diary postcard'])
  expect(MODS.find(m => m.id === 'guard')!.opens).toEqual([]) // it has nothing to open: it works quietly
  expect(HUB).toBe('mods')
  expect(MODS.some(m => m.id === HUB)).toBe(false) // the control room never lists itself as a switch
})

test('the plugin manager\'s list is read with suspicion: a bad entry is skipped, a bad document is empty, only this marketplace counts', () => {
  const good = JSON.stringify([
    { id: 'crab@sovereign-critters', version: '0.2.0', enabled: true, scope: 'user' },
    { id: 'forge@sovereign-critters', version: '0.1.0', enabled: false },
    { id: 'other@elsewhere', version: '9', enabled: true },
    { id: 'guard@sovereign-critters', enabled: true }, // no version: shown as "?"
    { id: 42, version: '1', enabled: true },
    { id: 'crab2@sovereign-critters', version: '1', enabled: 'yes' },
    'junk',
    null,
  ])
  expect(parseList(good)).toEqual([
    { id: 'crab@sovereign-critters', version: '0.2.0', enabled: true },
    { id: 'forge@sovereign-critters', version: '0.1.0', enabled: false },
    { id: 'guard@sovereign-critters', version: '?', enabled: true },
  ])
  expect(parseList('not json')).toEqual([])
  expect(parseList('{"a":1}')).toEqual([])
  expect(parseList('')).toEqual([])
  expect(idOf('crab')).toBe('crab@sovereign-critters')
})

test('a mod is on, off or not installed, and a change waits for a restart until the session has been through one', () => {
  const crab = MODS.find(m => m.id === 'crab')!
  expect(stateOf(crab, [on_('crab', '0.2.0')])).toEqual({ state: 'on', version: '0.2.0' })
  expect(stateOf(crab, [off_('crab', '0.2.0')])).toEqual({ state: 'off', version: '0.2.0' })
  expect(stateOf(crab, [on_('forge')])).toEqual({ state: 'missing', version: '' })
  expect(stateOf(crab, [])).toEqual({ state: 'missing', version: '' })
  // loaded when the session began vs now
  expect(restartNeeded('on', true)).toBe(false) // on now, was loaded: nothing to do
  expect(restartNeeded('off', true)).toBe(true) // switched off, still loaded this session
  expect(restartNeeded('on', false)).toBe(true) // switched on, not loaded this session
  expect(restartNeeded('off', false)).toBe(false)
  expect(restartNeeded('missing', false)).toBe(false)
  expect(restartNeeded('missing', true)).toBe(true) // removed while loaded
})

test('a switch is a fixed command line built from the catalogue, and never from text the person typed', () => {
  const crab = MODS.find(m => m.id === 'crab')!
  expect(toggleArgv(crab, 'on')).toEqual(['claude', 'plugin', 'disable', 'crab@sovereign-critters', '--scope', 'user'])
  expect(toggleArgv(crab, 'off')).toEqual(['claude', 'plugin', 'enable', 'crab@sovereign-critters', '--scope', 'user'])
  expect(toggleArgv(crab, 'missing')).toBeUndefined() // not installed: nothing to switch
  expect(installArgv(crab)).toEqual(['claude', 'plugin', 'install', 'crab@sovereign-critters', '--scope', 'user'])
  for (const m of MODS) for (const argv of [toggleArgv(m, 'on'), toggleArgv(m, 'off'), installArgv(m)]) if (argv) for (const w of argv) expect(w).not.toMatch(/[\s;&|`$]/)
})

test('a typed word finds its mod, a command line only comes from the catalogue, and the hub cannot be switched off from itself', () => {
  expect(actionFor('critter')?.id).toBe('critter-buddy')
  expect(actionFor('Critter-Buddy')?.id).toBe('critter-buddy')
  expect(actionFor('diary')?.id).toBe('session-diary')
  expect(actionFor('bell')?.id).toBe('build-bell')
  expect(actionFor('crab')?.id).toBe('crab')
  expect(actionFor('mods')).toBeUndefined()
  expect(actionFor('rm -rf /')).toBeUndefined()
  expect(actionFor('')).toBeUndefined()
  expect(actionFor('cr')).toBeUndefined() // a prefix is not a name: no guessing
})

test('a line is cut to the cell, with an ellipsis, exactly at the edge', () => {
  expect(cellsOf('abc')).toBe(3)
  expect(fit('abcde', 5)).toBe('abcde')
  expect(fit('abcdef', 5)).toBe('abcd…')
  expect(fit('abcdef', 0)).toBe('')
  expect(fit('🦀🦀🦀', 5)).toBe('🦀🦀…')
})

test('the plain list says each mod\'s state in words and symbols, so it reads without colour', () => {
  const list = [on_('critter-buddy', '0.21.1'), off_('crab', '0.2.0')]
  const lines = MODS.map(m => listLine(m, stateOf(m, list), new Set(['critter-buddy', 'crab']), 80))
  expect(lines[0]).toMatch(/^● critter-buddy +0\.21\.1 +on/)
  expect(lines[5]).toMatch(/^○ crab +0\.2\.0 +off, restart to apply/) // off now, loaded at the start
  expect(lines[1]).toMatch(/^– session-diary +not installed/)
  for (const l of lines) expect(cellsOf(l)).toBeLessThanOrEqual(80)
})

// ---- the command and the pane ------------------------------------------------

const PROCESS_OK = { exitCode: 0, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
const LIST = JSON.stringify([...MODS.map(m => ({ id: `${m.id}@${MARKET}`, version: '1.0.0', enabled: m.id !== 'forge' })), { id: `mods@${MARKET}`, version: '0.1.0', enabled: true }])

const setup = ($: any, on: any, listOut: string = LIST, openHandler: (...a: any[]) => unknown = () => ({ value: { isPlaced: true } }), custom?: (argv: string[]) => unknown) => {
  const ran: string[][] = []
  const commands: { command: string; args: string }[] = []
  on('command.register', () => ({ value: { command: 'mods' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  let doc = JSON.parse(listOut) as { id: string; enabled: boolean }[] // the plugin manager remembers what it was told
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    ran.push([...e.argv])
    const c = custom?.(e.argv)
    if (c) return c
    const verb = e.argv[2]
    if (verb === 'disable' || verb === 'enable') doc = doc.map(x => (x.id === e.argv[3] ? { ...x, enabled: verb === 'enable' } : x))
    return { value: { ...PROCESS_OK, stdout: e.argv.includes('list') ? JSON.stringify(doc) : '{"ok":true}' } }
  })
  on('ui.open', openHandler as never)
  on('command.run', (_: unknown, e: { command: string; args: string }) => { if (e.command !== 'mods') commands.push({ command: e.command, args: e.args }); return { text: `ran ${e.command}` } })
  return { ran, commands }
}
const run = ($: any, args: string) => $.command.run({ command: 'mods', args, origin: { kind: 'composer' }, presentation: {} }).then((r: { text?: string }) => r.text ?? '')
const begin = ($: any) => $.session.start({ cwd: '/work/atlas', surface: 'terminal', isInteractive: true })

test('/mods list says every mod in plain lines, and how many are on', async ($, on) => {
  setup($, on)
  await begin($)
  const text = await run($, 'list')
  expect(text).toContain('Mods: 7 of 8 on.')
  expect(text).toMatch(/● critter-buddy +1\.0\.0 +on/)
  expect(text).toMatch(/○ forge +1\.0\.0 +off/)
  expect(text.split('\n').length).toBe(1 + 8 + 1) // headline, eight mods, one line on how to use it
})

test('/mods opens the control room as a pane, and says so', async ($, on) => {
  const opened: { id: string }[] = []
  setup($, on, LIST, (_: unknown, e: { id: string }) => { opened.push(e); return { value: { isPlaced: true } } })
  await begin($)
  expect(await run($, '')).toMatch(/control room is open/i)
  expect(opened[0]).toMatchObject({ id: 'mods', focus: true, closeOnEscape: true })
})

test('/mods off <name> switches the mod off through the plugin manager and says a restart is needed; /mods on switches it back', async ($, on) => {
  const { ran } = setup($, on)
  await begin($)
  expect(await run($, 'off crab')).toMatch(/crab is off\. Restart Claude Code to apply/i)
  expect(ran.some(a => a.join(' ') === 'claude plugin disable crab@sovereign-critters --scope user')).toBe(true)
  expect(await run($, 'on forge')).toMatch(/forge is on/i)
  expect(ran.some(a => a.join(' ') === 'claude plugin enable forge@sovereign-critters --scope user')).toBe(true)
})

test('nothing the person types ever reaches the plugin manager unless it is a catalogue name', async ($, on) => {
  const { ran } = setup($, on)
  await begin($)
  const before = ran.length
  for (const bad of ['off rm -rf /', 'off crab; ls', 'on $(whoami)', 'off', 'on', 'off mods', 'off ../../x', 'off crab@evil']) expect(await run($, bad)).toMatch(/Usage|no mod|cannot/i)
  expect(ran.length).toBe(before + 0) // no process was started for any of them beyond reading the list
})

test('a plugin manager that fails or cannot start is told, not thrown, and the pane still draws', async ($, on) => {
  on('command.register', () => ({ value: { command: 'mods' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('process.run', () => { throw new Error('no such program') })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 56 } } as never)
  expect(await ui.find({ type: 'Text', text: /cannot reach the plugin manager/i })).toBeDefined() // drawn from the failed read alone, before anything was typed
  expect(await ui.find({ key: 'switch-crab' })).toBeUndefined() // and no switch that could do nothing
  await ui.unmount()
  expect(await run($, 'list')).toMatch(/cannot reach the plugin manager/i)
  expect(await run($, 'off crab')).toMatch(/cannot reach the plugin manager/i)
})

test('/mods open <name> puts the mod\'s own first command in the box, and /mods open <name> <label> a named one', async ($, on) => {
  const { commands } = setup($, on)
  const filled: string[] = []
  on('prompt.fill', (_: unknown, e: { text: string }) => { filled.push(e.text); return { isFilled: true } })
  await begin($)
  expect(await run($, 'open critter')).toMatch(/\/critter corner is in the box: press Enter/)
  await run($, 'open diary postcard')
  expect(filled).toEqual(['/critter corner', '/diary postcard'])
  expect(await run($, 'open guard')).toMatch(/nothing to open/i)
  expect(await run($, 'open critter nonsense')).toMatch(/no such thing to open. Try: corner, stage/i)
  expect(await run($, 'open forge')).toMatch(/nothing to open/i)
  expect(await run($, 'open crab')).toMatch(/\/crab is in the box/) // crab is on in the stub list
  expect(filled).toHaveLength(3)
  expect(commands).toHaveLength(0) // a typed command never runs another from inside itself
})

test('a mod that is off has nothing to open, and a box that cannot take text says what to type', async ($, on) => {
  setup($, on, JSON.stringify([{ id: `crab@${MARKET}`, version: '0.2.0', enabled: false }, { id: `critter-buddy@${MARKET}`, version: '1', enabled: true }]))
  on('prompt.fill', () => ({ isFilled: false }))
  await begin($)
  expect(await run($, 'open crab')).toMatch(/crab is not on/i)
  expect(await run($, 'open critter')).toBe('Type /critter corner to open critter-buddy corner.')
})

test('/mods install adds a missing mod from the marketplace, one mod or all of them', async ($, on) => {
  const { ran } = setup($, on, JSON.stringify([{ id: `crab@${MARKET}`, version: '0.2.0', enabled: true }]))
  await begin($)
  expect(await run($, 'install forge')).toMatch(/forge is installed\. Restart Claude Code to load it/i)
  expect(ran.some(a => a.join(' ') === 'claude plugin install forge@sovereign-critters --scope user')).toBe(true)
  const text = await run($, 'install all')
  expect(text).toMatch(/Installed 7/)
  expect(ran.filter(a => a.includes('install')).length).toBe(1 + 7) // crab was already there
  expect(await run($, 'install crab')).toMatch(/crab is already installed/i)
})

test('the pane has a header with the count, refresh and close, and every mod: a titled text card in the terminal and a picture on the desktop, each with its switch', async ($, on) => {
  setup($, on)
  await begin($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface, props: { bodyColumns: 80 } } as never)
    expect(await ui.find({ type: 'Text', text: 'Your mods · 7 of 8 on' })).toBeDefined()
    expect(((await ui.find({ key: 'refresh' })) as { props?: { hotkey?: string } } | undefined)?.props?.hotkey).toBe('r')
    expect(((await ui.find({ key: 'close' })) as { props?: { hotkey?: string } } | undefined)?.props?.hotkey).toBe('q')
    for (const m of MODS) {
      expect(await ui.find({ key: `switch-${m.id}` })).toBeDefined()
      expect(await ui.find({ key: `mod-${m.id}` })).toBeDefined()
    }
    if (surface === 'desktop') {
      expect((await ui.findAll({ type: 'Svg' })).length).toBe(8) // one picture a card
      expect(await ui.find({ type: 'Text', text: /WHAT'S NEW/ })).toBeUndefined() // the words are in the picture
    } else {
      expect(await ui.find({ type: 'Svg' })).toBeUndefined() // no picture in a plain terminal
      expect(await ui.find({ type: 'Text', text: 'Critter Buddy v1.0.0' })).toBeDefined()
    }
    expect(await ui.find({ key: 'open-critter-buddy-corner' })).toBeDefined()
    expect(await ui.find({ key: 'open-session-diary-postcard' })).toBeDefined()
    expect(await ui.find({ key: 'open-guard-0' })).toBeUndefined()
    await ui.unmount()
  }
})

test('pressing a switch in the pane runs the plugin manager and redraws with the restart note; pressing open runs the command', async ($, on) => {
  const { ran, commands } = setup($, on)
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 56 } } as never)
  await ui.press({ key: 'switch-crab' })
  expect(ran.some(a => a.join(' ') === 'claude plugin disable crab@sovereign-critters --scope user')).toBe(true)
  await ui.press({ key: 'open-critter-buddy-stage' })
  expect(commands.at(-1)).toEqual({ command: 'critter', args: 'stage' })
  await ui.unmount()
})

test('at 40 columns and at 130 no line of the pane is wider than the pane', async ($, on) => {
  setup($, on)
  await begin($)
  for (const bodyColumns of [28, 40, 56, 130]) {
    const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns } } as never)
    for (const t of await ui.findAll({ type: 'Text' })) expect(cellsOf(String((t as { text?: string }).text ?? ''))).toBeLessThanOrEqual(Math.max(bodyColumns, 20))
    await ui.unmount()
  }
})

test('the list lines up in columns, and the hub, a stray word or an extra word never switches anything', async ($, on) => {
  const { ran } = setup($, on)
  await begin($)
  const text = await run($, 'list')
  const rows = text.split('\n').slice(1, 9)
  const col = (l: string) => l.search(/ (on|off|not installed)/)
  expect(new Set(rows.filter(r => !r.startsWith('–')).map(col)).size).toBe(1) // the state words start in one column
  const before = ran.length
  expect(await run($, 'off mods')).toMatch(/cannot switch itself off/i)
  expect(await run($, 'off crab now')).toMatch(/^Usage:/)
  expect(await run($, 'on crab')).toBe('crab is already on.')
  expect(ran.length).toBe(before)
})

test('switching a mod on that this session did not load says it needs a restart to load; one it did load does not', async ($, on) => {
  setup($, on) // forge is off in the stub, so it was not loaded at the start
  await begin($)
  expect(await run($, 'on forge')).toBe('forge is on. Restart Claude Code to load it.')
})

test('each switch is drawn as a toggle that shows its state, in a glyph and in a word, and install for a mod that is missing', async ($, on) => {
  setup($, on, JSON.stringify([{ id: `crab@${MARKET}`, version: '0.2.0', enabled: true }, { id: `forge@${MARKET}`, version: '0.1.0', enabled: false }]))
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 56 } } as never)
  const label = async (id: string) => ((await ui.find({ key: `switch-${id}` })) as { props?: { label?: string } } | undefined)?.props?.label
  expect(await label('crab')).toBe('━● on') // the switch shows where it stands: a mod that is on has its knob to the right
  expect(await label('forge')).toBe('●━ off')
  expect(await label('guard')).toBe('install')
  expect(await ui.find({ key: 'open-crab-note' })).toBeDefined() // on: its pane can be opened
  await ui.unmount()
  const off = setup
  void off
})

test('a mod that is off shows no open buttons', async ($, on) => {
  setup($, on, JSON.stringify([{ id: `crab@${MARKET}`, version: '0.2.0', enabled: false }]))
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 56 } } as never)
  expect(await ui.find({ key: 'open-crab-note' })).toBeUndefined()
  await ui.unmount()
})

test('a long state line is cut to the pane\'s width, restart note and all', async ($, on) => {
  setup($, on)
  await begin($)
  await run($, 'off session-diary') // loaded at the start, now off: "off, restart to apply"
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 28 } } as never)
  expect(await ui.find({ type: 'Text', text: 'off, restart to apply' })).toBeDefined() // the card says what a restart will do
  const titles = (await ui.findAll({ type: 'Text', text: /^[●○–] / })) as { text?: string }[]
  expect(titles.length).toBe(8)
  for (const t of titles) expect(cellsOf(String(t.text))).toBeLessThanOrEqual(28 - 4 - 12 + 2) // card border and padding, the switch, and the symbol
  await ui.unmount()
})

test('the dials are the lead mod\'s own commands, fixed in the catalogue', () => {
  expect(DIALS.map(d => d.id)).toEqual(['feel', 'reach', 'pair', 'sound'])
  expect(DIALS[0]!.options.map(o => o.args)).toEqual(['feel calm', 'feel warm', 'feel playful', 'feel still'])
  expect(DIALS[1]!.options.map(o => o.args)).toEqual(['lite', 'full', 'party'])
  expect(DIALS[2]!.options.map(o => o.args)).toEqual(['show', 'hide'])
  expect(DIALS[3]!.options.map(o => o.args)).toEqual(['sound on', 'sound off'])
  for (const d of DIALS) for (const o of d.options) expect(o.args).toMatch(/^[a-z]+( [a-z]+)?$/)
})

test('the pane has the look-and-feel dials, and pressing one runs the lead mod\'s command', async ($, on) => {
  const { commands } = setup($, on)
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 56 } } as never)
  expect(await ui.find({ type: 'Text', text: /Look and feel/ })).toBeDefined()
  for (const d of DIALS) for (const o of d.options) expect(await ui.find({ key: `dial-${d.id}-${o.label}` })).toBeDefined()
  await ui.press({ key: 'dial-feel-still' })
  expect(commands.at(-1)).toEqual({ command: 'critter', args: 'feel still' })
  await ui.press({ key: 'dial-pair-hide' })
  expect(commands.at(-1)).toEqual({ command: 'critter', args: 'hide' })
  await ui.unmount()
})

test('the dials are not drawn when critter-buddy is off or missing', async ($, on) => {
  setup($, on, JSON.stringify([{ id: `critter-buddy@${MARKET}`, version: '1', enabled: false }]))
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 56 } } as never)
  expect(await ui.find({ key: 'dial-feel-still' })).toBeUndefined()
  await ui.unmount()
})

test('the footer carries a count of the mods that are on, after whatever the footer already says', async ($, on) => {
  setup($, on)
  on('ui.render', ($: any, e: any) => { const { Text } = $.ui.resolve(e); return <Text>{(e.props.modes ?? []).join(' · ')}</Text> })
  await begin($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'mods', component: 'SessionMode', requestId: 'r1', props: { modes: ['auto mode on'] }, surface } as never)
    expect((await ui.find({ type: 'Text', text: /auto mode on/ }))?.text).toBe('auto mode on · mods 7/8')
    await ui.unmount()
  }
})

test('the footer says nothing of mods where the plugin manager could not be read, and does not count twice', async ($, on) => {
  on('command.register', () => ({ value: { command: 'mods' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('process.run', () => { throw new Error('no manager') })
  on('ui.render', ($: any, e: any) => { const { Text } = $.ui.resolve(e); return <Text>{(e.props.modes ?? []).join(' · ')}</Text> })
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'SessionMode', requestId: 'r1', props: { modes: ['auto mode on'] }, surface: 'terminal' } as never)
  expect((await ui.find({ type: 'Text', text: /auto mode on/ }))?.text).toBe('auto mode on')
  await ui.unmount()
  const again = await $.ui.mount({ plugin: 'mods', component: 'SessionMode', requestId: 'r1', props: { modes: ['mods 3/8'] }, surface: 'terminal' } as never)
  expect((await again.find({ type: 'Text', text: /mods/ }))?.text).toBe('mods 3/8') // a footer that already has the chip is left alone
  await again.unmount()
})

test('a terminal card has a border in the pair\'s clay when on and dim when off, a stamp in words, the plain line, the steps and the release notes', async ($, on) => {
  setup($, on)
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 80 } } as never)
  const card = async (id: string) => (await ui.find({ key: `mod-${id}` })) as { props?: { borderStyle?: string; borderColor?: string } } | undefined
  expect((await card('crab'))?.props?.borderStyle).toBe('round')
  expect((await card('crab'))?.props?.borderColor).toBe('#d97757')
  expect((await card('forge'))?.props?.borderColor).toBe('#5d5a55')
  expect(await ui.find({ type: 'Text', text: '[ON DUTY]' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '[ASLEEP]' })).toBeDefined() // forge is off in the stub list
  expect(await ui.find({ type: 'Text', text: MODS[0]!.line })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '1. Switch it on here, then start a new session.' })).toBeDefined()
  expect((await ui.findAll({ type: 'Text', text: 'HOW TO USE' })).length).toBe(8)
  expect((await ui.findAll({ type: 'Text', text: 'No release notes found.' })).length).toBe(8) // the stub has no changelogs
  await ui.unmount()
})

// ---- the release notes on a card ---------------------------------------------

const CACHE = '/srv/u/.claude/plugins/cache/sovereign-critters'
const withPaths = (extra: Record<string, string> = {}) => JSON.stringify([
  ...MODS.map(m => ({ id: `${m.id}@${MARKET}`, version: '1.0.0', enabled: true, installPath: extra[m.id] ?? `${CACHE}/${m.id}/1.0.0` })),
])

test('each card shows the top entry of that mod\'s own CHANGELOG, read from its install folder with head and no shell', async ($, on) => {
  const { ran } = setup($, on, withPaths(), undefined, argv => argv[0] === 'head' ? { value: { ...PROCESS_OK, stdout: `# Changelog\n\n## 2.5.0\n\n- **${argv[3]!.split('/').at(-3)} got better.** A second sentence.\n- Another change.\n- Left out.\n\n## 2.4.0\n\n- Old.\n` } } : undefined)
  await begin($)
  await run($, '') // opening the control room reads the notes
  const heads = ran.filter(a => a[0] === 'head')
  expect(heads).toHaveLength(8)
  expect(heads[0]).toEqual(['head', '-c', '4000', `${CACHE}/critter-buddy/1.0.0/CHANGELOG.md`])
  const term = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 80 } } as never)
  expect(await term.find({ type: 'Text', text: 'v2.5.0' })).toBeDefined()
  expect(await term.find({ type: 'Text', text: '- crab got better. A second sentence.' })).toBeDefined()
  expect(await term.find({ type: 'Text', text: '- Left out.' })).toBeUndefined()
  await term.unmount()
  const desk = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'desktop', props: { bodyColumns: 80 } } as never)
  const svgs = (await desk.findAll({ type: 'Svg' })) as { props?: { source?: string } }[]
  expect(svgs[0]!.props!.source).toContain('critter-buddy got better. A second sentence.')
  expect(svgs[0]!.props!.source).toContain('v2.5.0')
  await desk.unmount()
})

test('a changelog that cannot be read, and a path the plugin manager gave that is not a cache folder, give "No release notes found" and never a command', async ($, on) => {
  const { ran } = setup($, on, withPaths({ forge: '/etc', crab: `${CACHE}/crab/1.0.0/../../../..` }), undefined, argv => argv[0] === 'head' ? { value: { exitCode: 1, stdout: '', stderr: 'no such file', isStdoutTruncated: false, isStderrTruncated: false } } : undefined)
  await begin($)
  await run($, '')
  expect(ran.filter(a => a[0] === 'head')).toHaveLength(6) // forge and crab were never read: their paths are not trusted
  expect(ran.some(a => a.join(' ').includes('/etc') || a.join(' ').includes('..'))).toBe(false)
  const term = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 80 } } as never)
  expect((await term.findAll({ type: 'Text', text: 'No release notes found.' })).length).toBe(8)
  await term.unmount()
})

test('refresh reads the plugin manager and the notes again', async ($, on) => {
  const { ran } = setup($, on, withPaths())
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'terminal', props: { bodyColumns: 80 } } as never)
  const before = ran.filter(a => a.includes('list')).length
  await ui.press({ key: 'refresh' })
  expect(ran.filter(a => a.includes('list')).length).toBe(before + 1)
  expect(ran.filter(a => a[0] === 'head').length).toBeGreaterThanOrEqual(8)
  await ui.unmount()
})

test('on the desktop an on card, an asleep card and a not-installed card are three different pictures, and the stamp words are in them', async ($, on) => {
  setup($, on, JSON.stringify([{ id: `crab@${MARKET}`, version: '0.2.0', enabled: true }, { id: `forge@${MARKET}`, version: '0.1.0', enabled: false }]))
  await begin($)
  const ui = await $.ui.mount({ plugin: 'mods', component: 'Pane', requestId: 'mods', surface: 'desktop', props: { bodyColumns: 80 } } as never)
  const src = async (id: string) => String(((await ui.find({ key: `mod-${id}` })) as unknown as { children?: unknown }) ? JSON.stringify(await ui.drawn()) : '')
  const all = await src('crab')
  expect(all).toContain('ON DUTY')
  expect(all).toContain('ASLEEP')
  expect(all).toContain('NOT HERE')
  await ui.unmount()
})
