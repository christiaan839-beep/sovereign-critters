import type { Register } from 'claude-code'

// A command shorter than this stays quiet: the bell is for the ones you looked away from.
const DEFAULT_MIN_SECONDS = 20

/** The line the toast shows: how long it ran and whether it failed. Pure, so it can be tested on its own. */
export const bellLine = (ms: number, failed: boolean): string => {
  const s = Math.round(ms / 1000)
  const span = s >= 60 ? `${Math.floor(s / 60)} min ${s % 60 === 0 ? '' : `${s % 60} s`}`.trim() : `${s} s`
  return failed ? `The command failed after ${span}` : `The command finished in ${span}`
}

export const register: Register = (on, options) => {
  const minSeconds = typeof options.minSeconds === 'number' && options.minSeconds > 0 ? options.minSeconds : DEFAULT_MIN_SECONDS
  const withSound = options.sound !== false

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const started = await $.clock.now()
    const ran = await next(e)
    try {
      const took = (await $.clock.now()) - started
      if (took >= minSeconds * 1000 && ran.deny === undefined) {
        $.ui.toast(bellLine(took, ran.isError === true), { timeoutMs: 6000 })
        if (withSound) await $.audio.play({ asset: 'sounds/bell.wav' }, { gain: 0.6 })
      }
    } catch {
      // a bell that cannot ring (no player, no clock) never holds up the command
    }
    return ran
  }).catch(($, e, next) => next(e))
}
