import { atom, read, update } from 'claude-code'
import type { PluginState, Register, Timer } from 'claude-code'

// The state's shape, written once in the contract (types/index.d.ts).
type Stunt = PluginState['critter-stunt']

const PANE = 'stunt'
// The strip keeps the last 40 tool calls; the total counts every one.
const calls = atom({ plugin: 'critter-stunt', key: 'calls' } as const, [] as Stunt['calls'])
const total = atom({ plugin: 'critter-stunt', key: 'total' } as const, 0 as Stunt['total'])

// The stand: 40 cards across, 13 rows. The critter takes rows 1-10 at twice its sprite's size; row 12 holds the strip of calls.
const COLUMNS = 40
const ROWS = 13
const CLAWD = ['...XXXXXXXXXXXX...', '...XXEXXXXXXEXX...', '.XXXXXXXXXXXXXXXX.', '...XXXXXXXXXXXX...', '....X.X....X.X....']
const STAND = 0x2f4f72, CLAY = 0xd97757, INK = 0x141413, PAPER = 0xfaf9f5
const CARD = '█'.codePointAt(0)!
const TOOL_COLORS: Record<string, number> = { Read: 0x6a9bcc, Edit: 0xd97757, Write: 0xd97757, Bash: 0x788c5d, Grep: 0xb0aea5, Glob: 0xb0aea5 }

// The colour each card shows: the critter, its eyes (shut on a blink), the stand behind it, and the strip of tool calls.
function card(column: number, row: number, history: readonly string[], isBlinking: boolean): number {
  if (row >= 1 && row <= 10 && column >= 2 && column < 38) {
    const cell = CLAWD[Math.floor((row - 1) / 2)]?.[Math.floor((column - 2) / 2)]
    if (cell === 'X') return CLAY
    if (cell === 'E') return isBlinking ? CLAY : INK
  }
  if (row === 12) {
    const tool = history[history.length - COLUMNS + column]
    if (tool !== undefined) return TOOL_COLORS[tool] ?? PAPER
  }
  return STAND
}

// Every cell as the Raster takes it: little-endian u32 triplets [codePoint, foreground, background], base64.
export function paint(history: readonly string[], isBlinking = false): string {
  const words = new Uint32Array(COLUMNS * ROWS * 3)
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const i = (row * COLUMNS + column) * 3
      words[i] = CARD
      words[i + 1] = card(column, row, history, isBlinking)
      words[i + 2] = 0x01000000
    }
  }
  let bin = ''
  for (const b of new Uint8Array(words.buffer)) bin += String.fromCharCode(b)
  return btoa(bin)
}

// The count in words: every call, and how many of them the strip shows.
function counted(n: number): string {
  const cards = n > COLUMNS ? `a card for each of the last ${COLUMNS}` : 'a card each'
  return `${n} tool call${n === 1 ? '' : 's'}: ${cards}`
}

export const register: Register = on => {
  // The blink: a timer, and the flip it runs, which the session's start sets up. The timer runs only while the stand
  // is drawn in a terminal, the one app with a Raster to blit (a blit anywhere else is refused): /stunt starts it
  // there and closing the pane stops it. A reload drops the module's timers, so session.start starts it again when
  // the stand is still up.
  let blink: Timer | undefined
  let reopen: Timer | undefined // the 160 ms follow-up that opens the eyes again: it must not outlive the pane
  let flip = async (_isBlinking: boolean): Promise<boolean> => false

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'stunt', description: 'Opens the card stunt: the critter, painted in the terminal, a card for each of the last 40 tool calls' })
    // Every four seconds the crowd flips the eye cards and back: a blit repaints the mounted Raster, no render pass.
    // Each flip paints the strip as it stands then, so a call that lands mid-blink keeps its card.
    // It answers whether it painted: false when the pane is gone (the blink stops) or the painter failed (nothing is raised).
    flip = async (isBlinking: boolean): Promise<boolean> => {
      try {
        if (!(await $.ui.panes()).some(pane => pane.id === PANE)) { blink?.cancel(); blink = undefined; reopen?.cancel(); reopen = undefined; return false } // the pane is gone: stop
        const cells = paint(await read($, calls), isBlinking)
        await $.ui.blit({ requestId: PANE, key: 'stand', cells })
        return true
      } catch {
        return false
      }
    }
    const stand = (await $.ui.panes()).find(pane => pane.id === PANE)
    if (!stand?.isPlaced || !(await $.session.surfaces()).includes('terminal')) return next(e)
    blink?.cancel()
    blink = $.clock.every(4000, async () => {
      if (!(await flip(true)) || !blink) return
      reopen?.cancel()
      reopen = $.clock.after(160, () => void flip(false))
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  // /stunt asks for a pane as wide and as tall as the stand and the line under it (a request: the person's own
  // sizing wins). Its answer says what the person sees: the words alone where no app draws a mod's pane (the VS
  // Code chat panel, claude -p), the count in words in the Desktop app, and the stand in a terminal.
  on('command.run', { command: 'stunt' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Card stunt', columns: COLUMNS, rows: ROWS + 1 })
    const where = await $.session.surfaces()
    if (!opened.isPlaced || !where.some(surface => surface === 'terminal' || surface === 'desktop')) {
      const n = await read($, total)
      return { text: `Nothing here draws the stand; the card stunt plays in the terminal. ${n} tool call${n === 1 ? '' : 's'} so far.` }
    }
    if (!where.includes('terminal')) return { text: 'The pane is up. The card stunt plays in the terminal; here the pane shows the count in words.' }
    blink?.cancel()
    blink = $.clock.every(4000, async () => {
      if (!(await flip(true)) || !blink) return
      reopen?.cancel()
      reopen = $.clock.after(160, () => void flip(false))
    })
    return { text: 'The stand is up.' }
  })

  // Closing the pane ends the blink.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    const closed = await next(e)
    blink?.cancel()
    blink = undefined
    reopen?.cancel()
    reopen = undefined
    return closed
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    // Counted after the tool and not waited for: a state that is slow or stuck must not hold up a result.
    void Promise.all([update($, calls, list => [...list, e.tool].slice(-COLUMNS)), update($, total, n => n + 1)]).catch(() => undefined) // independent atoms: written together
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const history = await read($, calls)
    const said = counted(await read($, total))
    if (e.surface === 'terminal') {
      const { Box, Raster, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Raster key="stand" columns={COLUMNS} rows={ROWS}
            cells={paint(history)} />
          <Text dimColor>{said}</Text>
        </Box>
      )
    }
    // Only the terminal draws a Raster; the Desktop app gets the count in words (per the docs, nothing else draws a pane).
    const { Text } = $.ui.resolve(e)
    return <Text>The card stunt plays in the terminal. {said}.</Text>
  })
}
