import { expect, test } from 'claude-code/testing'

import type { Entry } from '../types'
import { barOf, addTool, addTurn, dayOf, lineOf, markdownOf, weekOf } from '../hooks/register'

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
}
const stored = () => JSON.stringify(kept.get('session-diary.entries')?.value ?? '')

test('every tool call is written down with its name and time, and never what it ran', async ($, on) => {
  stub(on)
  let clock = AT
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 1500; return { result: 'ok' } as never })
  await $.tool.call({ tool: 'Bash', command: 'curl -H "Authorization: Bearer SECRET123" https://example.com' } as never)
  expect(stored()).toContain('"tool":"Bash"')
  expect(stored()).toContain('"ms":1500')
  expect(stored()).toContain('"ok":true')
  expect(stored()).not.toContain('SECRET123')
  expect(stored()).not.toContain('curl')
})

test('a refused call is written as failed', async ($, on) => {
  stub(on)
  on('clock.now', () => ({ value: AT }))
  on('tool.call', () => ({ deny: 'no' }) as never)
  await $.tool.call({ tool: 'Bash', command: 'rm -rf /' } as never)
  expect(stored()).toContain('"ok":false')
})

test('the diary keeps the last 300 lines', async ($, on) => {
  stub(on)
  let clock = AT
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 10; return { result: 'ok' } as never })
  for (let i = 0; i < 305; i++) await $.tool.call({ tool: 'Read', command: String(i) } as never)
  expect((JSON.parse(stored()) as { value?: unknown[] } | unknown[])).toBeDefined()
  const list = (kept.get('session-diary.entries')?.value as { value: Entry[] }).value
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
  expect(opened).toEqual(['session-diary'])
  expect(JSON.stringify(await run('copy'))).toMatch(/Copied/)
  expect(copied[0]).toContain('Grep')
  expect(JSON.stringify(await run('clear'))).toMatch(/empty/)
  expect((kept.get('session-diary.entries')?.value as { value: Entry[] }).value).toEqual([])
})

test('the pane lists what happened and has its buttons, on every surface', async ($, on) => {
  stub(on)
  let clock = AT
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 100; return { result: 'ok' } as never })
  await $.tool.call({ tool: 'Edit' } as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-diary', component: 'Pane', requestId: 'session-diary', surface, props: { bodyColumns: 60 } } as never)
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

// ---- the register: calls and turns reach the day counts, and /diary week says them and copies them ----
test('every call and turn lands in its day, and /diary week says them and copies them as markdown', async ($, on) => {
  stub(on)
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
