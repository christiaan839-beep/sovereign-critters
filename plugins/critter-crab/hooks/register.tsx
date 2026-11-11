import type { Register } from 'claude-code'

import { CRAB_W, MAX_NOTE, bandLines, cleanNote, cleanNotes, crabRows, crabSvg, dropNote, holdNote, hashOf, labelFor } from './note'
import type { Note, Run } from './note'

const USAGE = 'Usage: /crab [hold <text> | drop]. /crab alone shows the note; hold gives the crab one line of up to 120 characters to carry for this folder.'

const redraw = ($: any) => {
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // a band that cannot redraw waits for the next prompt
  }
}
const saved = async ($: any) => cleanNotes(await $.store.get('notes'))

// The crab holds your place: one note per folder, kept in $.store under a hash of the folder's path, so it
// survives a hot reload and a restart. The module's variables below start over on a reload; session.start fires again and reads them back.
export const register: Register = on => {
  let key: string | undefined // this folder, as a hash
  let sessionAt = 0 // when this session began, to tell "you left this" from "holding"
  let current: Note | undefined
  let unread = false // the store would not read at the start: ask it again before saying there is nothing

  on('session.start', async ($, e, next) => {
    key = undefined // this folder is not known until it hashes
    try {
      key = hashOf(String(e.cwd ?? ''))
      sessionAt = await $.clock.now()
      current = (await saved($))[key]
      unread = false
    } catch {
      current = undefined // a store that will not read is an empty store; the crab never blocks a session
      unread = true
    }
    try {
      await $.command.register({ name: 'crab', description: 'The crab holds your place: /crab hold <text> leaves a note for this folder, /crab drop clears it, /crab shows it. It is there again when you come back.' })
    } catch {
      $.ui.log('crab: /crab is taken by another plugin')
    }
    redraw($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'crab' }, async ($, e) => {
    const args = String(e.args ?? '').trim()
    const sub = args.split(/\s+/)[0] ?? ''
    const rest = args.slice(sub.length)
    try {
      if ((sub === '' || sub === 'drop') && unread && key) {
        try { current = (await saved($))[key]; unread = false; redraw($) } catch { /* the store still will not answer */ }
        if (unread) return { text: 'The crab cannot read its notes just now: the store would not answer. Try again in a moment.' }
      }
      if (sub === '') return { text: current ? `Holding: ${current.text}` : 'The crab is holding nothing for this folder. /crab hold <text> gives it something.' }
      if (sub === 'hold') {
        const text = cleanNote(rest)
        if (!text) return { text: USAGE.replace(/^Usage: \/crab \[hold <text> \| drop\]\./, 'Usage: /crab hold <text>.') }
        if (!key) return { text: 'The crab does not know this folder yet: start a new session in it first.' }
        try {
          const notes = holdNote(await saved($), key, text, await $.clock.now())
          await $.store.set('notes', notes)
          current = notes[key]
        } catch {
          return { text: 'The crab could not keep that note: the store would not take it.' }
        }
        redraw($)
        return { text: `Held: ${text}${[...cleanNote(rest, Infinity)].length > MAX_NOTE ? ` (shortened to ${MAX_NOTE} characters)` : ''}` }
      }
      if (sub === 'drop') {
        if (!current || !key) return { text: 'There is nothing to put down.' }
        try {
          await $.store.set('notes', dropNote(await saved($), key))
        } catch {
          return { text: 'The crab could not put it down: the store would not take that.' }
        }
        current = undefined
        redraw($)
        return { text: 'The crab put it down.' }
      }
      return { text: USAGE }
    } catch {
      return { text: 'The crab dropped something. Try again.' }
    }
  })

  // The band stacks under whatever else draws above the prompt, and draws nothing at all when there is no note.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const base = await next(e)
    try {
      if (e.props.hasSurvey || !current) return base
      const { Box, Text, Svg } = $.ui.resolve(e)
      const cols = Number(e.props.bodyColumns) || 80
      const { line, hint } = bandLines(current, labelFor(current.at, sessionAt), Math.max(8, cols - CRAB_W - 2))
      const vector = e.surface !== 'terminal' && Svg !== undefined
      const art = vector
        ? <Svg source={crabSvg(4).source} width={crabSvg(4).width} height={crabSvg(4).height} alt="A small crab holding a note" />
        : <Box flexDirection="column">{crabRows().map((row: Run[], i: number) => (
            <Text key={`c${i}`}>{row.map((r, j) => <Text key={`c${i}-${j}`} color={r.fg} backgroundColor={r.bg}>{r.text}</Text>)}</Text>
          ))}</Box>
      return (
        <Box flexDirection="column">
          {base}
          <Box flexDirection="row" columnGap={2}>
            {art}
            <Box flexDirection="column" justifyContent="center">
              <Text>{line}</Text>
              <Text dimColor>{hint}</Text>
            </Box>
          </Box>
        </Box>
      )
    } catch {
      return base // a band that cannot be drawn is the engine's own
    }
  }).catch(($, e, next) => next(e))
}
