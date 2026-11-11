import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Day, Entry } from '../types'

const entries = atom({ plugin: 'session-diary', key: 'entries' } as const, [] as Entry[], { shape: 'entries-1' })
const days = atom({ plugin: 'session-diary', key: 'days' } as const, [] as Day[], { shape: 'days-1' })
const PANE = 'session-diary'
const KEEP_DAYS = 14
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

// ---- the week -----------------------------------------------------------------
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** The Johannesburg calendar day of an instant, as YYYY-MM-DD. */
export const dayOf = (ms: number): string => new Date(ms + 7_200_000).toISOString().slice(0, 10)
const emptyDay = (day: string): Day => ({ day, tools: 0, failed: 0, turns: 0, ms: 0, by: {} })
const touch = (list: readonly Day[], at: number, f: (d: Day) => Day): Day[] => {
  const key = dayOf(at)
  const rest = list.filter(d => d.day !== key)
  return [...rest, f(list.find(d => d.day === key) ?? emptyDay(key))].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-KEEP_DAYS)
}
/** Count one tool call into its day. Pure. */
export const addTool = (list: readonly Day[], at: number, tool: string, ok: boolean): Day[] =>
  touch(list, at, d => ({ ...d, tools: d.tools + 1, failed: d.failed + (ok ? 0 : 1), by: { ...d.by, [tool]: (d.by[tool] ?? 0) + 1 } }))
/** Count one finished turn into its day. Pure. */
export const addTurn = (list: readonly Day[], at: number, ms: number): Day[] => touch(list, at, d => ({ ...d, turns: d.turns + 1, ms: d.ms + ms }))

/** A bar `n` of `max` long in twelfths of a cell steps, so a quiet day is a sliver and the busiest day fills the card: `▉▉▉▎`. */
export const barOf = (n: number, max: number, width = 12): string => {
  if (n <= 0 || max <= 0) return ''
  const eighths = Math.max(1, Math.round((n / max) * width * 8))
  return '█'.repeat(Math.floor(eighths / 8)) + ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'][eighths % 8]
}

/** The last seven days up to and including `now`, a line a day, then the totals and the three busiest tools. */
export const weekOf = (list: readonly Day[], now: number): string => {
  const keys = Array.from({ length: 7 }, (_, i) => dayOf(now - (6 - i) * 86_400_000))
  const rows = keys.map(k => list.find(d => d.day === k) ?? emptyDay(k))
  if (rows.every(d => d.tools === 0 && d.turns === 0)) return '# This week\n\nNothing yet.\n'
  const out = ['# This week', '']
  const peak = Math.max(...rows.map(d => d.tools))
  for (const d of rows) {
    const name = NAMES[(((Math.floor(Date.parse(`${d.day}T00:00:00Z`) / 86_400_000) + 4) % 7) + 7) % 7]
    out.push(d.tools === 0 && d.turns === 0 ? `- ${name} ${d.day.slice(5)}  quiet` : `- ${name} ${d.day.slice(5)}  ${d.tools} tool call${d.tools === 1 ? '' : 's'}${d.failed ? `, ${d.failed} failed` : ''} · ${d.turns} turn${d.turns === 1 ? '' : 's'} · ${span(d.ms)}  ${barOf(d.tools, peak)}`.trimEnd())
  }
  const sum = (f: (d: Day) => number) => rows.reduce((n, d) => n + f(d), 0)
  const by: Record<string, number> = {}
  for (const d of rows) for (const [t, n] of Object.entries(d.by)) by[t] = (by[t] ?? 0) + n
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([t, n]) => `${t} ${n}`)
  out.push('', `${sum(d => d.tools)} tool call${sum(d => d.tools) === 1 ? '' : 's'}, ${sum(d => d.failed)} failed, ${sum(d => d.turns)} turn${sum(d => d.turns) === 1 ? '' : 's'}, ${span(sum(d => d.ms))} of Claude working.`)
  if (top.length) out.push(`Busiest: ${top.join(', ')}.`)
  const best = rows.reduce((a, d) => (d.tools > a.tools ? d : a), rows[0]!)
  if (best.tools > 0 && rows.filter(d => d.tools === best.tools).length === 1) out.push(`Busiest day: ${NAMES[(((Math.floor(Date.parse(`${best.day}T00:00:00Z`) / 86_400_000) + 4) % 7) + 7) % 7]} ${best.day.slice(5)}, ${best.tools} tool call${best.tools === 1 ? '' : 's'}.`)
  return out.join('\n') + '\n'
}

