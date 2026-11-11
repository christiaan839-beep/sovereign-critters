import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginState, Register } from 'claude-code'

// The state's shape, written once in the contract (types/index.d.ts).
type Everywhere = PluginState['critter-tally']

const PANE = 'everywhere'
const tally = atom({ plugin: 'critter-tally', key: 'tally' } as const, {} as Everywhere['tally'])

// The three tools called most, the most called first: the words name them, and the bars draw them in that order.
function top(counts: Readonly<Record<string, number>>): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
}

// The three tools called most, as words: "Read 12 · Bash 7 · Edit 4".
export function summary(counts: Readonly<Record<string, number>>): string {
  const most = top(counts)
  return most.length ? most.map(([tool, n]) => `${tool} ${n}`).join(' · ') : 'no tool calls yet'
}

// A bar for each of those three, in the order the words name them, as block characters: the terminal's extra,
// one Raster row. A tool called at all gets at least ▁, never a blank cell.
function bars(counts: Readonly<Record<string, number>>): { cells: string; columns: number } {
  const ns = top(counts).map(([, n]) => n), max = Math.max(1, ...ns), steps = ' ▁▂▃▄▅▆▇█'
  const words = new Uint32Array(Math.max(1, ns.length) * 3)
  ns.forEach((n, i) => {
    words[i * 3] = steps.codePointAt(Math.max(1, Math.round((n / max) * 8)))!
    words[i * 3 + 1] = 0xd97757
    words[i * 3 + 2] = 0x01000000
  })
  if (!ns.length) words.set([0x20, 0x01000000, 0x01000000])
  let bin = ''
  for (const b of new Uint8Array(words.buffer)) bin += String.fromCharCode(b)
  return { cells: btoa(bin), columns: Math.max(1, ns.length) }
}

// Whether an app draws the pane now: the engine's record says it is placed, and the session draws in a terminal or
// the Desktop app, the two that draw a mod's panes (claude -p places every pane it opens and draws none).
async function drawn($: EngineInterface): Promise<boolean> {
  const placed = (await $.ui.panes()).some(pane => pane.id === PANE && pane.isPlaced)
  return placed && (await $.session.surfaces()).some(surface => surface === 'terminal' || surface === 'desktop')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'everywhere', description: 'Opens a pane of the tools this session called most' })
    return next(e)
  }).catch(($, e, next) => next(e))

  // One pane for the session, drawn wherever the app draws a mod's panes: the terminal and the Desktop app. Where
  // no app draws it (the VS Code chat panel, claude -p), the answer is the tally in words.
  on('command.run', { command: 'everywhere' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Tool calls' })
    if (await drawn($)) return { text: 'The tally is open.' }
    return { text: `Nothing here draws the pane, so the tally comes as words: ${summary(await read($, tally))}.` }
  })

  on('tool.call', async ($, e, next) => {
    await update($, tally, t => ({ ...t, [e.tool]: (t[e.tool] ?? 0) + 1 }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // One hook draws the pane for each app; each app's table supplies its own Box, Text and Button.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const counts = await read($, tally)
    // Hide closes the session's pane; the count stays in $.state for the next /everywhere.
    const hide = () => $.ui.close({ id: PANE })
    if (e.surface === 'terminal') {
      const { Box, Button, Raster, Text } = $.ui.resolve(e)
      const { cells, columns } = bars(counts)
      return (
        <Box gap={1}>
          <Raster key="bars" columns={columns} rows={1} cells={cells} />
          <Text dimColor>{summary(counts)}</Text>
          <Button key="hide" label="Hide" onPress={hide} />
        </Box>
      )
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box gap={1}>
        <Text dimColor>{summary(counts)}</Text>
        <Button key="hide" label="Hide" onPress={hide} />
      </Box>
    )
  })
}
