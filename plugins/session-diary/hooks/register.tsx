import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Entry } from '../types'

const entries = atom({ plugin: 'session-diary', key: 'entries' } as const, [] as Entry[], { shape: 'entries-1' })
const PANE = 'session-diary'
const KEEP = 300 // the diary keeps the last 300 lines of the session

// Africa/Johannesburg is UTC+2, no daylight saving.
const clock = (ms: number) => {
  const m = Math.floor(ms / 60_000) + 120
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const span = (ms: number) => (ms < 950 ? `${Math.max(1, Math.round(ms / 10) * 10)} ms` : ms < 60_000 ? `${(Math.round(ms / 100) / 10).toFixed(1)} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`)

/** One line of the pane. Pure, so the pane, the markdown and the tests all say the same thing. */
export const lineOf = (x: Entry): string =>
  x.kind === 'tool'
    ? `${clock(x.at)}  ${x.ok ? '✓' : '✗'} ${x.tool} · ${span(x.ms)}`
    : `${clock(x.at)}  turn · ${x.tools} tool${x.tools === 1 ? '' : 's'}${x.errors ? `, ${x.errors} failed` : ''} · ${span(x.ms)}`

/** The whole diary as markdown, newest last, tool lines nested under the turn they belong to. */
export const markdownOf = (list: readonly Entry[]): string => {
  if (!list.length) return '# Session diary\n\nNothing yet.\n'
  const out = ['# Session diary', '']
  let open = false
  for (const x of list) {
    if (x.kind === 'tool') { out.push(`- ${lineOf(x)}`); open = true; continue }
    out.push(open ? '' : '', `**${lineOf(x)}**`, '')
    open = false
  }
  const calls = list.filter(x => x.kind === 'tool')
  const failed = calls.filter(x => x.kind === 'tool' && !x.ok).length
  out.push('', `${calls.length} tool call${calls.length === 1 ? '' : 's'}, ${failed} failed.`, '')
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

export const register: Register = on => {
  let turnStart = 0
  let tools = 0
  let errors = 0

  on('prompt.submit', async ($, e, next) => {
    try { turnStart = await $.clock.now(); tools = 0; errors = 0 } catch { /* the diary never holds up a prompt */ }
    return next(e)
  })

  // Every tool, timed. The call's input is never read: the diary holds names and times, not what was run.
  on('tool.call', async ($, e, next) => {
    const started = await $.clock.now()
    const ran = await next(e)
    try {
      const ms = (await $.clock.now()) - started
      const ok = ran.deny === undefined && ran.isError !== true
      tools += 1
      if (!ok) errors += 1
      await update($, entries, (list: Entry[]): Entry[] => [...list, { kind: 'tool', at: started, tool: e.tool, ms, ok } as Entry].slice(-KEEP))
    } catch {
      // a diary that cannot write never holds up the tool
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    try {
      const now = await $.clock.now()
      const ms = turnStart ? now - turnStart : 0
      await update($, entries, (list: Entry[]): Entry[] => [...list, { kind: 'turn', at: now, tools, errors, ms } as Entry].slice(-KEEP))
      tools = 0; errors = 0; turnStart = 0
    } catch {
      // see above
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'diary', description: 'Open the session diary: every tool call, its time, and a line for each turn. /diary copy puts it on the clipboard as markdown; /diary clear empties it.' })
    } catch {
      $.ui.log('session-diary: /diary is taken by another plugin')
    }
    return next(e)
  })

  on('command.run', { command: 'diary' }, async ($, e) => {
    const sub = e.args.trim()
    if (sub === 'clear') {
      await update($, entries, () => [] as Entry[])
      return { text: 'The diary is empty.' }
    }
    if (sub === 'copy') {
      const text = markdownOf(await read($, entries))
      await $.ui.copy({ text })
      return { text: 'Copied the diary as markdown.' }
    }
    await $.ui.open({ id: PANE, title: 'Session diary', focus: true })
    return { text: 'Session diary opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, entries)
    const { Box, Text, Button } = $.ui.resolve(e)
    const calls = list.filter(x => x.kind === 'tool')
    const failed = calls.filter(x => x.kind === 'tool' && !x.ok).length
    const shown = list.slice(-40)
    return (
      <Box flexDirection="column">
        <Text bold>{'Session diary'}</Text>
        <Text dimColor>{`${calls.length} tool call${calls.length === 1 ? '' : 's'} · ${failed} failed · ${list.filter(x => x.kind === 'turn').length} turns`}</Text>
        {shown.length === 0 && <Text dimColor>{'Nothing yet. It fills as Claude works.'}</Text>}
        {shown.map((x, i) => (
          <Text key={`d${i}`} bold={x.kind === 'turn'} color={x.kind === 'tool' && !x.ok ? 'red' : undefined} dimColor={x.kind === 'tool' && x.ok}>
            {lineOf(x)}
          </Text>
        ))}
        <Box flexDirection="row">
          <Button key="copy" label="copy as markdown" hotkey="c" onPress={async () => { await $.ui.copy({ text: markdownOf(await read($, entries)) }) }} />
          <Text> </Text>
          <Button key="clear" label="clear" hotkey="x" onPress={() => update($, entries, () => [] as Entry[])} />
          <Text> </Text>
          <Button key="close" label="close" hotkey="q" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
