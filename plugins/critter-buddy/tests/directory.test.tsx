import { expect, test } from 'claude-code/testing'

import { register } from '../hooks/register'

// The plugin directory reads how a hooks module is written, not what it does. These pin what its validation flagged, so a later edit cannot bring it back.
// (The rule on JSX names, which needs the source text, is tools/check-directory.py, run by tools/preflight.sh.)

test('every hook is registered under an event the directory knows', () => {
  const known = new Set(['tool.call', 'tool.check', 'turn.step', 'turn.complete', 'prompt.submit', 'prompt.edit', 'session.start', 'session.end', 'command.run', 'ui.render'])
  const events: string[] = []
  register(((name: string) => { events.push(name); return { catch: () => undefined } }) as never, {} as never)
  expect(events.length).toBeGreaterThan(10)
  expect([...new Set(events)].filter(e => !known.has(e))).toEqual([])
})
