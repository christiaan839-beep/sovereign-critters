import { expect, mock, test } from 'claude-code/testing'

import type { Entry } from '../types'
import { postcardOf, barOf, addTool, addTurn, dayOf, lineOf, markdownOf, weekOf, cleanDays, idle } from '../hooks/register'

// 1_000_000_000_000 ms is 2001-09-09 01:46:40 UTC, so 03:46 in Johannesburg.
const AT = 1_000_000_000_000
const tool = (over: Partial<Extract<Entry, { kind: 'tool' }>> = {}): Entry => ({ kind: 'tool', at: AT, tool: 'Read', ms: 420, ok: true, ...over })
const turn = (over: Partial<Extract<Entry, { kind: 'turn' }>> = {}): Entry => ({ kind: 'turn', at: AT + 5000, tools: 2, errors: 0, ms: 5000, ...over })

test('a line says the hour in Johannesburg, the tool, the time and whether it failed', () => {
  expect(lineOf(tool())).toBe('03:46  ✓ Read · 420 ms')
  expect(lineOf(tool({ ok: false, tool: 'Bash', ms: 2400 }))).toBe('03:46  ✗ Bash · 2.4 s')
  expect(lineOf(tool({ ms: 949 }))).toBe('03:46  ✓ Read · 950 ms')
  expect(lineOf(tool({ ms: 950 }))).toBe('03:46  ✓ Read · 1.0 s')
  expect(lineOf(tool({ ms: 95_000 }))).toBe('03:46  ✓ Read · 1 min 35 s')
  expect(lineOf(turn())).toBe('03:46  turn · 2 tools · 5.0 s')
  expect(lineOf(turn({ tools: 1, errors: 1 }))).toBe('03:46  turn · 1 tool, 1 failed · 5.0 s')
})

test('the markdown is empty when nothing happened, and counts what did', () => {
  expect(markdownOf([])).toContain('Nothing yet.')
  const md = markdownOf([tool(), tool({ ok: false, tool: 'Bash' }), turn({ errors: 1 })])
  expect(md).toContain('# Session diary')
  expect(md).toContain('- 03:46  ✓ Read · 420 ms')
  expect(md).toContain('**03:46  turn · 2 tools, 1 failed · 5.0 s**')
  expect(md).toContain('2 tool calls, 1 failed.')
  expect(markdownOf([tool()])).toContain('1 tool call, 0 failed.')
  expect(md).not.toMatch(/\n{3,}/)
})

const kept = new Map<string, { value: unknown; version: number }>()
const stub = (on: any, timers = true) => {
  kept.clear()
  if (timers) on('clock.after', () => ({ value: { cancel: () => undefined } })) // the five-second guard on store steps
  on('state.get', (_: unknown, e: { plugin: string; key: string }) => ({ value: kept.get(`${e.plugin}.${e.key}`) ?? { value: undefined, version: 0 } }))
  on('state.set', (_: unknown, e: { plugin: string; key: string; value: unknown; ifVersion?: number }) => {
    const id = `${e.plugin}.${e.key}`
    const now = kept.get(id)?.version ?? 0
    if (e.ifVersion !== undefined && e.ifVersion !== now) return { value: { isSet: false, version: now } }
    kept.set(id, { value: e.value, version: now + 1 })
    return { value: { isSet: true, version: now + 1 } }
  })
}
let diskFull = false
const store: Record<string, unknown> = {}
const keepStore = (on: any) => {
  diskFull = false
  for (const k of Object.keys(store)) delete store[k]
  on('store.get', (_: unknown, e: { key: string }) => ({ value: store[e.key] }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { if (diskFull) throw new Error('disk full'); store[e.key] = e.value; return { value: undefined } })
}
// A write started behind a result lands a moment after it: wait for the writes to settle, then one more turn of the loop.
const settle = async () => { await idle(); await new Promise(r => setTimeout(r, 5)) }
const stored = () => JSON.stringify(kept.get('critter-diary.entries')?.value ?? '')

test('every tool call is written down with its name and time, and never what it ran', async ($, on) => {
  stub(on)
  let clock = AT
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 1500; return { result: 'ok' } as never })
  await $.tool.call({ tool: 'Bash', command: 'curl -H "Authorization: Bearer SECRET123" https://example.com' } as never)
  await settle()
  expect(stored()).toContain('"tool":"Bash"')
  await settle()
  expect(stored()).toContain('"ms":1500')
  await settle()
  expect(stored()).toContain('"ok":true')
  await settle()
  expect(stored()).not.toContain('SECRET123')
  await settle()
  expect(stored()).not.toContain('curl')
})

