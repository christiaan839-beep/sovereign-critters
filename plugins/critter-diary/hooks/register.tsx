import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Day, Entry } from '../types'

const entries = atom({ plugin: 'critter-diary', key: 'entries' } as const, [] as Entry[], { shape: 'entries-1' })
const PANE = 'critter-diary'
const KEEP_DAYS = 14
const KEEP = 300 // the diary keeps the last 300 lines of the session

// Africa/Johannesburg is UTC+2, no daylight saving.
const clock = (ms: number) => {
  const m = Math.floor(ms / 60_000) + 120
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
/** A time in the unit it reached: under 10 ms says so, and a rounding never turns 59.96 s into "60.0 s" or 1 min 59.7 s into "1 min 60 s". */
const span = (ms: number): string => {
  if (ms < 10) return 'under 10 ms'
  if (ms < 950) return `${Math.round(ms / 10) * 10} ms`
  if (ms < 59_950) return `${(Math.round(ms / 100) / 10).toFixed(1)} s`
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)} min ${total % 60} s`
}
/** A name from outside (an MCP server picks its tools' names) said in markdown: no emphasis, link, heading or line of its own. */
const mdName = (name: string): string => name.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ').replace(/[\\`*_{}[\]()<>#+!|~&:.@$]/g, '\\$&')

/** One line of the pane. Pure, so the pane, the markdown and the tests all say the same thing. */
export const lineOf = (x: Entry, md = false): string =>
  x.kind === 'tool'
    ? `${clock(x.at)}  ${x.ok ? '✓' : '✗'} ${md ? mdName(x.tool) : x.tool} · ${span(x.ms)}`
    : `${clock(x.at)}  turn · ${x.tools} tool${x.tools === 1 ? '' : 's'}${x.errors ? `, ${x.errors} failed` : ''} · ${span(x.ms)}`

/** The whole diary as markdown, newest last, tool lines nested under the turn they belong to. */
export const markdownOf = (list: readonly Entry[]): string => {
  if (!list.length) return '# Session diary\n\nNothing yet.\n'
  const out = ['# Session diary', '']
  let open = false
  for (const x of list) {
    if (x.kind === 'tool') { out.push(`- ${lineOf(x, true)}`); open = true; continue }
    out.push(open ? '' : '', `**${lineOf(x, true)}**`, '')
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
/** The week as the store holds it, read with suspicion: a bad entry is dropped, a bad store is an empty week, fourteen days at most. */
export const cleanDays = (raw: unknown): Day[] => {
  if (!Array.isArray(raw)) return []
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  const out: Day[] = []
  for (const d of raw as Record<string, unknown>[]) {
    if (!d || typeof d !== 'object' || typeof d.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.day)) continue
    if (!num(d.tools) || !num(d.failed) || !num(d.turns) || !num(d.ms) || !d.by || typeof d.by !== 'object' || Array.isArray(d.by)) continue
    const by: Record<string, number> = {}
    for (const [k, v] of Object.entries(d.by as Record<string, unknown>).slice(0, 200)) if (num(v)) by[k.slice(0, 80)] = v
    out.push({ day: d.day, tools: d.tools, failed: d.failed, turns: d.turns, ms: d.ms, by })
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-KEEP_DAYS)
}
const emptyDay = (day: string): Day => ({ day, tools: 0, failed: 0, turns: 0, ms: 0, by: {} })
const touch = (list: readonly Day[], at: number, f: (d: Day) => Day): Day[] => {
  const key = dayOf(at)
  const rest = list.filter(d => d.day !== key)
  return [...rest, f(list.find(d => d.day === key) ?? emptyDay(key))].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-KEEP_DAYS)
}
/** Count one tool call into its day. Pure. */
export const addTool = (list: readonly Day[], at: number, tool: string, ok: boolean): Day[] =>
  touch(list, at, d => ({ ...d, tools: d.tools + 1, failed: d.failed + (ok ? 0 : 1), by: { ...d.by, [tool]: (Object.hasOwn(d.by, tool) ? d.by[tool]! : 0) + 1 } }))
