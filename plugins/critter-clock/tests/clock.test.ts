import { expect, test } from 'claude-code/testing'
import { fresh, hourToast, length, step, summary } from '../hooks/register'

const MIN = 60_000
const HOUR = 60 * MIN

test('a length reads the way a person says it', () => {
  expect(length(0)).toBe('0s')
  expect(length(42_000)).toBe('42s')
  expect(length(6 * MIN + 40_000)).toBe('6m 40s')
  expect(length(41 * MIN + 20_000)).toBe('41m')
  expect(length(HOUR)).toBe('1h')
  expect(length(HOUR + 12 * MIN + 59_000)).toBe('1h 12m')
  expect(length(-5)).toBe('0s')
})

test('a turn adds its time to the work, and the longest is remembered', () => {
  let s = fresh(0)
  s = step(s, 6 * MIN + 40_000)
  s = step(s, 5 * MIN)
  expect(s.workMs).toBe(6 * MIN + 40_000 + 5 * MIN)
  expect(s.turns).toBe(2)
  expect(s.longestMs).toBe(6 * MIN + 40_000)
})

test('a duration that is not a number counts as no time, and a negative one too', () => {
  let s = fresh(0)
  s = step(s, Number.NaN)
  s = step(s, -50)
  expect(s.workMs).toBe(0)
  expect(s.turns).toBe(2)
})

test('the summary says how long, how much was Claude, and the longest wait', () => {
  let s = fresh(0)
  s = step(s, 6 * MIN + 40_000)
  expect(summary(s, 72 * MIN)).toBe('1h 12m here. Claude worked 6m 40s of it. The longest turn was 6m 40s.')
})

test('before any turn the summary does not invent a longest turn', () => {
  expect(summary(fresh(0), 3 * MIN)).toBe('3m here. Claude has not worked yet.')
})

test('the hour toast speaks once per full hour and never twice for the same one', () => {
  let s = fresh(0)
  s = step(s, 45 * MIN)
  expect(hourToast(s, 59 * MIN)).toBeUndefined()
  const first = hourToast(s, HOUR + MIN)
  expect(first?.text).toBe('An hour in. Claude has worked 45m of it.')
  s = first!.state
  expect(hourToast(s, HOUR + 2 * MIN)).toBeUndefined()
  expect(hourToast(s, 2 * HOUR + MIN)?.text).toBe('2 hours in. Claude has worked 45m of it.')
})

test('a session that sat idle for three hours says the latest hour once, not three toasts', () => {
  const s = fresh(0)
  const t = hourToast(s, 3 * HOUR + MIN)
  expect(t?.text).toBe('3 hours in. Claude has not worked yet.')
  expect(hourToast(t!.state, 3 * HOUR + 2 * MIN)).toBeUndefined()
})

test('/clock answers in words and never denies a tool', async ($, on) => {
  on('command.register', () => ({ value: { command: 'clock' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: 'ran' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const out = await $.command.run({ command: 'clock', args: '', origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })
  expect(out.text).toMatch(/^\d+[smh]( \d+[sm])? here\. Claude has not worked yet\.$/)
  await $.turn.complete({ turnId: 't1', answer: 'done', durationMs: 90_000, isAborted: false, reason: 'end_turn' } as never)
  const after = await $.command.run({ command: 'clock', args: '', origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })
  expect(after.text).toMatch(/ here\. Claude worked 1m 30s of it\. The longest turn was 1m 30s\.$/)
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran.deny).toBeUndefined()
  expect(ran.result).toBe('ran')
})

test('a broken clock still lets the tool through', async ($, on) => {
  on('tool.call', () => ({ result: 'ran' }))
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran.deny).toBeUndefined()
})