test('a refused call is written as failed', async ($, on) => {
  stub(on)
  on('clock.now', () => ({ value: AT }))
  on('tool.call', () => ({ deny: 'no' }) as never)
  await $.tool.call({ tool: 'Bash', command: 'rm -rf /' } as never)
  await settle()
  expect(stored()).toContain('"ok":false')
})

test('the diary keeps the last 300 lines', async ($, on) => {
  stub(on)
  let clock = AT
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 10; return { result: 'ok' } as never })
  for (let i = 0; i < 305; i++) await $.tool.call({ tool: 'Read', command: String(i) } as never)
  expect((JSON.parse(stored()) as { value?: unknown[] } | unknown[])).toBeDefined()
  await settle()
  const list = (kept.get('critter-diary.entries')?.value as { value: Entry[] }).value
  expect(list.length).toBe(300)
})

test('/diary opens the pane, copies markdown, and clears', async ($, on) => {
  stub(on)
  let clock = AT
  const copied: string[] = []
  const opened: string[] = []
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 100; return { result: 'ok' } as never })
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.copy', (_: unknown, e: { text: string }) => { copied.push(e.text); return { value: undefined } })
  on('ui.open', (_: unknown, e: { id: string }) => { opened.push(e.id); return { value: undefined } })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Grep' } as never)
  const run = (args: string) => $.command.run({ command: 'diary', args, origin: { kind: 'composer' }, presentation: {} } as never)
  expect(JSON.stringify(await run(''))).toMatch(/opened/)
  expect(opened).toEqual(['critter-diary'])
  expect(JSON.stringify(await run('copy'))).toMatch(/Copied/)
  expect(copied[0]).toContain('Grep')
  expect(JSON.stringify(await run('clear'))).toMatch(/empty/)
  expect((kept.get('critter-diary.entries')?.value as { value: Entry[] }).value).toEqual([])
})

test('the pane lists what happened and has its buttons, on every surface', async ($, on) => {
  stub(on)
  let clock = AT
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 100; return { result: 'ok' } as never })
  await $.tool.call({ tool: 'Edit' } as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    await settle()
    const ui = await $.ui.mount({ plugin: 'critter-diary', component: 'Pane', requestId: 'critter-diary', surface, props: { bodyColumns: 60 } } as never)
    expect(await ui.find({ type: 'Text', text: /✓ Edit/ })).toBeDefined()
    expect(await ui.find({ key: 'copy' })).toBeDefined()
    expect(await ui.find({ key: 'clear' })).toBeDefined()
    expect(await ui.find({ key: 'close' })).toBeDefined()
    await ui.unmount()
  }
})

// 2026-11-08 is a Sunday; 22:30 UTC is already Monday 00:30 in Johannesburg.
const SUN = Date.UTC(2026, 10, 8, 10)
const DAY = 86_400_000

test('a day is the Johannesburg calendar day, so late evening UTC belongs to tomorrow', () => {
  expect(dayOf(SUN)).toBe('2026-11-08')
  expect(dayOf(Date.UTC(2026, 10, 8, 21, 59))).toBe('2026-11-08')
  expect(dayOf(Date.UTC(2026, 10, 8, 22, 0))).toBe('2026-11-09')
})

test('calls and turns count into their day and the list keeps 14 days, oldest dropped', () => {
  let d = addTool([], SUN, 'Read', true)
  d = addTool(d, SUN + 1000, 'Bash', false)
  d = addTurn(d, SUN + 2000, 4000)
  expect(d).toEqual([{ day: '2026-11-08', tools: 2, failed: 1, turns: 1, ms: 4000, by: { Read: 1, Bash: 1 } }])
  let long = [] as ReturnType<typeof addTool>
  for (let i = 0; i < 20; i++) long = addTool(long, SUN + i * DAY, 'Read', true)
  expect(long).toHaveLength(14)
  expect(long[0]!.day).toBe(dayOf(SUN + 6 * DAY))
})

