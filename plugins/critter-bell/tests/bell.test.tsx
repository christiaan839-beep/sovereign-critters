import { expect, test } from 'claude-code/testing'

import { bellLine, turnLine } from '../hooks/register'

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

test('a turn that ran long says so in its own words', () => {
  expect(turnLine(45_000)).toBe('Claude finished after 45 s')
  expect(turnLine(125_000)).toBe('Claude finished after 2 min 5 s')
})

const turn = async ($: any, on: any, ms: number) => {
  const toasts: string[] = []
  const bells: string[] = []
  let clock = 2_000_000
  on('clock.now', () => ({ value: clock }))
  on('prompt.submit', (_: unknown, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('audio.play', (_: unknown, e: { clip: { asset?: string } }) => { bells.push(e.clip.asset ?? ''); return { value: undefined } })
  await $.prompt.submit({ text: 'go', inputText: 'go' } as never)
  clock += ms
  await $.turn.complete({ answer: 'done' } as never)
  return { toasts, bells }
}

test('a long turn rings the bell when it ends', async ($, on) => {
  const { toasts, bells } = await turn($, on, 90_000)
  expect(toasts).toEqual(['Claude finished after 1 min 30 s'])
  expect(bells).toEqual(['sounds/bell.wav'])
})

test("a subagent finishing does not ring the bell or end the turn's clock; the main loop's end does", async ($, on) => {
  const toasts: string[] = []
  const bells: string[] = []
  let clock = 2_000_000
  on('clock.now', () => ({ value: clock }))
  on('prompt.submit', (_: unknown, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('audio.play', (_: unknown, e: { clip: { asset?: string } }) => { bells.push(e.clip.asset ?? ''); return { value: undefined } })
  await $.prompt.submit({ text: 'go', inputText: 'go' } as never)
  clock += 30_000
  await $.turn.complete({ answer: 'sub', agentId: 'agent-1' } as never)
  expect(toasts).toEqual([])
  expect(bells).toEqual([])
  clock += 60_000
  await $.turn.complete({ answer: 'done' } as never)
  expect(toasts).toEqual(['Claude finished after 1 min 30 s']) // timed from the person's prompt, not from the subagent
})

test('minSeconds, set where the manifest declares it, lets a 10 s turn ring', { options: { minSeconds: 5 } }, async ($, on) => {
  const { toasts, bells } = await turn($, on, 10_000)
  expect(toasts).toEqual(['Claude finished after 10 s'])
  expect(bells).toEqual(['sounds/bell.wav'])
})

test('sound off keeps the toast and silences the bell', { options: { sound: false } }, async ($, on) => {
  const { toasts, bells } = await turn($, on, 90_000)
  expect(toasts).toEqual(['Claude finished after 1 min 30 s'])
  expect(bells).toEqual([])
})

test('shortTurns off silences the tick of a short turn', { options: { shortTurns: false } }, async ($, on) => {
  expect((await turn($, on, 8_000)).bells).toEqual([])
})

test('a turn under five seconds stays quiet', async ($, on) => {
  expect((await turn($, on, 1_000)).bells).toEqual([])
})

test('exactly twenty seconds is long enough', async ($, on) => {
  expect((await turn($, on, 20_000)).bells).toEqual(['sounds/bell.wav'])
})

test('a short turn gets a soft tick, no toast; under five seconds, nothing', async ($, on) => {
  const t = await turn($, on, 6_000)
  expect(t.bells).toEqual(['sounds/tick.wav'])
  expect(t.toasts).toEqual([])
})

test('the tick starts at exactly five seconds, and stops just under twenty', async ($, on) => {
  expect((await turn($, on, 4_999)).bells).toEqual([])
})

test('nineteen seconds is still a tick, and five is the first one', async ($, on) => {
  expect((await turn($, on, 19_999)).bells).toEqual(['sounds/tick.wav'])
})

test('five seconds exactly ticks', async ($, on) => {
  expect((await turn($, on, 5_000)).bells).toEqual(['sounds/tick.wav'])
})

// ---- review fixes: the settings can be set, a command and its turn ring once, and the bell never holds up a result ----
test('minSeconds can be set: a 6 s command rings when the threshold is 5', { options: { minSeconds: 5 } }, async ($, on) => {
  expect((await run($, on, 6_000)).bells).toEqual(['sounds/bell.wav'])
})

test('sound can be turned off and the toast stays', { options: { sound: false } }, async ($, on) => {
  const { toasts, bells } = await run($, on, 45_000)
  expect(toasts).toEqual(['The command finished in 45 s'])
  expect(bells).toEqual([])
})

test('shortTurns can be turned off and the tick goes', { options: { shortTurns: false } }, async ($, on) => {
  expect((await turn($, on, 6_000)).bells).toEqual([])
})

test('a long command and the turn it ends rings once, not twice', async ($, on) => {
  const toasts: string[] = []
  const bells: string[] = []
  let clock = 3_000_000
  on('clock.now', () => ({ value: clock }))
  on('prompt.submit', (_: unknown, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('tool.call', () => { clock += 45_000; return { result: 'ok' } as never })
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.toast', (_: unknown, e: { text: string }) => { toasts.push(e.text); return { value: undefined } })
  on('audio.play', (_: unknown, e: { clip: { asset?: string } }) => { bells.push(e.clip.asset ?? ''); return { value: undefined } })
  await $.prompt.submit({ text: 'go', inputText: 'go' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  clock += 3_000 // Claude reads the result and answers
  await $.turn.complete({ answer: 'done' } as never)
  expect(bells).toEqual(['sounds/bell.wav'])
  expect(toasts).toEqual(['The command finished in 45 s'])
  // but a turn that goes on a long while after the command's bell has not been announced: it rings
  await $.prompt.submit({ text: 'again', inputText: 'again' } as never)
  clock += 90_000
  await $.turn.complete({ answer: 'done' } as never)
  expect(bells).toEqual(['sounds/bell.wav', 'sounds/bell.wav'])
})

test('the bell is not awaited: a player that never answers does not hold up the command or the turn', async ($, on) => {
  let clock = 4_000_000
  on('clock.now', () => ({ value: clock }))
  on('prompt.submit', (_: unknown, e: { text: string; inputText: string }) => ({ text: e.text, inputText: e.inputText }) as never)
  on('tool.call', () => { clock += 45_000; return { result: 'ok' } as never })
  on('turn.complete', () => ({ text: 'done' }))
  on('ui.toast', () => ({ value: undefined }))
  on('audio.play', () => new Promise(() => undefined) as never)
  const soon = <T,>(p: Promise<T>) => Promise.race([p, new Promise<string>(r => setTimeout(() => r('held up'), 200))])
  await $.prompt.submit({ text: 'go', inputText: 'go' } as never)
  expect(await soon($.tool.call({ tool: 'Bash', command: 'make' } as never))).not.toBe('held up')
  clock += 90_000
  expect(await soon($.turn.complete({ answer: 'done' } as never))).not.toBe('held up')
})

test('a toast that rejects never becomes an unhandled rejection or holds up the result', async ($, on) => {
  let clock = 5_000_000
  on('clock.now', () => ({ value: clock }))
  on('tool.call', () => { clock += 25_000; return { result: 'ok' } as never })
  on('ui.toast', () => Promise.reject(new Error('no toaster')) as never)
  on('audio.play', () => ({ value: undefined }))
  expect(await $.tool.call({ tool: 'Bash', command: 'make' } as never)).toBeDefined()
})
