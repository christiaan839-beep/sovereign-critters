import type { Register } from 'claude-code'

// critter-clock keeps times and nothing else: when the session began, and when each turn of the main loop began and ended.
// It never reads a prompt, a file or a tool call, and it never blocks one.

const MIN = 60_000
const HOUR = 60 * MIN

export type Clock = { startedAt: number; workMs: number; turns: number; longestMs: number; hoursSaid: number }

export const fresh = (now: number): Clock => ({ startedAt: now, workMs: 0, turns: 0, longestMs: 0, hoursSaid: 0 })

// 42s, 6m 40s, 41m, 1h, 1h 12m: seconds only while they matter (under ten minutes), minutes only past an hour.
export function length(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 10) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`
}

// One finished turn of the main loop, as long as the engine says it took.
export function step(c: Clock, ms: number): Clock {
  const took = Number.isFinite(ms) ? Math.max(0, ms) : 0
  return { ...c, workMs: c.workMs + took, turns: c.turns + 1, longestMs: Math.max(c.longestMs, took) }
}

const worked = (c: Clock) => (c.turns ? `Claude worked ${length(c.workMs)} of it` : 'Claude has not worked yet')

export function summary(c: Clock, now: number): string {
  const here = `${length(now - c.startedAt)} here. ${worked(c)}.`
  return c.turns ? `${here} The longest turn was ${length(c.longestMs)}.` : here
}

// One line on the hour. A session that sat idle across several hours says the latest one once, not one per hour.
export function hourToast(c: Clock, now: number): { text: string; state: Clock } | undefined {
  const hours = Math.floor((now - c.startedAt) / HOUR)
  if (hours < 1 || hours <= c.hoursSaid) return undefined
  const head = hours === 1 ? 'An hour in.' : `${hours} hours in.`
  const tail = c.turns ? `Claude has worked ${length(c.workMs)} of it.` : 'Claude has not worked yet.'
  return { text: `${head} ${tail}`, state: { ...c, hoursSaid: hours } }
}

export const register: Register = (on, options) => {
  let clock = fresh(Date.now())
  const say = options?.hourToast !== false

  on('session.start', async ($, e, next) => {
    clock = fresh(Date.now())
    await $.command.register({ name: 'clock', description: 'How long this session has run, and how much of it Claude spent working' })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'clock' }, () => ({ text: summary(clock, Date.now()) })).catch(($, e, next) => next(e))

  // Only the main loop: a subagent's turns run inside the main turn and would count the same minutes twice.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) {
      const now = Date.now()
      clock = step(clock, e.durationMs)
      const t = say ? hourToast(clock, now) : undefined
      if (t) {
        clock = t.state
        $.ui.toast(t.text)
      }
    }
    return result
  }).catch(($, e, next) => next(e))
}