/** Count one finished turn into its day. Pure. */
export const addTurn = (list: readonly Day[], at: number, ms: number): Day[] => touch(list, at, d => ({ ...d, turns: d.turns + 1, ms: d.ms + ms }))

/** A bar `n` of `max` long in twelfths of a cell steps, so a quiet day is a sliver and the busiest day fills the card: `▉▉▉▎`. */
export const barOf = (n: number, max: number, width = 12): string => {
  if (n <= 0 || max <= 0) return ''
  const eighths = Math.max(1, Math.round((n / max) * width * 8))
  return '█'.repeat(Math.floor(eighths / 8)) + ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'][eighths % 8]
}

/** The last seven days up to and including `now`, a line a day, then the totals and the three busiest tools. */
export const weekOf = (list: readonly Day[], now: number, md = false): string => {
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
  const by: Record<string, number> = Object.create(null) // no prototype, so a tool named __proto__ is a key like the rest
  for (const d of rows) for (const [t, n] of Object.entries(d.by)) by[t] = (Object.hasOwn(by, t) ? by[t]! : 0) + n
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([t, n]) => `${md ? mdName(t) : t} ${n}`)
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
export const postcardOf = (list: readonly Entry[], md = false): string => {
  if (!list.length) return '# Session postcard\n\nNothing yet.\n'
  const start = Math.min(...list.map(x => x.at))
  const end = Math.max(...list.map(x => (x.kind === 'tool' ? x.at + x.ms : x.at)))
  const calls = list.filter((x): x is Extract<Entry, { kind: 'tool' }> => x.kind === 'tool')
  const turns = list.filter((x): x is Extract<Entry, { kind: 'turn' }> => x.kind === 'turn')
  const failed = calls.filter(x => !x.ok).length
  const hours = new Map<string, number>() // by the Johannesburg hour of the day, in the order the hours first appeared
  for (const x of [...calls].sort((a, b) => a.at - b.at)) { const hour = clock(x.at).slice(0, 2); hours.set(hour, (hours.get(hour) ?? 0) + 1) }
  let busy: [string, number] | undefined
  for (const [hour, n] of hours) if (!busy || n > busy[1]) busy = [hour, n]
  const by: Record<string, number> = Object.create(null) // no prototype, so a tool named __proto__ is a key like the rest
  for (const x of calls) by[x.tool] = (Object.hasOwn(by, x.tool) ? by[x.tool]! : 0) + 1
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([t, n]) => `${md ? mdName(t) : t} ${n}`)
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

// The week lives in $.store (one key, `days`), not in the session's state, so it survives a restart. Writes are
// queued one behind another because the store has no compare-and-set: two tools finishing together must both count.
const DAYS = 'days'
let queue: Promise<unknown> = Promise.resolve()
/** A store step that gives up after five seconds, so one that never answers cannot stop the queue for good. */
const STORE_GIVES_UP_MS = 5000
const patient = <T,>(api: any, step: Promise<T> | T): Promise<T> => {
  let timer: { cancel?: () => void } | undefined
  const late = new Promise<never>((_, no) => {
    try { timer = api.clock.after(STORE_GIVES_UP_MS, () => no(new Error('the store did not answer'))) } catch { /* no timer here: the step is simply not timed */ }
  })
  return Promise.race([Promise.resolve(step), late]).then(v => { timer?.cancel?.(); return v }, e => { timer?.cancel?.(); throw e }) // a step that answered leaves no timer behind
}
const bump = (api: any, f: (list: Day[]) => Day[]): void => {
  queue = queue.then(async () => { await patient(api, api.store.set(DAYS, f(cleanDays(await patient(api, api.store.get(DAYS)))))) }).catch(() => undefined)
}
// The session's lines are written the same way: started and left, so a tool never waits on them either.
let writing: Promise<unknown> = Promise.resolve()
const leave = (step: Promise<unknown>): void => { writing = Promise.all([writing, step.catch(() => undefined)]) }
/** Resolves when every write to the week and to the session's lines so far has settled. A tool never waits on it: a store that hangs must not hold up a result. */
export const idle = (): Promise<unknown> => Promise.all([queue, writing])
const week = async (api: any): Promise<Day[]> => cleanDays(await Promise.resolve(api.store.get(DAYS)).catch(() => undefined))

