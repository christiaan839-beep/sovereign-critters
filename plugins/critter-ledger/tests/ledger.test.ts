import { expect, test } from 'claude-code/testing'
import { count, crossed, fresh, parseLimit, report, size, take } from '../hooks/register'

const use = (input_tokens: number, output_tokens: number, cache_read_input_tokens = 0, cache_creation_input_tokens = 0) =>
  ({ input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, model: 'm' })

test('a size reads short: plain below a thousand, k, then m', () => {
  expect(size(0)).toBe('0')
  expect(size(812)).toBe('812')
  expect(size(1_000)).toBe('1k')
  expect(size(214_300)).toBe('214k')
  expect(size(999_999)).toBe('1m')
  expect(size(1_250_000)).toBe('1.3m')
})

test('a limit is read from k and m, or plain digits, or off', () => {
  expect(parseLimit('500k')).toEqual({ ok: true, limit: 500_000 })
  expect(parseLimit('1.5m')).toEqual({ ok: true, limit: 1_500_000 })
  expect(parseLimit('250000')).toEqual({ ok: true, limit: 250_000 })
  expect(parseLimit(' 500K ')).toEqual({ ok: true, limit: 500_000 })
  expect(parseLimit('off')).toEqual({ ok: true, limit: undefined })
  for (const bad of ['', 'lots', '-5k', '0', '12x', '1e9k', 'NaN']) expect(parseLimit(bad).ok, bad).toBe(false)
})

test('a turn adds all four counts, and the biggest turn is remembered', () => {
  let s = fresh()
  s = take(s, use(1000, 200, 5000, 300))
  s = take(s, use(50, 10))
  expect(s.input).toBe(1050)
  expect(s.output).toBe(210)
  expect(s.cached).toBe(5000)
  expect(s.wrote).toBe(300)
  expect(s.turns).toBe(2)
  expect(s.biggest).toBe(6500)
  expect(count(s)).toBe(6560)
})

test('a usage with a missing or odd number counts that number as nothing', () => {
  const s = take(fresh(), { input_tokens: 10, output_tokens: Number.NaN, model: 'm' } as never)
  expect(s.input).toBe(10)
  expect(s.output).toBe(0)
  expect(count(take(fresh(), undefined))).toBe(0)
  expect(take(fresh(), undefined).turns).toBe(0)
})

test('the report says what was used and what the limit is', () => {
  let s = fresh()
  s = take(s, use(30_000, 8_000, 180_000, 4_000))
  expect(report(s, undefined)).toBe('222k used: 8k out, 34k in, 180k read from the cache. The biggest turn was 222k. No limit set (/ledger limit 500k).')
  expect(report(s, 500_000)).toBe('222k used: 8k out, 34k in, 180k read from the cache. The biggest turn was 222k. You set 500k; you are at 44%.')
  expect(report(s, 400_000)).toMatch(/you are at 55%\.$/) // 55.5 is not yet 56
})

test('before any turn the report says there is nothing to count yet', () => {
  expect(report(fresh(), undefined)).toBe('Nothing counted yet. No limit set (/ledger limit 500k).')
})

test('the limit is crossed once, on the turn that passes it', () => {
  let s = fresh()
  expect(crossed(s, 100)).toBe(false)
  s = take(s, use(60, 0))
  expect(crossed(s, 100)).toBe(false)
  s = take(s, use(60, 0))
  expect(crossed(s, 100)).toBe(true)
  expect(crossed(s, undefined)).toBe(false)
  expect(s.said).toBe(false)
})

test('/ledger answers, sets a limit, rejects a bad one, and says so once when passed', async ($, on) => {
  const toasts: string[] = []
  on('command.register', () => ({ value: { command: 'ledger' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: string }).text)); return { value: undefined } })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const done = (usage: ReturnType<typeof use>) =>
    $.turn.complete({ turnId: 't', answer: '', durationMs: 1, isAborted: false, reason: 'end_turn', usage } as never)

  expect((await $.command.run({ command: 'ledger', args: '', origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })).text).toBe('Nothing counted yet. No limit set (/ledger limit 500k).')
  expect((await $.command.run({ command: 'ledger', args: 'limit 1k', origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })).text).toBe('Limit set to 1k. I will say so once if you pass it.')
  expect((await $.command.run({ command: 'ledger', args: 'limit nonsense', origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })).text).toBe('A limit looks like 500k, 1.5m or 250000. Say "limit off" to clear it.')
  await done(use(600, 0))
  expect(toasts).toEqual([])
  await done(use(600, 0))
  expect(toasts).toEqual(['You passed the 1k you set: 1.2k used.'])
  await done(use(600, 0))
  expect(toasts.length).toBe(1)
  expect((await $.command.run({ command: 'ledger', args: 'limit off', origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })).text).toBe('Limit cleared.')
})

test('it never touches a tool call', async ($, on) => {
  on('tool.call', () => ({ result: 'ran' }))
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran.deny).toBeUndefined()
  expect(ran.result).toBe('ran')
})
