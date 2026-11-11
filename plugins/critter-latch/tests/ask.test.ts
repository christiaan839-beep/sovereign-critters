import { expect, test } from 'claude-code/testing'
import { unsure } from '../hooks/register'

// A clear stop is a deny. A line the guard could not read is put to the person with an ask: a false alarm then costs one click.

const wired = (on: (event: any, hook: any) => unknown) => {
  on('session.cwd', () => ({ value: '/work/app' }))
  on('env.get', () => ({ value: '/srv/me' }))
  on('tool.call', () => ({ result: 'ran' }))
  on('tool.check', () => ({ decision: 'allow' }))
}

test('what the guard could not read is told apart from what it stopped', () => {
  for (const why of ['rm -r has a target the guard cannot read ($, a backtick or a brace in it), so it waits', 'could not tell which folder this is, so the delete waits', 'eval is given something the guard cannot read, so it waits', 'the line nests shells too deep for the guard to read, so it waits']) expect(unsure(why), why).toBe(true)
  for (const why of ['rm -r reaches outside the folder you opened (/work/app)', 'git reset --hard drops changes you have not committed', 'rm -r would delete the folder you opened (/work/app) or one above it']) expect(unsure(why), why).toBe(false)
})

test('a clear stop is still refused outright', async ($, on) => {
  wired(on)
  const out = await $.tool.call({ tool: 'Bash', command: 'rm -rf ../x' })
  expect(out.text ?? out.deny).toMatch(/^latch: rm -r reaches outside/)
})

test('a line it could not read is not refused outright, and the permission check asks', async ($, on) => {
  wired(on)
  const out = await $.tool.call({ tool: 'Bash', command: 'rm -rf $DIR' })
  expect(out.deny).toBeUndefined()
  const check = await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf $DIR' } })
  expect(check.decision).toBe('ask')
  expect(check.reason).toMatch(/^latch: rm -r has a target the guard cannot read/)
})

test('an ordinary command is neither refused nor asked about', async ($, on) => {
  wired(on)
  const out = await $.tool.call({ tool: 'Bash', command: 'rm -rf dist' })
  expect(out.deny).toBeUndefined()
  const check = await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf dist' } })
  expect(check.decision).toBe('allow')
})