test('the week lists seven days oldest first, marks quiet ones, and names the busiest tools', () => {
  expect(weekOf([], SUN)).toContain('Nothing yet.')
  let d = addTool([], SUN - 2 * DAY, 'Read', true)
  d = addTool(d, SUN - 2 * DAY, 'Read', true)
  d = addTool(d, SUN, 'Bash', false)
  d = addTurn(d, SUN, 90_000)
  const w = weekOf(d, SUN)
  expect(w).toContain('# This week')
  expect(w.indexOf('Mon 11-02')).toBeLessThan(w.indexOf('Sun 11-08'))
  expect(w).toContain('- Fri 11-06  2 tool calls · 0 turns')
  expect(w).toContain('- Sat 11-07  quiet')
  expect(w).toContain('- Sun 11-08  1 tool call, 1 failed · 1 turn · 1 min 30 s')
  expect(w).toContain('3 tool calls, 1 failed, 1 turn, 1 min 30 s of Claude working.')
  expect(w).toContain('Busiest: Read 2, Bash 1.')
  expect(w).not.toContain('11-01')
})

test('a tool named like an object property is counted as itself, in the day and on the postcard', () => {
  const days = addTool(addTool([], AT, 'constructor', true), AT, 'constructor', false)
  expect(days[0]!.by.constructor).toBe(2)
  expect(Object.keys(days[0]!.by)).toEqual(['constructor'])
  expect(postcardOf([tool({ tool: 'constructor' }), tool({ tool: 'constructor' }), tool({ tool: '__proto__' })])).toContain('Most used: __proto__ 1, constructor 2'.replace('__proto__ 1, constructor 2', 'constructor 2, __proto__ 1'))
})

