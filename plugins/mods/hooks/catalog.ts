// The control room's pure parts: which mods there are, what each opens, what the plugin manager says, and how a line fits. No engine in here.

export const MARKET = 'sovereign-critters'
export const HUB = 'mods'

export type Open = { label: string; command: string; args: string }
export type Mod = { id: string; line: string; names: string[]; opens: Open[] }
export type Installed = { id: string; version: string; enabled: boolean }
export type State = 'on' | 'off' | 'missing'

/** The eight mods, critter-buddy first. What each opens is a slash command of its own plugin, never a command line. */
export const MODS: Mod[] = [
  { id: 'critter-buddy', names: ['critter', 'buddy'], line: 'Pip the wizard and Biscuit the cat above your prompt, and a sky that keeps the hour.',
    opens: [{ label: 'corner', command: 'critter', args: 'corner' }, { label: 'stage', command: 'critter', args: 'stage' }] },
  { id: 'session-diary', names: ['diary'], line: 'Every tool call, timed; the week at a glance; the session on a postcard.',
    opens: [{ label: 'pane', command: 'diary', args: '' }, { label: 'week', command: 'diary', args: 'week' }, { label: 'postcard', command: 'diary', args: 'postcard' }] },
  { id: 'build-bell', names: ['bell'], line: 'A bell and a toast when a long command or turn finishes.', opens: [] },
  { id: 'guard', names: [], line: 'Stops a force-push or a push to main before Bash runs it.', opens: [] },
  { id: 'stunt', names: [], line: 'The critter painted in a pane, a card for each tool call.', opens: [{ label: 'pane', command: 'stunt', args: '' }] },
  { id: 'crab', names: [], line: 'Holds one note for this folder and has it for you when you come back.', opens: [{ label: 'note', command: 'crab', args: '' }] },
  { id: 'forge', names: [], line: 'A tool that counts text exactly: characters, words, lines, bytes.', opens: [] },
  { id: 'everywhere', names: [], line: 'A pane of your three most-used tools, drawn by each app its own way.', opens: [{ label: 'pane', command: 'everywhere', args: '' }] },
]

/** The look-and-feel dials of the lead mod: each option is one of its own slash commands, fixed here. */
export type Dial = { id: string; label: string; options: { label: string; args: string }[] }
export const DIALS: Dial[] = [
  { id: 'feel', label: 'feel', options: ['calm', 'warm', 'playful', 'still'].map(o => ({ label: o, args: `feel ${o}` })) },
  { id: 'reach', label: 'reach', options: ['lite', 'full', 'party'].map(o => ({ label: o, args: o })) },
  { id: 'pair', label: 'pair', options: [{ label: 'show', args: 'show' }, { label: 'hide', args: 'hide' }] },
  { id: 'sound', label: 'sound', options: [{ label: 'on', args: 'sound on' }, { label: 'off', args: 'sound off' }] },
]

export const idOf = (name: string): string => `${name}@${MARKET}`

/** The mod a typed word names: its id or one of its short names, exactly. Anything else is no mod. */
export const actionFor = (word: string): Mod | undefined => {
  const w = word.trim().toLowerCase()
  return w ? MODS.find(m => m.id === w || m.names.includes(w)) : undefined
}

/** `claude plugin list --json`, read with suspicion: this marketplace's entries only, a bad entry skipped, a bad document empty. */
export const parseList = (stdout: string): Installed[] => {
  let doc: unknown
  try { doc = JSON.parse(stdout) } catch { return [] }
  if (!Array.isArray(doc)) return []
  const out: Installed[] = []
  for (const x of doc) {
    if (typeof x !== 'object' || x === null) continue
    const r = x as Record<string, unknown>
    if (typeof r.id !== 'string' || !r.id.endsWith(`@${MARKET}`) || typeof r.enabled !== 'boolean') continue
    out.push({ id: r.id, version: typeof r.version === 'string' ? r.version : '?', enabled: r.enabled })
  }
  return out
}

export const stateOf = (mod: Mod, list: readonly Installed[]): { state: State; version: string } => {
  const found = list.find(x => x.id === idOf(mod.id))
  return found ? { state: found.enabled ? 'on' : 'off', version: found.version } : { state: 'missing', version: '' }
}

/** A change waits for a restart when what is set now differs from what this session loaded. */
export const restartNeeded = (state: State, wasLoaded: boolean): boolean => (state === 'on') !== wasLoaded

/** The plugin manager's command to flip a mod, from the catalogue's id alone. */
export const toggleArgv = (mod: Mod, state: State): string[] | undefined =>
  state === 'missing' ? undefined : ['claude', 'plugin', state === 'on' ? 'disable' : 'enable', idOf(mod.id), '--scope', 'user']
export const installArgv = (mod: Mod): string[] => ['claude', 'plugin', 'install', idOf(mod.id), '--scope', 'user']

/** Cells a character takes: none for a combining mark, two for a wide one (CJK, emoji), else one. */
const cellOf = (cp: number): number =>
  (cp >= 0x300 && cp <= 0x36f) || (cp >= 0x200b && cp <= 0x200f) || (cp >= 0xfe00 && cp <= 0xfe0f) ? 0
  : (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) ? 2
  : 1
export const cellsOf = (s: string): number => [...s].reduce((n, c) => n + cellOf(c.codePointAt(0)!), 0)
/** A line cut to `width` cells, with an ellipsis as the last cell when it had to be cut. */
export const fit = (s: string, width: number): string => {
  if (width <= 0) return ''
  if (cellsOf(s) <= width) return s
  let out = ''
  let used = 0
  for (const c of s) {
    const w = cellOf(c.codePointAt(0)!)
    if (used + w > width - 1) break
    out += c
    used += w
  }
  return out + '…'
}

export const SYMBOL: Record<State, string> = { on: '●', off: '○', missing: '–' }
/** What a state says in words, with the restart note when the session has not caught up. */
export const statusWord = (state: State, restart: boolean): string =>
  state === 'missing' ? 'not installed' : state === 'on' ? (restart ? 'on, restart to load' : 'on') : restart ? 'off, restart to apply' : 'off'

/** One mod as a plain line: a symbol (not colour) says the state, then the words. */
export const listLine = (mod: Mod, s: { state: State; version: string }, loaded: ReadonlySet<string>, width: number): string =>
  fit(`${SYMBOL[s.state]} ${mod.id.padEnd(13)} ${s.version.padEnd(6)} ${statusWord(s.state, restartNeeded(s.state, loaded.has(mod.id)))}`.replace(/ +$/, ''), width)
