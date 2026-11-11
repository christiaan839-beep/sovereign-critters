import type { Register } from 'claude-code'

// A command shorter than this stays quiet: the bell is for the ones you looked away from.
const DEFAULT_MIN_SECONDS = 20
// A turn shorter than this makes no sound at all: a one-second answer does not need announcing.
const TICK_FROM_SECONDS = 5

/** The line the toast shows: how long it ran and whether it failed. Pure, so it can be tested on its own. */
export const bellLine = (ms: number, failed: boolean): string => {
  const s = Math.round(ms / 1000)
  const span = s >= 60 ? `${Math.floor(s / 60)} min ${s % 60 === 0 ? '' : `${s % 60} s`}`.trim() : `${s} s`
  return failed ? `The command failed after ${span}` : `The command finished in ${span}`
}

/** The line for a turn that ran long: what Claude did takes the place of "the command". */
export const turnLine = (ms: number): string => bellLine(ms, false).replace('The command finished in', 'Claude finished after')

/** The sound is started and left: a player that is slow, missing or stuck never holds up the command's result or the end of the turn. */
const ring = ($: any, asset: string, gain: number): void => {
  try {
    void Promise.resolve($.audio.play({ asset }, { gain })).catch(() => undefined)
  } catch {
    // no player
  }
}

/** The toast is shown and left: a toaster that rejects is no business of the command or the turn. */
const toast = ($: any, text: string): void => {
  try {
    void Promise.resolve($.ui.toast(text, { timeoutMs: 6000 })).catch(() => undefined)
  } catch {
    // no toaster
  }
}

export const register: Register = (on, options) => {
  const asked = Number(options.minSeconds)
  const minSeconds = Number.isFinite(asked) && asked > 0 ? asked : DEFAULT_MIN_SECONDS
  const withSound = options.sound !== false
  const withTick = options.shortTurns !== false

  // A turn that ran long rings too: you looked away from the whole of it, not only from one command.
  let turnStart = 0
  let commandRang = 0 // when a command's bell last rang in this turn: the turn's own bell would say the same thing twice
  on('prompt.submit', async ($, e, next) => {
    try { turnStart = await $.clock.now(); commandRang = 0 } catch { /* never hold up a prompt */ }
    return next(e)
  }).catch(($, e, next) => next(e))
  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e) // a subagent's answer is its own turn.complete: it is not the end of the person's turn
    try {
      const now = await $.clock.now()
      const took = turnStart ? now - turnStart : 0
      const announced = commandRang > 0 && now - commandRang < minSeconds * 1000 // a command's bell rang just before the turn ended
      turnStart = 0
      commandRang = 0
      if (took >= minSeconds * 1000) {
        if (!announced) {
          toast($, turnLine(took))
          if (withSound) ring($, 'sounds/bell.wav', 0.6)
        }
      } else if (took >= TICK_FROM_SECONDS * 1000 && withSound && withTick) {
        ring($, 'sounds/tick.wav', 0.5) // a short turn: a soft tick, no toast
      }
    } catch {
      // a bell that cannot ring never holds up the end of a turn
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    // The clock is asked now and awaited with the tool's answer, so reading it never delays the tool.
    const begun = Promise.resolve($.clock.now())
    begun.catch(() => undefined)
    const ran = await next(e)
    try {
      const ended = await $.clock.now()
      const took = ended - (await begun)
      if (took >= minSeconds * 1000 && ran.deny === undefined) {
        commandRang = ended
        toast($, bellLine(took, ran.isError === true))
        if (withSound) ring($, 'sounds/bell.wav', 0.6)
      }
    } catch {
      // a bell that cannot ring (no player, no clock) never holds up the command
    }
    return ran
  }).catch(($, e, next) => next(e))
}
