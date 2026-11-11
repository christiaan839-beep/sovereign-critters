// The control room's pure parts: which mods there are, what each opens, what the plugin manager says, and how a line fits. No engine in here.

export const MARKET = 'sovereign-critters'
export const HUB = 'mods'

export type Open = { label: string; command: string; args: string }
export type Mod = { id: string; line: string; names: string[]; opens: Open[] }
export type Installed = { id: string; version: string; enabled: boolean; installPath?: string }
export type State = 'on' | 'off' | 'missing'

// Each `line` below is a plain one-liner in my words, standing in until the founder's own: replace them here and nowhere else.
/** The eight mods, critter-buddy first. What each opens is a slash command of its own plugin, never a command line. */
export const MODS: Mod[] = [
  { id: 'critter-buddy', names: ['critter', 'buddy'], line: 'A wizard and a cat live above your prompt and react to what Claude does.',
    opens: [{ label: 'corner', command: 'critter', args: 'corner' }, { label: 'stage', command: 'critter', args: 'stage' }] },
  { id: 'session-diary', names: ['diary'], line: 'Keeps a diary of everything Claude did, so you can look back at your day.',
    opens: [{ label: 'pane', command: 'diary', args: '' }, { label: 'week', command: 'diary', args: 'week' }, { label: 'postcard', command: 'diary', args: 'postcard' }] },
  { id: 'build-bell', names: ['bell'], line: 'Rings a bell when something long finishes, so you can look away.', opens: [] },
  { id: 'guard', names: [], line: 'Stops Claude pushing code in a risky way before it happens.', opens: [] },
  { id: 'stunt', names: [], line: 'Draws the critter big, with a little card for each thing Claude does.', opens: [{ label: 'pane', command: 'stunt', args: '' }] },
  { id: 'crab', names: [], line: 'A small crab that remembers one note for each folder you work in.', opens: [{ label: 'note', command: 'crab', args: '' }] },
  { id: 'forge', names: [], line: 'Lets Claude count words, letters and lines exactly instead of guessing.', opens: [] },
  { id: 'everywhere', names: [], line: 'Shows your three most-used tools in a little window on the side.', opens: [{ label: 'pane', command: 'everywhere', args: '' }] },
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

/** Four states, four words. A mod that is on is on duty if it was used in the last seven days and awake if not; one that is off naps; one that is not installed is on leave. */
export type Tier = 'duty' | 'awake' | 'napping' | 'leave'
export const TIERS: Tier[] = ['duty', 'awake', 'napping', 'leave']
export const STAMP_WORD: Record<Tier, string> = { duty: 'ON DUTY', awake: 'AWAKE', napping: 'NAPPING', leave: 'ON LEAVE' }

/**
 * Which of the four a mod is in. `used` is whether it was used in the last seven days, if anything can say: the plugin manager gives no
 * such signal and nothing here counts use, so without one the lead mod that is on is on duty and every other that is on is awake.
 */
export const tierOf = (mod: Mod, state: State, used?: boolean): Tier =>
  state === 'missing' ? 'leave' : state === 'off' ? 'napping' : (used ?? mod.id === 'critter-buddy') ? 'duty' : 'awake'

/** The lead mod first, whatever its state; then the tiers in order, each alphabetical by the name on its card; an empty tier is left out. */
export const orderMods = (states: Record<string, State>, used: Record<string, boolean> = {}): { hero: Mod; groups: { tier: Tier; mods: Mod[] }[] } => {
  const hero = MODS[0]!
  const rest = MODS.slice(1).sort((a, b) => (titleOf(a.id) < titleOf(b.id) ? -1 : titleOf(a.id) > titleOf(b.id) ? 1 : 0))
  const groups = TIERS.map(tier => ({ tier, mods: rest.filter(m => tierOf(m, states[m.id] ?? 'missing', used[m.id]) === tier) })).filter(g => g.mods.length > 0)
  return { hero, groups }
}

/** The name on a card: the id with dashes turned to spaces, in title case. */
export const titleOf = (id: string): string => id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** What to do to start using each mod, two or three short steps. Replace any of them here; a mod with none gets the default two. */
export const DEFAULT_STEPS = ['Switch it on here, then start a new session.', 'Type / in the chat box to see its commands.']
export const STEPS: Record<string, string[]> = {
  'critter-buddy': ['Switch it on here, then start a new session.', 'Type /critter to see what you can do.', 'Press pet, feed or the corner above the prompt.'],
  'session-diary': ['Switch it on here, then start a new session.', 'Work as usual, then type /diary.', 'Type /diary week to see the whole week.'],
  'build-bell': ['Switch it on here, then start a new session.', 'Run something slow and look away: it rings when done.'],
  guard: ['Switch it on here, then start a new session.', 'Nothing else to do: it works in the background.'],
  stunt: ['Switch it on here, then start a new session.', 'Type /stunt to open it.'],
  crab: ['Switch it on here, then start a new session.', 'Type /crab hold and a note to leave one.', 'Come back to the folder later: the crab has it.'],
  forge: ['Switch it on here, then start a new session.', 'Ask Claude to count a text exactly.'],
  everywhere: ['Switch it on here, then start a new session.', 'Type /everywhere to open it.'],
}

/** What a mod's own CHANGELOG says at the top: its newest heading and that entry's first two bullets, cleaned and cut. Release notes, not file times. */
export type Notes = { heading: string; bullets: string[] }
export const parseTopEntry = (md: string): Notes | undefined => {
  const rows = md.split('\n')
  const i = rows.findIndex(r => /^## /.test(r))
  if (i < 0) return undefined
  const bullets: string[] = []
  for (const r of rows.slice(i + 1)) {
    if (/^## /.test(r)) break
    const m = /^- (.*)$/.exec(r)
    if (!m || bullets.length >= 2) continue
    const clean = m[1]!.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim()
    bullets.push([...clean].length > 110 ? [...clean].slice(0, 109).join('') + '…' : clean)
  }
  return { heading: rows[i]!.slice(3).trim(), bullets }
}

/** An install path is trusted only as this marketplace's cache folder for that mod; it is then read with `head`, never a shell. */
export const safeInstallPath = (p: unknown, id: string): string | undefined =>
  typeof p === 'string' && !p.includes('..') && new RegExp(`^/[^\\0\\n\\r]*/plugins/cache/${MARKET}/${id}/[0-9][0-9A-Za-z.+-]*$`).test(p) ? p : undefined

/** Text wrapped at `width` characters on spaces; a word longer than the line is broken. */
export const wrap = (text: string, width: number): string[] => {
  const out: string[] = []
  let line = ''
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (line) { out.push(line); line = '' }
      out.push(word.slice(0, width)); word = word.slice(width)
    }
    if (!line) line = word
    else if (line.length + 1 + word.length <= width) line += ' ' + word
    else { out.push(line); line = word }
  }
  out.push(line)
  return out
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
    const path = safeInstallPath(r.installPath, r.id.slice(0, r.id.indexOf('@')))
    out.push({ id: r.id, version: typeof r.version === 'string' ? r.version : '?', enabled: r.enabled, ...(path ? { installPath: path } : {}) })
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