export const register: Register = on => {
  let turnStart = 0
  let tools = 0
  let errors = 0

  on('prompt.submit', async ($, e, next) => {
    try { turnStart = await $.clock.now(); tools = 0; errors = 0 } catch { /* the diary never holds up a prompt */ }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Every tool, timed. The call's input is never read: the diary holds names and times, not what was run.
  on('tool.call', async ($, e, next) => {
    // The clock is asked now and awaited with the tool's answer, so reading it never delays the tool.
    const begun = Promise.resolve($.clock.now())
    begun.catch(() => undefined)
    const ran = await next(e)
    try {
      const started = await begun
      const ms = Math.max(0, (await $.clock.now()) - started)
      const ok = ran.deny === undefined && ran.isError !== true
      tools += 1
      if (!ok) errors += 1
      const name = String(e.tool).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ').slice(0, 80)
      bump($, list => addTool(list, started, name, ok)) // queued and left: the tool's result does not wait on the store
      leave(update($, entries, (list: Entry[]): Entry[] => [...list, { kind: 'tool', at: started, tool: name, ms, ok } as Entry].slice(-KEEP))) // started and left, like the week's write: a state that hangs must not hold up the result
    } catch {
      // a diary that cannot write never holds up the tool
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e) // a subagent's answer is its own turn.complete: it is not the end of the person's turn
    try {
      const now = await $.clock.now()
      const ms = turnStart ? Math.max(0, now - turnStart) : 0
      const [t, er] = [tools, errors]
      tools = 0; errors = 0; turnStart = 0
      bump($, list => addTurn(list, now, ms))
      leave(update($, entries, (list: Entry[]): Entry[] => [...list, { kind: 'turn', at: now, tools: t, errors: er, ms } as Entry].slice(-KEEP)))
    } catch {
      // see above
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'diary', description: 'Open the session diary: every tool call, its time, and a line for each turn. /diary copy puts it on the clipboard as markdown; /diary clear empties it; /diary week sums up the last seven days (/diary week copy for markdown). /diary postcard sums up this session on one screen (/diary postcard copy for markdown).' })
    } catch {
      $.ui.log('critter-diary: /diary is taken by another plugin')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'diary' }, async ($, e) => {
    const sub = e.args.trim()
    if (sub === 'clear') {
      await patient($, writing).catch(() => undefined) // a line still on its way would otherwise land after the clear
      await update($, entries, () => [] as Entry[])
      let cleared = true
      queue = queue.then(() => patient($, $.store.set(DAYS, []))).catch(() => { cleared = false })
      await queue
      if (!cleared) return { text: 'This session is empty, but the week could not be cleared: the store would not take it.' }
      return { text: 'The diary and the week are empty.' }
    }
    if (sub === 'week' || sub === 'week copy') {
      const text = weekOf(await week($), await $.clock.now(), sub === 'week copy')
      if (sub === 'week copy') { await $.ui.copy({ text }); return { text: 'Copied the week as markdown.' } }
      return { text: text.replace(/^# /, '') }
    }
    if (sub === 'postcard' || sub === 'postcard copy') {
      const text = postcardOf(await read($, entries), sub === 'postcard copy')
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
          <Button key="postcard" label="postcard" hotkey="p" onPress={async () => { await $.ui.copy({ text: postcardOf(await read($, entries), true) }) }} />
          <Button key="clear" label="clear" hotkey="x" onPress={() => update($, entries, () => [] as Entry[])} />
          <Button key="close" label="close" hotkey="q" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
