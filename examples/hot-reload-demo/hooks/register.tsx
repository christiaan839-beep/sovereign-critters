import { atom, read, update } from 'claude-code'
import type { PluginState, Register } from 'claude-code'

// The state's shape, written once in the contract (types/index.d.ts).
type Demo = PluginState['hot-reload-demo']

// The counter: a value the host holds for the session. A reload never touches it.
const prompts = atom({ plugin: 'hot-reload-demo', key: 'prompts' } as const,
  0 as Demo['prompts'])

export const register: Register = on => {
  // The shell: the module's own variable. Save this file and the module loads again, so it starts over.
  let loadedAt = 'just now'

  // session.start fires again on every reload: the new shell notes when it was put on, in UTC, labelled, whatever the host's zone.
  // A module variable is not $.state, so writing it redraws nothing: the band is asked to redraw.
  on('session.start', async ($, e, next) => {
    loadedAt = `${new Date(await $.clock.now()).toISOString().slice(11, 19)} UTC`
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // A prompt counts once it has entered the session: one a hook beneath drops never did.
  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)
    if (entered.drop === undefined) await update($, prompts, n => n + 1)
    return entered
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const n = await read($, prompts)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor>module's own: loaded {loadedAt} · </Text>
        <Text color="#d97757">
          $.state: {n} prompt{n === 1 ? '' : 's'} this session
        </Text>
      </Box>
    )
  })
}
