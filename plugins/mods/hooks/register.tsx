import type { Register } from 'claude-code'

import { cardSvg, dividerSvg } from './card-svg'
import { DEFAULT_STEPS, DIALS, HUB, MODS, STEPS, SYMBOL, actionFor, cellsOf, fit, installArgv, listLine, parseList, parseTopEntry, restartNeeded, stateOf, statusWord, titleOf, toggleArgv, wrap , STAMP_WORD, orderMods, tierOf} from './catalog'
import type { Installed, Mod, Notes } from './catalog'

const PANE = 'mods'
const CANNOT = 'The control room cannot reach the plugin manager from this session: run `claude plugin` in a terminal instead.'
const USAGE = 'Usage: /mods [list | on <mod> | off <mod> | install <mod|all> | open <mod> [label]]. /mods alone opens the control room.'

// What the plugin manager last said, and which mods this session loaded. Module variables start over on a reload;
// session.start reads them again, and the plugin manager is the truth whenever it is asked.
const S: { list: Installed[] | undefined; loaded: Set<string>; notes: Record<string, Notes | undefined> } = { list: undefined, loaded: new Set(), notes: {} }
let last = '' // the last thing the control room did, shown at the foot of the pane

const redraw = ($: any) => {
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // a pane that cannot redraw waits for the next press
  }
}
const readList = async ($: any): Promise<Installed[] | undefined> => {
  try {
    const r = await $.process.run(['claude', 'plugin', 'list', '--json'], { timeoutMs: 20_000 })
    return r.exitCode === 0 ? parseList(String(r.stdout)) : undefined
  } catch {
    return undefined // no plugin manager here (a cloud session, a sandbox): the control room says so and carries on
  }
}
/** The newest entry of a mod's own CHANGELOG, read from its install folder with `head` (no shell), or nothing. */
const readNotes = async ($: any, path: string): Promise<Notes | undefined> => {
  try {
    const r = await $.process.run(['head', '-c', '4000', `${path}/CHANGELOG.md`], { timeoutMs: 5000 })
    return r.exitCode === 0 ? parseTopEntry(String(r.stdout)) : undefined
  } catch {
    return undefined
  }
}
const refresh = async ($: any) => {
  S.list = await readList($)
  const found = await Promise.all(MODS.map(async m => [m.id, S.list?.find(x => x.id === `${m.id}@sovereign-critters`)?.installPath] as const))
  const notes = await Promise.all(found.map(async ([id, path]) => [id, path ? await readNotes($, path) : undefined] as const))
  S.notes = Object.fromEntries(notes)
  redraw($)
}
const stateNow = (mod: Mod) => stateOf(mod, S.list ?? [])
const onCount = () => MODS.filter(m => stateNow(m).state === 'on').length
const lines = () => [
  `Mods: ${onCount()} of ${MODS.length} on.`,
  ...MODS.map(m => listLine(m, stateNow(m), S.loaded, 100)),
  '/mods off <name> · /mods on <name> · /mods open <name> · /mods install all',
]

/** Flip a mod through the plugin manager. The command line comes from the catalogue, never from what was typed. */
const setMod = async ($: any, mod: Mod, want: 'on' | 'off'): Promise<string> => {
  if (!S.list) await refresh($)
  if (!S.list) return CANNOT
  const now = stateNow(mod)
  if (now.state === 'missing') return `${mod.id} is not installed. /mods install ${mod.id} adds it.`
  if (now.state === want) return `${mod.id} is already ${want}.`
  const argv = toggleArgv(mod, now.state)
  if (!argv) return CANNOT
  try {
    const r = await $.process.run(argv, { timeoutMs: 30_000 })
    if (r.exitCode !== 0) {
      await refresh($) // a switch that timed out may have happened all the same: the pane shows what is true
      return `The plugin manager would not switch ${mod.id} ${want}: ${fit(String(r.stderr || r.stdout || 'no reason given').trim().split('\n')[0] ?? '', 90)}`
    }
  } catch {
    await refresh($)
    return CANNOT
  }
  await refresh($)
  return want === 'off' ? `${mod.id} is off. Restart Claude Code to apply.` : S.loaded.has(mod.id) ? `${mod.id} is on.` : `${mod.id} is on. Restart Claude Code to load it.`
}

