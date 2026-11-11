import type { ModelUsage, Register } from 'claude-code'

// critter-ledger counts the tokens the API reports for each finished turn and keeps the sums in this session.
// It shows them only when asked (/ledger) and says one thing unasked: that you passed a limit you set yourself.
// It reads no prompt, no file and no tool call, and it sends nothing anywhere.

export type Ledger = {
  input: number // fresh input, not served from the cache
  wrote: number // input the cache stored
  cached: number // input the cache served
  output: number
  turns: number
  biggest: number // the largest single turn, all four counts
  said: boolean // whether the limit has been announced
}

export const fresh = (): Ledger => ({ input: 0, wrote: 0, cached: 0, output: 0, turns: 0, biggest: 0, said: false })

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0)
export const count = (l: Ledger) => l.input + l.wrote + l.cached + l.output

export function take(l: Ledger, usage: Partial<ModelUsage> | undefined | null): Ledger {
  if (!usage) return l
  const input = num(usage.input_tokens)
  const wrote = num(usage.cache_creation_input_tokens)
  const cached = num(usage.cache_read_input_tokens)
  const output = num(usage.output_tokens)
  return { ...l, input: l.input + input, wrote: l.wrote + wrote, cached: l.cached + cached, output: l.output + output, turns: l.turns + 1, biggest: Math.max(l.biggest, input + wrote + cached + output) }
}

// 812, 1.2k, 214k, 1.3m: k and m in lower case, one decimal only where it still says something.
export function size(n: number): string {
  const trim = (v: number, unit: string) => `${v.toFixed(1).replace(/\.0$/, '')}${unit}`
  if (n < 1000) return String(Math.round(n))
  const k = n / 1000
  if (k < 10) return trim(k, 'k')
  if (Math.round(k) < 1000) return `${Math.round(k)}k`
  return trim(n / 1e6, 'm')
}

export function parseLimit(text: string): { ok: true; limit: number | undefined } | { ok: false } {
  const t = text.trim().toLowerCase()
  if (t === 'off') return { ok: true, limit: undefined }
  const m = /^(\d+(?:\.\d+)?)([km]?)$/.exec(t)
  if (!m) return { ok: false }
  const limit = Math.round(Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1))
  return limit > 0 && Number.isSafeInteger(limit) ? { ok: true, limit } : { ok: false }
}

const LIMIT_HINT = 'No limit set (/ledger limit 500k).'

export function report(l: Ledger, limit: number | undefined): string {
  if (!l.turns) return `Nothing counted yet. ${limit ? `You set ${size(limit)}.` : LIMIT_HINT}`
  const head = `${size(count(l))} used: ${size(l.output)} out, ${size(l.input + l.wrote)} in, ${size(l.cached)} read from the cache. The biggest turn was ${size(l.biggest)}.`
  return `${head} ${limit ? `You set ${size(limit)}; you are at ${Math.floor((count(l) / limit) * 100)}%.` : LIMIT_HINT}`
}

export const crossed = (l: Ledger, limit: number | undefined) => limit !== undefined && !l.said && count(l) > limit

export const register: Register = on => {
  let ledger = fresh()
  let limit: number | undefined

  on('session.start', async ($, e, next) => {
    ledger = fresh()
    limit = undefined
    await $.command.register({ name: 'ledger', description: 'Tokens used this session; /ledger limit 500k sets a limit of your own' })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'ledger' }, (_$, e) => {
    const [word, ...rest] = e.args.trim().split(/\s+/)
    if (word?.toLowerCase() !== 'limit') return { text: report(ledger, limit) }
    const parsed = parseLimit(rest.join(' '))
    if (!parsed.ok) return { text: 'A limit looks like 500k, 1.5m or 250000. Say "limit off" to clear it.' }
    limit = parsed.limit
    ledger = { ...ledger, said: false }
    return { text: limit === undefined ? 'Limit cleared.' : `Limit set to ${size(limit)}. I will say so once if you pass it.` }
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    ledger = take(ledger, e.usage)
    if (crossed(ledger, limit)) {
      ledger = { ...ledger, said: true }
      $.ui.toast(`You passed the ${size(limit!)} you set: ${size(count(ledger))} used.`)
    }
    return result
  }).catch(($, e, next) => next(e))
}
