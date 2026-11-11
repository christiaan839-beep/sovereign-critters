import { expect, test } from 'claude-code/testing'
import { judge, unsure } from '../hooks/register'

const ROOT = '/work/app'
const stop = (c: string) => judge(c, ROOT, '/srv/me')

// Seen live on 2026-11-11: `cd <a temp folder> && rm -rf dist` ran. The guard had read the cd and knew the folder was
// outside, but called the target "unreadable", which is only asked about, and the ask never reached the person.
test('a cd the guard can read to a folder outside is a clear stop, not a question', async ($, on) => {
  on('session.cwd', () => ({ value: ROOT }))
  on('env.get', () => ({ value: '/srv/me' }))
  on('tool.call', () => ({ result: 'ran' }))
  on('tool.check', () => ({ decision: 'allow' }))
  for (const command of ['cd /private/tmp/check && rm -rf dist', 'cd /tmp && rm -rf x', 'cd .. && rm -rf x', 'cd build/../.. && rm -rf x', 'pushd /tmp && rm -rf x', 'cd /tmp && find . -name x -exec rm -rf {} +']) {
    const why = stop(command)
    expect(why, command).toMatch(/^rm -r reaches outside the folder you opened \(\/work\/app\)$/)
    expect(unsure(why!), command).toBe(false)
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.text ?? out.deny, command).toMatch(/^latch: rm -r reaches outside/)
  }
})

test('a cd out and back in is followed, and a cd nobody can read is still a question', () => {
  expect(stop('cd /tmp && cd /work/app && rm -rf dist')).toBeUndefined()
  expect(stop('cd /tmp && cd /work/app/build && rm -rf cache')).toBeUndefined()
  expect(stop('cd /tmp && ls')).toBeUndefined()
  for (const command of ['cd $D && rm -rf x', 'cd ~/x && rm -rf y', 'cd - && rm -rf x']) expect(unsure(stop(command)!), command).toBe(true)
})
