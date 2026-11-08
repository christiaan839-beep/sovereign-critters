import { expect, test } from 'claude-code/testing'

import type { Entry } from '../types'
import { lineOf, markdownOf } from '../hooks/register'

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
