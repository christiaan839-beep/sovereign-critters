import type { Register } from 'claude-code'

import { DIALS, HUB, MODS, SYMBOL, actionFor, cellsOf, fit, installArgv, listLine, parseList, restartNeeded, stateOf, statusWord, toggleArgv } from './catalog'
import type { Installed, Mod } from './catalog'

const PANE = 'mods'
const CANNOT = 'The control room cannot reach the plugin manager from this session: run `claude plugin` in a terminal instead.'
const USAGE = 'Usage: /mods [list | on <mod> | off <mod> | install <mod|all> | open <mod> [label]]. /mods alone opens the control room.'

// What the plugin manager last said, and which mods this session loaded. Module variables start over on a reload;
// session.start reads them again, and the plugin manager is the truth whenever it is asked.
const S: { list: Installed[] | undefined; loaded: Set<string> } = { list: undefined, loaded: new Set() }
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
const refresh = async ($: any) => {
  S.list = await readList($)
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
    if (r.exitCode !== 0) return `The plugin manager would not switch ${mod.id} ${want}: ${fit(String(r.stderr || r.stdout || 'no reason given').trim().split('\n')[0] ?? '', 90)}`
  } catch {
    return CANNOT
  }
  await refresh($)
  return want === 'off' ? `${mod.id} is off. Restart Claude Code to apply.` : S.loaded.has(mod.id) ? `${mod.id} is on.` : `${mod.id} is on. Restart Claude Code to load it.`
}

const installMod = async ($: any, mod: Mod): Promise<string> => {
  if (stateNow(mod).state !== 'missing') return `${mod.id} is already installed.`
  try {
    const r = await $.process.run(installArgv(mod), { timeoutMs: 120_000 })
    if (r.exitCode !== 0) return `The plugin manager would not install ${mod.id}: ${fit(String(r.stderr || r.stdout || 'no reason given').trim().split('\n')[0] ?? '', 90)}`
  } catch {
    return CANNOT
  }
  await refresh($)
  return `${mod.id} is installed. Restart Claude Code to load it.`
}

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
    try {
      S.list = await readList($)
      S.loaded = new Set((S.list ?? []).filter(x => x.enabled).map(x => x.id.split('@')[0]!))
    } catch {
      S.list = undefined
    }
    try {
      await $.command.register({ name: HUB, description: 'The control room: /mods opens one pane for every mod, with a switch for each. /mods list, on <mod>, off <mod>, install <mod|all>, open <mod> [label].' })
    } catch {
      $.ui.log('mods: /mods is taken by another plugin')
    }
    return next(e)
  })

  on('command.run', { command: HUB }, async ($, e) => {
    try {
      const words = String(e.args ?? '').trim().split(/\s+/).filter(Boolean)
      const sub = words[0] ?? ''
      if (sub === '') {
        await refresh($)
        const opened = await $.ui.open({ id: PANE, title: 'Mods', focus: true, closeOnEscape: true, columns: 56, rows: 44 })
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
          for (const m of missing) if ((await installMod($, m)).endsWith('is installed. Restart Claude Code to load it.')) done.push(m.id)
          return say(done.length ? `Installed ${done.length}: ${done.join(', ')}. Restart Claude Code to load them.` : missing.length ? CANNOT : 'Every mod is already installed.')
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
    const { Box, Text, Button } = $.ui.resolve(e)
    const cols = Math.max(24, Number(e.props.bodyColumns) || 56)
    const act = (f: () => Promise<string>) => async () => {
      last = await f()
      redraw($)
    }
    return (
      <Box flexDirection="column">
        <Box key="head" flexDirection="row" justifyContent="space-between">
          <Text bold>{S.list ? `Mods · ${onCount()} of ${MODS.length} on` : 'Mods'}</Text>
          <Button key="close" label="close" hotkey="q" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
        {S.list ? null : <Text color="#d4a548">{fit(CANNOT, cols)}</Text>}
        <Box key="gap-head"><Text> </Text></Box>
        {MODS.map(m => {
          const s = stateNow(m)
          const need = S.list ? restartNeeded(s.state, S.loaded.has(m.id)) : false
          const label = s.state === 'missing' ? 'install' : s.state === 'on' ? 'off' : 'on'
          const title = fit(`${SYMBOL[s.state]} ${m.id} ${s.version} ${statusWord(s.state, need)}`.replace(/ {2,}/g, ' '), Math.max(12, cols - 11))
          return (
            <Box key={`mod-${m.id}`} flexDirection="column">
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold={s.state === 'on'} dimColor={s.state !== 'on'}>{title}</Text>
                {S.list ? <Button key={`switch-${m.id}`} label={label} onPress={act(() => (s.state === 'missing' ? installMod($, m) : setMod($, m, s.state === 'on' ? 'off' : 'on')))} /> : null}
              </Box>
              <Text dimColor>{fit(m.line, cols)}</Text>
              {m.opens.length > 0 && s.state === 'on' ? (
                <Box flexDirection="row" columnGap={1}>
                  <Text dimColor>open</Text>
                  {m.opens.map(o => <Button key={`open-${m.id}-${o.label}`} label={o.label} onPress={act(() => openMod($, m, o.label, 'run'))} />)}
                </Box>
              ) : null}
              <Box key={`gap-${m.id}`}><Text> </Text></Box>
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