type Installing = { ok: boolean; text: string; why: string }
const installOne = async ($: any, mod: Mod): Promise<Installing> => {
  if (stateNow(mod).state !== 'missing') return { ok: false, text: `${mod.id} is already installed.`, why: 'already installed' }
  try {
    const r = await $.process.run(installArgv(mod), { timeoutMs: 120_000 })
    if (r.exitCode !== 0) {
      await refresh($)
      const why = fit(String(r.stderr || r.stdout || 'no reason given').trim().split('\n')[0] ?? '', 90)
      return { ok: false, text: `The plugin manager would not install ${mod.id}: ${why}`, why }
    }
  } catch {
    await refresh($)
    return { ok: false, text: CANNOT, why: 'the plugin manager could not be reached' }
  }
  await refresh($)
  return { ok: true, text: `${mod.id} is installed. Restart Claude Code to load it.`, why: '' }
}
const installMod = async ($: any, mod: Mod): Promise<string> => (await installOne($, mod)).text

/**
 * Open one of a mod's panes by its own slash command. A button press runs the command; a typed `/mods open` cannot (the engine
 * will not run a command from inside a command), so it puts the command in the prompt box for the person to send.
 */
const openMod = async ($: any, mod: Mod, label: string | undefined, how: 'run' | 'fill'): Promise<string> => {
  if (mod.opens.length === 0) return `${mod.id} has nothing to open: it works quietly.`
  const o = label ? mod.opens.find(x => x.label === label) : mod.opens[0]
  if (!o) return `${mod.id} has no such thing to open. Try: ${mod.opens.map(x => x.label).join(', ')}.`
  if (S.list && stateNow(mod).state !== 'on') return `${mod.id} is not on, so it has nothing to open yet.`
  const text = `/${o.command}${o.args ? ` ${o.args}` : ''}`
  if (how === 'run') {
    try {
      const r = await $.command.run({ command: o.command, args: o.args })
      return String(r?.text ?? `Opened ${mod.id} ${o.label}.`)
    } catch {
      // fall through to the box
    }
  }
  try {
    const r = await $.prompt.fill({ text })
    return r?.isFilled === false ? `Type ${text} to open ${mod.id} ${o.label}.` : `${text} is in the box: press Enter to open ${mod.id} ${o.label}.`
  } catch {
    return `Type ${text} to open ${mod.id} ${o.label}.`
  }
}

/** One of the lead mod's own dials, run as the press of a button. */
const runDial = async ($: any, args: string): Promise<string> => {
  try {
    const r = await $.command.run({ command: 'critter', args })
    return String(r?.text ?? `critter ${args}`).replace(/^critter-buddy: /, '')
  } catch {
    try {
      await $.prompt.fill({ text: `/critter ${args}` })
      return `/critter ${args} is in the box: press Enter.`
    } catch {
      return `Type /critter ${args}.`
    }
  }
}

