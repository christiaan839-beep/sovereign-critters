import { expect, test } from 'claude-code/testing'

import { bellLine } from '../hooks/register'

test('the line says how long it ran and whether it failed', () => {
  expect(bellLine(20_000, false)).toBe('The command finished in 20 s')
  expect(bellLine(59_499, false)).toBe('The command finished in 59 s')
  expect(bellLine(60_000, false)).toBe('The command finished in 1 min')
  expect(bellLine(95_000, true)).toBe('The command failed after 1 min 35 s')
})

const run = async ($: any, on: any, ms: number, result: Record<string, unknown> = {}) => {
  const toasts: string[] = []
  const bells: string[] = []
  let clock = 1_000_000
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += ms; return ('deny' in result ? result : { result: 'ok', ...result }) as never })
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('audio.play', (_: unknown, e: { clip: { asset?: string } }) => { bells.push(e.clip.asset ?? ''); return { value: undefined } })
  await $.tool.call({ tool: 'Bash', command: 'npm run build' } as never)
  return { toasts, bells }
}

test('a long command rings the bell and shows a toast', async ($, on) => {
  const { toasts, bells } = await run($, on, 45_000)
  expect(toasts).toEqual(['The command finished in 45 s'])
  expect(bells).toEqual(['sounds/bell.wav'])
})

test('a short command stays quiet', async ($, on) => {
  const { toasts, bells } = await run($, on, 19_999)
  expect(toasts).toEqual([])
  expect(bells).toEqual([])
})

test('exactly the threshold rings, and a failure says so', async ($, on) => {
  const { toasts } = await run($, on, 20_000, { isError: true })
  expect(toasts).toEqual(['The command failed after 20 s'])
})

test('a command that was denied is not a build that finished', async ($, on) => {
  const { toasts, bells } = await run($, on, 60_000, { deny: 'no' })
  expect(toasts).toEqual([])
  expect(bells).toEqual([])
})
