// The crab's pure parts: the folder hash, the note, the store, the width of a line, and the crab itself. No engine in here.

export type Note = { text: string; at: number }
export type Notes = Record<string, Note>
export type Run = { text: string; fg?: string; bg?: string }

export const MAX_NOTE = 120 // characters in a note
export const MAX_NOTES = 50 // folders remembered; the oldest let go

/** A folder is remembered by a short hash of its path, so the store holds no path and no name. FNV-1a, base 36. */
export const hashOf = (s: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(36)
}

/** One clean line: colour codes and control characters gone, runs of space folded, cut at `cap` characters (never mid-character). */
// Whether a note looks like a key or a token: a note is kept as plain text and drawn above the prompt, so the crab will not carry one.
const SECRETS = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/,
  /\bglpat-[A-Za-z0-9_-]{20,}/,
  /\bsk-(?=[A-Za-z0-9_-]*[A-Za-z0-9]{20})[A-Za-z0-9_-]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bnpm_[A-Za-z0-9]{36}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/,
  /\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S{8,}/i,
]
export const looksSecret = (text: string): boolean => SECRETS.some(re => re.test(text))

export const cleanNote = (raw: unknown, cap = MAX_NOTE): string => {
  if (typeof raw !== 'string') return ''
  const flat = raw
    .replace(/\u001b\[[0-9;?]*[\x20-\x2f]*[@-~]/g, '') // a colour code cannot paint the band
    .replace(/\u001b[@-_]/g, '')
    .replace(/[\n\r\t\u2028\u2029]/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '') // direction controls cannot reverse the band's text
    .replace(/\s+/g, ' ')
    .trim()
  return [...flat].slice(0, cap).join('').trimEnd()
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const newest = (notes: Notes): Notes =>
  Object.fromEntries(Object.entries(notes).sort((a, b) => b[1].at - a[1].at || (a[0] < b[0] ? -1 : 1)).slice(0, MAX_NOTES))

/** What the store holds, read with suspicion: a bad entry is dropped, a bad store is empty, fifty folders at most. */
export const cleanNotes = (raw: unknown): Notes => {
  if (!isObj(raw)) return {}
  const out: Notes = {}
  for (const [key, v] of Object.entries(raw)) {
    if (!isObj(v) || typeof v.at !== 'number' || !Number.isFinite(v.at) || v.at < 0) continue
    const text = cleanNote(v.text)
    if (text) out[key] = { text, at: v.at }
  }
  return newest(out)
}

export const holdNote = (notes: Notes, key: string, text: string, at: number): Notes => {
  const clean = cleanNote(text)
  return clean ? newest({ ...notes, [key]: { text: clean, at } }) : notes
}
export const dropNote = (notes: Notes, key: string): Notes => {
  const { [key]: _gone, ...rest } = notes
  return rest
}

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

/** "holding:" for a note held since this session began; for one from an earlier session, "you left this:" and its age in whole days,
 * so an old note is not mistaken for a fresh one. */
export const labelFor = (noteAt: number, sessionAt: number): string => {
  if (noteAt >= sessionAt) return 'holding:'
  const days = Math.floor((sessionAt - noteAt) / 86_400_000)
  return days < 1 ? 'you left this:' : days === 1 ? 'you left this yesterday:' : `you left this ${days} days ago:`
}

export const HINT = '/crab drop when it is done'
/** The two lines beside the crab, each cut to the width it is given. */
export const bandLines = (note: Note, label: string, width: number): { line: string; hint: string } => ({
  line: fit(`${label} ${note.text}`, width),
  hint: fit(HINT, width),
})

// ---- the crab: our own drawing, in the pair's clay, a paper held up in one claw -----------------------
const PX = [
  '.WW.....C.C.',
  'CCC.....CCC.',
  '.CHCCCCCCCD.',
  '..CKCCCCKC..',
  '..CCCCCCCD..',
  '.C.C.CC.C.C.',
]
const COLOUR: Record<string, string> = { C: '#d97757', D: '#b9573a', H: '#ec9b78', K: '#141413', W: '#faf9f5' }
export const CRAB_W = 12

/** Three text rows of half blocks: two pixel rows to a row, the upper in the foreground, the lower in the background. */
export const crabRows = (): Run[][] => {
  const rows: Run[][] = []
  for (let y = 0; y < PX.length; y += 2) {
    const row: Run[] = []
    for (let x = 0; x < CRAB_W; x++) {
      const top = COLOUR[PX[y]![x]!]
      const bot = COLOUR[PX[y + 1]![x]!]
      const cell: Run = !top && !bot ? { text: ' ' } : top && !bot ? { text: '▀', fg: top } : !top && bot ? { text: '▄', fg: bot } : top === bot ? { text: '█', fg: top } : { text: '▀', fg: top, bg: bot }
      const last = row[row.length - 1]
      if (last && last.text === cell.text && last.fg === cell.fg && last.bg === cell.bg) last.text += cell.text
      else row.push(cell)
    }
    rows.push(row)
  }
  return rows
}

/** The same pixels as a picture, for the desktop: one rect per pixel, no glyph, no font. */
export const crabSvg = (px = 4): { source: string; width: number; height: number } => {
  const rects: string[] = []
  PX.forEach((row, y) => [...row].forEach((k, x) => { if (COLOUR[k]) rects.push(`<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" fill="${COLOUR[k]}"/>`) }))
  const width = CRAB_W * px
  const height = PX.length * px
  return { source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rects.join('')}</svg>`, width, height }
}