const say = (s: string) => {
  last = s
  return { text: s }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The plugin manager can take seconds to answer: the session starts without waiting, and the list is filled in when it arrives.
    // What this session loaded is what was on when it began, so only the first answer says it.
    S.loaded = new Set()
    const began: Promise<void> = Promise.resolve(readList($)).then(list => {
      if (!list) return
      S.list = S.list ?? list
      S.loaded = new Set(list.filter(x => x.enabled).map(x => x.id.split('@')[0]!))
      redraw($)
    }).catch(() => undefined)
    void began
    try {
      await $.command.register({ name: HUB, description: 'The control room: /mods opens one pane for every mod, with a switch for each. /mods list, on <mod>, off <mod>, install <mod|all>, open <mod> [label].' })
    } catch {
      $.ui.log('mods: /mods is taken by another plugin')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: HUB }, async ($, e) => {
    try {
      const words = String(e.args ?? '').trim().split(/\s+/).filter(Boolean)
      const sub = words[0] ?? ''
      if (sub === '') {
        await refresh($)
        const opened = await $.ui.open({ id: PANE, title: 'Mods', focus: true, closeOnEscape: true, columns: 80, rows: 80 })
        return say(opened?.isPlaced === false ? `The control room could not open a pane here, so here is the list.\n${lines().join('\n')}` : `The control room is open: ${onCount()} of ${MODS.length} mods on.`)
      }
      if (sub === 'list' && words.length === 1) {
        await refresh($)
        return say(S.list ? lines().join('\n') : CANNOT)
      }
      if ((sub === 'on' || sub === 'off') && words.length === 2) {
        if (words[1]!.toLowerCase() === HUB) return say('The control room cannot switch itself off: use `claude plugin disable` for that.')
        const mod = actionFor(words[1]!)
        return say(mod ? await setMod($, mod, sub) : `No mod is called "${fit(words[1]!, 24)}". ${USAGE}`)
      }
      if (sub === 'install' && words.length === 2) {
        if (!S.list) await refresh($)
        if (!S.list) return say(CANNOT)
        if (words[1]!.toLowerCase() === 'all') {
          const missing = MODS.filter(m => stateNow(m).state === 'missing')
          const done: string[] = []
          const failed: string[] = []
          for (const m of missing) {
            const r = await installOne($, m)
            if (r.ok) done.push(m.id)
            else failed.push(r.why.startsWith('the plugin manager could not') ? m.id : `${m.id} (${r.why})`)
          }
          if (!missing.length) return say('Every mod is already installed.')
          const lost = failed.length ? `Could not install ${failed.length}: ${failed.join(', ')}.` : ''
          return say(done.length ? `Installed ${done.length}: ${done.join(', ')}. ${lost} Restart Claude Code to load them.`.replace(/\. {2}/, '. ') : failed.length === missing.length && failed.every(f => !f.includes('(')) ? CANNOT : lost)
        }
        const mod = actionFor(words[1]!)
        return say(mod ? await installMod($, mod) : `No mod is called "${fit(words[1]!, 24)}". ${USAGE}`)
      }
      if (sub === 'open' && (words.length === 2 || words.length === 3)) {
        const mod = actionFor(words[1]!)
        return say(mod ? await openMod($, mod, words[2], 'fill') : `No mod is called "${fit(words[1]!, 24)}". ${USAGE}`)
      }
      return say(USAGE)
    } catch {
      return say('The control room dropped something. Try again.')
    }
  })

  // The footer's one small chip: how many mods are on. Silent where the plugin manager could not be read.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    try {
      const modes: string[] = Array.isArray(e.props.modes) ? e.props.modes : []
      if (!S.list || modes.some(m => /^mods \d+\/\d+$/.test(m))) return next(e)
      return next({ ...e, props: { ...e.props, modes: [...modes, `mods ${onCount()}/${MODS.length}`] } })
    } catch {
      return next(e)
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    const cols = Math.max(24, Number(e.props.bodyColumns) || 56)
    const act = (f: () => Promise<string>) => async () => {
      last = await f()
      redraw($)
    }
    const vector = e.surface !== 'terminal' && Svg !== undefined
    // The lead mod first, then the four states in order, each with a ruled divider and its mods alphabetical.
    const states: Record<string, State> = Object.fromEntries(MODS.map(m => [m.id, stateNow(m).state]))
    const { hero, groups } = orderMods(states)
    type Item = { kind: 'mod'; m: Mod; tier: Tier } | { kind: 'divider'; tier: Tier; count: number }
    const items: Item[] = [
      { kind: 'mod', m: hero, tier: tierOf(hero, states[hero.id] ?? 'missing') },
      ...groups.flatMap((g): Item[] => [{ kind: 'divider', tier: g.tier, count: g.mods.length }, ...g.mods.map((m): Item => ({ kind: 'mod', m, tier: g.tier }))]),
    ]
    return (
      <Box flexDirection="column">
        <Box key="head" flexDirection="row" justifyContent="space-between">
          <Text bold>{S.list ? `Your mods · ${onCount()} of ${MODS.length} on` : 'Your mods'}</Text>
          <Box flexDirection="row" columnGap={1}>
            <Button key="refresh" label="refresh" hotkey="r" onPress={act(async () => { await refresh($); return 'Refreshed.' })} />
            <Button key="close" label="close" hotkey="q" onPress={() => $.ui.close({ id: PANE })} />
          </Box>
        </Box>
        {S.list ? null : <Text color="#d4a548">{fit(CANNOT, cols)}</Text>}
        <Box key="gap-head"><Text> </Text></Box>
        {items.map(it => {
          if (it.kind === 'divider') {
            if (vector) { const d = dividerSvg(it.tier, it.count); return <Svg key={`tier-${it.tier}`} source={d.source} width={d.width} height={d.height} alt={d.alt} /> }
            return <Text key={`tier-${it.tier}`} dimColor>{`── ${STAMP_WORD[it.tier]} · ${it.count} ──`}</Text>
          }
          const m = it.m
          const s = stateNow(m)
          const need = S.list ? restartNeeded(s.state, S.loaded.has(m.id)) : false
          const toggle = s.state === 'missing' ? 'install' : s.state === 'on' ? '━● on' : '●━ off'
          const steps = STEPS[m.id] ?? DEFAULT_STEPS
          const notes = S.notes[m.id]
          const controls = (
            <Box key={`controls-${m.id}`} flexDirection="row" columnGap={1}>
              {S.list ? <Button key={`switch-${m.id}`} label={toggle} onPress={act(() => (s.state === 'missing' ? installMod($, m) : setMod($, m, s.state === 'on' ? 'off' : 'on')))} /> : null}
              {m.opens.length > 0 && s.state === 'on' ? <Text dimColor>open</Text> : null}
              {m.opens.length > 0 && s.state === 'on' ? m.opens.map(o => <Button key={`open-${m.id}-${o.label}`} label={o.label} onPress={act(() => openMod($, m, o.label, 'run'))} />) : null}
            </Box>
          )
          if (vector) {
            // the card is one picture; the buttons that act on it sit directly beneath
            const c = cardSvg({ id: m.id, title: titleOf(m.id), version: s.version, line: m.line, steps, notes, restart: need, tier: it.tier })
            return (
              <Box key={`mod-${m.id}`} flexDirection="column">
                <Svg source={c.source} width={c.width} height={c.height} alt={c.alt} />
                {controls}
                <Box key={`gap-${m.id}`}><Text> </Text></Box>
              </Box>
            )
          }
          const inner = Math.max(12, cols - 4) // the card's border and padding take four cells
          const stamp = STAMP_WORD[it.tier]
          const title = fit(`${titleOf(m.id)} ${s.version ? `v${s.version}` : ''}`.trim(), Math.max(8, inner - 12))
          return (
            <Box key={`mod-${m.id}`} flexDirection="column" borderStyle="round" borderColor={s.state === 'on' ? '#d97757' : '#5d5a55'} paddingX={1}>
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold={s.state === 'on'} dimColor={s.state !== 'on'}>{`${SYMBOL[s.state]} ${title}`}</Text>
                <Text bold>{`[${stamp}]`}</Text>
              </Box>
              {wrap(m.line, inner).map((l, i) => <Text key={`l${i}`} dimColor>{l}</Text>)}
              <Text dimColor>HOW TO USE</Text>
              {steps.flatMap((st, i) => wrap(st, inner - 3).map((l, j) => <Text key={`s${i}-${j}`}>{`${j === 0 ? `${i + 1}. ` : '   '}${l}`}</Text>))}
              <Text dimColor>WHAT'S NEW</Text>
              {notes ? <Text>{fit(`v${notes.heading}`, inner)}</Text> : <Text dimColor>No release notes found.</Text>}
              {(notes?.bullets ?? []).map((b, i) => <Text key={`n${i}`}>{fit(`- ${b}`, inner)}</Text>)}
              {need ? <Text color="#d4a548">{fit(statusWord(s.state, true), inner)}</Text> : null}
              {controls}
            </Box>
          )
        })}
        {S.list && stateNow(MODS[0]!).state === 'on' ? (
          <Box key="dials" flexDirection="column">
            <Text bold>Look and feel</Text>
            {DIALS.map(d => (
              <Box key={`dial-row-${d.id}`} flexDirection="row" columnGap={1}>
                <Text dimColor>{d.label.padEnd(6)}</Text>
                {d.options.map(o => <Button key={`dial-${d.id}-${o.label}`} label={o.label} onPress={act(() => runDial($, o.args))} />)}
              </Box>
            ))}
            <Box key="gap-dials"><Text> </Text></Box>
          </Box>
        ) : null}
        {last ? <Text>{fit(last, cols)}</Text> : <Text dimColor>{fit('on or off takes a restart. open runs the mod\'s own command.', cols)}</Text>}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}

export { cellsOf }
