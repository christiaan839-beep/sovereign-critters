import { expect, mock, test } from 'claude-code/testing'

import { looksSecret } from '../hooks/note'

// A note is carried in plain text and drawn above the prompt, so the crab will not carry a key.

const AWS = 'AKIA' + 'ABCDEFGHIJKLMNOP'
const GH = 'ghp_' + 'a'.repeat(36)
const SK = 'sk-' + 'b'.repeat(32)
const PEM = '-----BEGIN ' + 'RSA PRIVATE KEY-----'
const JWT = 'eyJhbGciOiJIUzI1NiJ9' + '.' + 'eyJzdWIiOiIxMjM0NTY3ODkwIn0' + '.' + 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'

test('a key, a token or a private key block is recognised, and an ordinary note is not', () => {
  for (const t of [`use ${AWS} for staging`, `token ${GH}`, `key=${SK}`, PEM, `bearer ${JWT}`, 'password: ' + 'hunter2hunter2', 'API_KEY=abc123def456']) expect(looksSecret(t), t).toBe(true)
  for (const t of ['fix the login redirect', 'ask Sam about the token refresh bug', 'the password reset email is late', 'rotate the key next week', 'sk-learn is in the requirements']) expect(looksSecret(t), t).toBe(false)
})

const keep = (on: (...a: never[]) => void) => {
  const store: Record<string, unknown> = {}
  ;(on as any)('store.get', (_: unknown, e: { key: string }) => ({ value: store[e.key] }))
  ;(on as any)('store.set', (_: unknown, e: { key: string; value: unknown }) => { store[e.key] = e.value; return { value: undefined } })
  ;(on as any)('command.register', () => ({ value: { command: 'crab' } }))
  ;(on as any)('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  return store
}
const run = ($: any, args: string) => $.command.run({ command: 'crab', args, origin: { kind: 'composer' }, presentation: {} }).then((r: { text?: string }) => r.text ?? '')

test('/crab hold refuses a note that looks like a key, says why, never repeats it, and stores nothing', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 10, 8, 12, 0, 0) })
  const store = keep(on)
  await $.session.start({ cwd: '/work/atlas', surface: 'terminal', isInteractive: true })
  const said = await run($, `hold prod key is ${AWS}`)
  expect(said).toBe('The crab will not carry that: it looks like a key or a token. Leave the secret out and hold the rest.')
  expect(said).not.toContain(AWS)
  expect(store.notes).toBeUndefined()
  expect(await run($, 'hold ask Sam about the token refresh')).toMatch(/^Held: ask Sam about the token refresh/)
})