// ---- the postcard ------------------------------------------------------------
/** A length of time in words a person says: under a minute, 12 min, 2 h 14 min. */
const dur = (ms: number): string => {
  const m = Math.round(ms / 60_000)
  return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** A one-screen summary of the session as markdown: how long, how many turns, the busiest hour, the tools used most. Names and times only. */
export const postcardOf = (list: readonly Entry[]): string => {
  if (!list.length) return '# Session postcard\n\nNothing yet.\n'
  const start = Math.min(...list.map(x => x.at))
  const end = Math.max(...list.map(x => (x.kind === 'tool' ? x.at + x.ms : x.at)))
  const calls = list.filter((x): x is Extract<Entry, { kind: 'tool' }> => x.kind === 'tool')
  const turns = list.filter((x): x is Extract<Entry, { kind: 'turn' }> => x.kind === 'turn')
  const failed = calls.filter(x => !x.ok).length
  const hours = new Map<string, number>() // by the Johannesburg hour of the day, in the order the hours first appeared
  for (const x of [...calls].sort((a, b) => a.at - b.at)) { const h = clock(x.at).slice(0, 2); hours.set(h, (hours.get(h) ?? 0) + 1) }
  let busy: [string, number] | undefined
  for (const [h, n] of hours) if (!busy || n > busy[1]) busy = [h, n]
  const by: Record<string, number> = {}
  for (const x of calls) by[x.tool] = (by[x.tool] ?? 0) + 1
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([t, n]) => `${t} ${n}`)
  const out = ['# Session postcard', '', `- ${dur(end - start)}, ${clock(start)} to ${clock(end)}`]
  out.push(`- ${plural(turns.length, 'turn')}, Claude working ${dur(turns.reduce((n, x) => n + x.ms, 0))}`)
  out.push(`- ${plural(calls.length, 'tool call')}, ${failed} failed`)
  if (busy) out.push(`- Busiest hour: ${busy[0]}:00 to ${String((Number(busy[0]) + 1) % 24).padStart(2, '0')}:00, ${plural(busy[1], 'tool call')}`)
  if (top.length) out.push(`- Most used: ${top.join(', ')}`)
  out.push('')
  if (end - start >= 2 * 3_600_000) out.push('A long one. Stand up.', '')
  if (list.length >= KEEP) out.push(`(The diary keeps the last ${KEEP} lines, so the start of a long session may be missing.)`, '')
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
    // The clock is asked now and awaited with the tool's answer, so reading it never delays the tool.
    const begun = Promise.resolve($.clock.now())
    begun.catch(() => undefined)
    const ran = await next(e)
    try {
      const started = await begun
      const ms = (await $.clock.now()) - started
      const ok = ran.deny === undefined && ran.isError !== true
      tools += 1
      if (!ok) errors += 1
      await Promise.all([ // two atoms that do not depend on each other
        update($, entries, (list: Entry[]): Entry[] => [...list, { kind: 'tool', at: started, tool: e.tool, ms, ok } as Entry].slice(-KEEP)),
        update($, days, (list: Day[]): Day[] => addTool(list, started, e.tool, ok)),
      ])
    } catch {
      // a diary that cannot write never holds up the tool
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    try {
      const now = await $.clock.now()
      const ms = turnStart ? now - turnStart : 0
      const [t, er] = [tools, errors]
      tools = 0; errors = 0; turnStart = 0
      await Promise.all([
        update($, entries, (list: Entry[]): Entry[] => [...list, { kind: 'turn', at: now, tools: t, errors: er, ms } as Entry].slice(-KEEP)),
        update($, days, (list: Day[]): Day[] => addTurn(list, now, ms)),
      ])
    } catch {
      // see above
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'diary', description: 'Open the session diary: every tool call, its time, and a line for each turn. /diary copy puts it on the clipboard as markdown; /diary clear empties it; /diary week sums up the last seven days (/diary week copy for markdown). /diary postcard sums up this session on one screen (/diary postcard copy for markdown).' })
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
    if (sub === 'week' || sub === 'week copy') {
      const text = weekOf(await read($, days), await $.clock.now())
      if (sub === 'week copy') { await $.ui.copy({ text }); return { text: 'Copied the week as markdown.' } }
      return { text: text.replace(/^# /, '') }
    }
    if (sub === 'postcard' || sub === 'postcard copy') {
      const text = postcardOf(await read($, entries))
      if (sub === 'postcard copy') { await $.ui.copy({ text }); return { text: 'Copied the postcard as markdown.' } }
      return { text: text.replace(/^# /, '') }
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
        <Box flexDirection="row" columnGap={1}>
          <Button key="copy" label="copy as markdown" hotkey="c" onPress={async () => { await $.ui.copy({ text: markdownOf(await read($, entries)) }) }} />
          <Button key="postcard" label="postcard" hotkey="p" onPress={async () => { await $.ui.copy({ text: postcardOf(await read($, entries)) }) }} />
          <Button key="clear" label="clear" hotkey="x" onPress={() => update($, entries, () => [] as Entry[])} />
          <Button key="close" label="close" hotkey="q" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