test("a subagent's turn ending is not a turn of the person's day", async ($, on) => {
  stub(on); keepStore(on)
  on('clock.now', () => ({ value: AT }))
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: 'done' }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read' } as never)
  await $.turn.complete({ answer: 'sub', agentId: 'agent-1' } as never)
  const said = async (args: string) => (await $.command.run({ command: 'diary', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }
  expect((await said('week')).text ?? '').not.toMatch(/\b1 turn/)
  await $.turn.complete({ answer: 'done' } as never)
  expect((await said('week')).text ?? '').toMatch(/1 turn/)
})

// ---- the register: calls and turns reach the day counts, and /diary week says them and copies them ----
test('every call and turn lands in its day, and /diary week says them and copies them as markdown', async ($, on) => {
  stub(on); keepStore(on)
  let copied = ''
  on('clock.now', () => ({ value: AT }))
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.copy', (_: unknown, e: { text: string }) => { copied = e.text; return { value: undefined } })
  on('tool.call', (_: unknown, e: { tool: string }) => (e.tool === 'Bash' ? { deny: 'no' } : { result: 'ok' }) as never)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read' } as never)
  await $.tool.call({ tool: 'Read' } as never)
  await $.tool.call({ tool: 'Bash' } as never)
  await $.turn.complete({ answer: 'done' } as never)
  await settle()
  const said = async (args: string) => (await $.command.run({ command: 'diary', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }
  const week = (await said('week')).text ?? ''
  expect(week).toContain('3 tool calls, 1 failed, 1 turn')
  expect(week).toContain('Busiest: Read 2, Bash 1.')
  expect(week).toContain('Sun 09-09') // 03:46 in Johannesburg on 2001-09-09
  expect(copied).toBe('') // saying it does not copy it
  const done = (await said('week copy')).text ?? ''
  expect(done).toMatch(/Copied the week/)
  expect(copied).toContain('# This week')
  expect(copied).toContain('3 tool calls, 1 failed, 1 turn')
})

test('the week draws a bar a day: the busiest fills the card, a light day is a sliver, a quiet day has none', () => {
  expect(barOf(0, 10)).toBe('')
  expect(barOf(10, 10)).toBe('█'.repeat(12))
  expect(barOf(5, 10)).toBe('█'.repeat(6))
  expect(barOf(1, 100)).toBe('▏') // never invisible
  expect(barOf(3, 8)).toBe('████▌') // 4.5 cells
  let d = addTool([], SUN - 2 * DAY, 'Read', true)
  d = addTool(d, SUN - 2 * DAY, 'Read', true)
  d = addTool(d, SUN, 'Bash', false)
  const w = weekOf(d, SUN)
  expect(w).toMatch(/- Fri 11-06  2 tool calls · 0 turns · .*█{12}/)
  expect(w).toMatch(/- Sun 11-08  1 tool call, 1 failed · 0 turns · .*█{6}$/m)
  expect(w).toContain('Busiest day: Fri 11-06, 2 tool calls.')
  expect(w).not.toMatch(/Sat 11-07.*█/)
  const tie = addTool(addTool([], SUN - DAY, 'Read', true), SUN, 'Read', true)
  expect(weekOf(tie, SUN)).not.toContain('Busiest day') // a tie crowns nobody
})

// ---- the postcard ----
const H = 3_600_000
const card = (list: Entry[]) => postcardOf(list)

test('the postcard of nothing says so, and of a session names the span, the turns, the calls, the busiest hour and the tools used most', () => {
  expect(card([])).toBe('# Session postcard\n\nNothing yet.\n')
  // 03:46 SAST: two Reads; 04:46: three Bash (one failed); 05:46: one Edit; turns end at 05:50 and 06:00
  const list: Entry[] = [
    tool({ at: AT, tool: 'Read' }), tool({ at: AT + 1000, tool: 'Read' }),
    tool({ at: AT + H, tool: 'Bash' }), tool({ at: AT + H + 1000, tool: 'Bash', ok: false }), tool({ at: AT + H + 2000, tool: 'Bash' }),
    tool({ at: AT + 2 * H, tool: 'Edit', ms: 500 }),
    turn({ at: AT + 2 * H + 4 * 60_000, tools: 6, errors: 1, ms: 30 * 60_000 }),
    turn({ at: AT + 2 * H + 14 * 60_000, tools: 0, errors: 0, ms: 10 * 60_000 }),
  ]
  const md = card(list)
  expect(md).toContain('# Session postcard')
  expect(md).toContain('2 h 14 min, 03:46 to 06:00') // first mark to the last turn's end
  expect(md).toContain('2 turns, Claude working 40 min')
  expect(md).toContain('6 tool calls, 1 failed')
  expect(md).toContain('Busiest hour: 04:00 to 05:00, 3 tool calls')
  expect(md).toContain('Most used: Bash 3, Read 2, Edit 1')
  expect(md).toContain('A long one. Stand up.') // two hours or more
  expect(md).not.toMatch(/\n{3,}/)
})

test('the postcard breaks a tie for the busiest hour toward the earlier one, and a tie of tools toward the alphabet', () => {
  const list: Entry[] = [tool({ at: AT + H, tool: 'Zed' }), tool({ at: AT, tool: 'Alpha' }), turn({ at: AT + H + 5000 })]
  const md = card(list)
  expect(md).toContain('Busiest hour: 03:00 to 04:00, 1 tool call') // 03:46 is before 04:46 though it was written second
  expect(md).toContain('Most used: Alpha 1, Zed 1')
})

test('the postcard keeps its words short and singular where it should, and says nothing of a long sit under two hours', () => {
  const md = card([tool({ at: AT, tool: 'Read' }), turn({ at: AT + 60_000, tools: 1, errors: 0, ms: 60_000 })])
  expect(md).toContain('1 min, 03:46 to 03:47')
  expect(md).toContain('1 turn, Claude working 1 min')
  expect(md).toContain('1 tool call, 0 failed')
  expect(md).not.toContain('Stand up')
  expect(card([tool({ at: AT, tool: 'Read' })])).toContain('under a minute')
})

test('a diary at its cap says its start may be missing; one under it does not', () => {
  const full: Entry[] = Array.from({ length: 300 }, (_, i) => tool({ at: AT + i * 1000 }))
  expect(card(full)).toContain('keeps the last 300 lines')
  expect(card(full.slice(1))).not.toContain('keeps the last 300 lines')
})

test('the postcard names tools and times only: never what was run', () => {
  const md = card([tool({ tool: 'Bash' })])
  expect(md).not.toMatch(/curl|SECRET|\/Users/)
})

test('/diary postcard says it, /diary postcard copy puts it on the clipboard, and the pane has a button for it', async ($, on) => {
  stub(on); keepStore(on)
  let copied = ''
  on('clock.now', () => ({ value: AT }))
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.copy', (_: unknown, e: { text: string }) => { copied = e.text; return { value: undefined } })
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read' } as never)
  await $.turn.complete({ answer: 'done' } as never)
  const said = async (args: string) => (await $.command.run({ command: 'diary', args, origin: { kind: 'composer' }, presentation: {} } as never)) as { text?: string }
  const text = (await said('postcard')).text ?? ''
  expect(text).toMatch(/^Session postcard/)
  expect(text).toContain('Most used: Read 1')
  expect(copied).toBe('') // saying it does not copy it
  expect((await said('postcard copy')).text).toMatch(/Copied the postcard/)
  expect(copied).toContain('# Session postcard')
  await settle()
  const ui = await $.ui.mount({ plugin: 'critter-diary', component: 'Pane', requestId: 'critter-diary', surface: 'terminal', props: { bodyColumns: 60 } } as never)
  expect(await ui.find({ key: 'postcard' })).toBeDefined()
  await ui.unmount()
})

test('the span runs to the end of the last call, and the long-sit line starts at exactly two hours', () => {
  expect(card([tool({ at: AT, ms: 5 * 60_000 })])).toContain('5 min, 03:46 to 03:51') // a call still running counts to its end
  const at2h = (ms: number) => card([tool({ at: AT }), turn({ at: AT + ms, ms: 1000 })])
  expect(at2h(2 * H)).toContain('Stand up')
  expect(at2h(2 * H - 60_000)).not.toContain('Stand up') // a minute short of two hours
})


// ---- review fixes: the week survives a restart, a span never reads "1 min 60 s", a tool name cannot break the markdown ----
const sayDiary = ($: any, args: string) => $.command.run({ command: 'diary', args, origin: { kind: 'composer' }, presentation: {} }).then((r: { text?: string }) => r.text ?? '')

test('the week is kept in the store, so a new session reads the days an earlier one wrote', async ($, on) => {
  stub(on); keepStore(on)
  on('clock.now', () => ({ value: AT }))
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.tool.call({ tool: 'Read' } as never)
  await settle()
  expect((store.days as { day: string; tools: number }[])[0]).toMatchObject({ day: dayOf(AT), tools: 1 })
  expect(kept.get('critter-diary.days')).toBeUndefined() // not in the session's state
  kept.clear() // a restart: the session's state is gone, the store is not
  expect(await sayDiary($, 'week')).toContain('1 tool call')
})

test('/diary clear empties the session and the week', async ($, on) => {
  stub(on); keepStore(on)
  on('clock.now', () => ({ value: AT }))
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.tool.call({ tool: 'Read' } as never)
  await settle()
  expect(await sayDiary($, 'clear')).toMatch(/empty/)
  expect(store.days).toEqual([])
  expect(await sayDiary($, 'week')).toContain('Nothing yet.')
})

test('parallel tool calls all reach the week, and a store that will not write never holds up a tool', async ($, on) => {
  stub(on); keepStore(on)
  on('clock.now', () => ({ value: AT }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await Promise.all(Array.from({ length: 8 }, () => $.tool.call({ tool: 'Read' } as never)))
  await settle()
  expect((store.days as { tools: number }[])[0]!.tools).toBe(8)
  diskFull = true
  expect(await $.tool.call({ tool: 'Read' } as never)).toBeDefined()
})

test('a bad store is an empty week, and a good one is read with suspicion', () => {
  expect(cleanDays(undefined)).toEqual([])
  expect(cleanDays('x')).toEqual([])
  const good = { day: '2026-11-08', tools: 2, failed: 0, turns: 1, ms: 5, by: { Read: 2 } }
  expect(cleanDays([good, { day: 5 }, null, { ...good, day: '2026-11-09', tools: 'many' }, { ...good, day: 'yesterday' }])).toEqual([good])
  expect(cleanDays(Array.from({ length: 30 }, (_, i) => ({ ...good, day: dayOf(SUN + i * DAY) })))).toHaveLength(14)
})

test('a span never rounds up to a whole unit it did not reach', () => {
  expect(lineOf(tool({ ms: 59_960 }))).toBe('03:46  ✓ Read · 1 min 0 s')
  expect(lineOf(tool({ ms: 119_700 }))).toBe('03:46  ✓ Read · 2 min 0 s')
  expect(lineOf(tool({ ms: 59_900 }))).toBe('03:46  ✓ Read · 59.9 s')
  expect(lineOf(tool({ ms: 1 }))).toBe('03:46  ✓ Read · under 10 ms')
  expect(lineOf(tool({ ms: 12 }))).toBe('03:46  ✓ Read · 10 ms')
})

test('a tool name from an MCP server cannot break the markdown or add lines to it', () => {
  const name = 'mcp__evil__x\n# Heading [click](http://x) `code` *b*'.replace('\\n', '\n')
  const md = markdownOf([tool({ tool: name })])
  expect(md).not.toMatch(/^# Heading/m)
  expect(md).not.toContain('[click](')
  expect(md).toContain('mcp\\_\\_evil\\_\\_x')
  const pc = postcardOf([tool({ tool: name })], true)
  expect(pc).not.toContain('[click](')
  expect(pc).toContain('mcp\\_\\_evil')
  expect(postcardOf([tool({ tool: 'mcp__a__b' })])).toContain('mcp__a__b') // said in the pane, not escaped
})


// ---- second review: a hung store never holds up a tool, clear cannot lose to a write in flight, escapes cover autolinks and bidi ----
test('a store that never answers does not hold up a tool, and the week is settled by idle()', async ($, on) => {
  stub(on)
  on('clock.now', () => ({ value: AT }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('store.get', () => new Promise(() => undefined) as never)
  on('store.set', () => ({ value: undefined }))
  const soon = <T,>(p: Promise<T>) => Promise.race([p, new Promise<string>(r => setTimeout(() => r('held up'), 200))])
  expect(await soon($.tool.call({ tool: 'Read' } as never))).not.toBe('held up')
})

test('/diary clear after a write that is still in flight leaves the week empty', async ($, on) => {
  stub(on); keepStore(on)
  on('clock.now', () => ({ value: AT }))
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.tool.call({ tool: 'Read' } as never) // not awaited to the store
  await sayDiary($, 'clear')
  await settle()
  expect(store.days).toEqual([])
})

test('a clock that steps back cannot make a day vanish, and names are cleaned of line breaks, bidi controls and autolinks', async ($, on) => {
  stub(on); keepStore(on)
  let n = 0
  on('clock.now', () => ({ value: AT - (n++ % 2 ? 5000 : 0) }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('turn.complete', () => ({ text: 'done' }))
  await $.tool.call({ tool: 'Read' } as never)
  await $.turn.complete({ answer: 'x' } as never)
  await settle()
  const d = (store.days as { ms: number }[])[0]!
  expect(d.ms).toBeGreaterThanOrEqual(0)
  const md = markdownOf([tool({ tool: 'https://evil.example/x a@b.com :tada: \u202Eabc\u2028# h' })])
  expect(md).not.toContain('https://evil')
  expect(md).not.toMatch(/\u202E|\u2028/)
  expect(md).not.toMatch(/^# h/m)
})


test('a store that hangs cannot hang /diary clear or stop the week for good: each store step gives up after five seconds', async ($, on) => {
  const clock = mock.clock(on, { now: AT })
  stub(on, false)
  let hang = true
  const store2: Record<string, unknown> = {}
  on('store.get', (_: unknown, e: { key: string }) => (hang ? (new Promise(() => undefined) as never) : ({ value: store2[e.key] })))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { store2[e.key] = e.value; return { value: undefined } })
  on('command.register', () => ({ value: { command: 'diary' } }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.tool.call({ tool: 'Read' } as never) // its week write hangs on the first get
  const cleared = sayDiary($, 'clear')
  await clock.advance(6000)
  await clock.advance(6000)
  expect(await cleared).toMatch(/empty/)
  hang = false
  await $.tool.call({ tool: 'Read' } as never) // and the week records again
  await settle()
  expect((store2.days as { tools: number }[])[0]!.tools).toBeGreaterThan(0)
})

test('a tool name is cut at 80 characters before it is kept', async ($, on) => {
  stub(on)
  on('clock.now', () => ({ value: AT }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.tool.call({ tool: 'mcp__' + 'x'.repeat(200) } as never)
    await settle()
  const list = (kept.get('critter-diary.entries')?.value as { value: Extract<Entry, { kind: 'tool' }>[] }).value
  expect(list[0]!.tool).toHaveLength(80)
})

test('a state that never answers does not hold up a tool result', async ($, on) => {
  on('clock.now', () => ({ value: AT }))
  on('clock.after', () => ({ value: { cancel: () => undefined } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('state.get', () => new Promise(() => undefined) as never)
  on('tool.call', () => ({ result: 'ran' }) as never)
  const soon = <T,>(p: Promise<T>) => Promise.race([p, new Promise<string>(r => setTimeout(() => r('held up'), 200))])
  const ran = await soon($.tool.call({ tool: 'Read' } as never))
  expect(ran).not.toBe('held up')
  expect((ran as { result: string }).result).toBe('ran')
})
