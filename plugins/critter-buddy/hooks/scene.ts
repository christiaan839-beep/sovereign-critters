import type { CatMode, CatVariant, Fx, Look, Scene } from '../types'

export type Run = { text: string; fg?: string; bg?: string }
export type Reaction = 'error' | 'test' | 'commit' | 'turn' | 'ask' | 'deny' | 'pet' | 'treat' | 'nap' | 'spell'

export const H = 32 // pixel rows: the 30-pixel cat and the 30-row wizard with his bolt, and a one-pixel outline above and below

const BASE: Record<string, string> = {
  L: '#b7a8ea', M: '#6a58a6',
  C: '#d97757', D: '#b9573a', K: '#141413', P: '#8f7cc4', N: '#3d2f6e', G: '#d4a548', T: '#4fa39a',
  W: '#faf9f5', B: '#8a5a3c', H: '#ec9b78', X: '#5b2a1b', Z: '#2a2250', R: '#e86f8a',
  // the critter of the site: clay in three tones lit from the upper left, the founders' purple hat, the staff and its orb, the lightning
  '1': '#ee9d7f', '2': '#d97757', '3': '#b9573a', '4': '#8e3b25', '5': '#5c2414', '6': '#141413', '7': '#fff4ea',
  '8': '#5d3f9e', '9': '#3d2575', a: '#22134a', e: '#d4a548', f: '#a87d2a', g: '#6a4527', h: '#8a6038', i: '#c99a4a',
  q: '#3a3a42', c: '#6b5a48', p: '#3f3328', z: '#cfe3ee', Y: '#cbc2ad', j: '#c9a8ff', k: '#6a34d6', l: '#3d1a99', m: '#ffe9a8', r: '#c9a8ff', t: '#efe6ff', u: '#2a1066', v: '#ffffff',
}
const COATS: Record<string, Record<string, string>> = {
  orange: { o: '#e07b4a', d: '#b9573a', s: '#7a2f18', b: '#faf3e6', y: '#d4a548', n: '#e8a0a0', x: '#4a1f10' },
  ink: { o: '#d97757', s: '#141413', b: '#faf9f5', y: '#d4a548', n: '#e8a0a0', x: '#3a1d12' },
  brown: { o: '#9a7650', s: '#3a2a1f', b: '#e8d9b8', y: '#8fb35a', n: '#d98c8c', x: '#241a12' },
  tabby: { o: '#b8864f', s: '#5a3c22', b: '#ead7b2', y: '#d4a548', n: '#d98c8c', x: '#2a1b10' },
  ginger: { o: '#d9803a', s: '#a85a24', b: '#f3d9b0', y: '#8fb35a', n: '#e89a9a', x: '#4a2410' },
  black: { o: '#2c2724', s: '#1a1614', b: '#2c2724', y: '#d4a548', n: '#b97a7a', x: '#0e0c0b' },
  tuxedo: { o: '#2a2523', s: '#161210', b: '#faf9f5', y: '#d4a548', n: '#e8a0a0', x: '#0e0c0b' },
  cream: { o: '#f3e6cc', d: '#dcc9a4', s: '#d4b98c', b: '#fffaf0', y: '#7a9a5a', n: '#e8a0a0', x: '#8a6a44' },
  grey: { o: '#8e8579', s: '#5f574d', b: '#b9b1a3', y: '#d4a548', n: '#d98c8c', x: '#2f2a24' },
  siamese: { o: '#e9d4b0', s: '#5a3a28', b: '#f6ead3', y: '#4fa39a', n: '#a86a6a', x: '#3a2418' },
  day: { o: '#e6d3ac', s: '#b88a52', b: '#faf9f5', y: '#4fa39a', n: '#e8a0a0', x: '#7a5a34' },
  night: { o: '#6f6fb0', s: '#34296a', b: '#b6b0ea', y: '#6fd0c4', n: '#d6b8f0', x: '#1c1838' },
}

type Px = string[]
const mirror = (px: Px): Px => px.map(r => [...r].reverse().join(''))
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const rnd = (n: number) => (Math.imul(n, 1664525) + 1013904223) >>> 0

const outline = (px: Px, key: string): Px => {
  const w = Math.max(...px.map(r => r.length))
  const g = Array.from({ length: px.length + 2 }, (_, y) =>
    Array.from({ length: w + 2 }, (_, x) => px[y - 1]?.[x - 1] ?? '.'),
  )
  const at = (y: number, x: number) => g[y]?.[x] ?? '.'
  return g.map((r, y) =>
    r.map((c, x) => (c !== '.' ? c : at(y - 1, x) !== '.' || at(y + 1, x) !== '.' || at(y, x - 1) !== '.' || at(y, x + 1) !== '.' ? key : '.')).join(''),
  )
}

export const isAsleep = (s: Scene) => s.look === 'idle' && s.idle > 100

// ---- the critter: the site's own sprite, ported ----------------------------------
// This is `founderCritter` from the studio site (src/js/crit.js) drawn on a grid of palette keys instead of a canvas: 22 x 14 cells,
// three tones of clay lit from the upper left, eyes with a glint, and frames for breathing, blinking, walking, joy and casting.
// By day it is the wizard of Christiaan's form (a dark purple hat with a gold star, a staff whose orb throws lightning); by night
// it is the antennae critter whose hat carries a violet bolt. The hat builds up from the brim over `morph` 0 to 1.
export type CritterPose = { aura: number; kit: 'wizard' | 'sherlock' | 'chef' | 'none'; walk: -1 | 0 | 1; arms: 0 | 1; cast: boolean; blink: boolean; happy: boolean; breath: boolean; morph: number; night: boolean; bolt: 0 | 1 | 2 }
const ghash = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v) }
// the bolt: a zigzag three cells by six, and its mirror; the two cells of its jag are the hot core
const BOLT: [number, number][][] = [
  [[2, 0], [1, 1], [2, 1], [0, 2], [1, 2], [1, 3], [2, 3], [1, 4], [0, 5]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [0, 3], [1, 3], [1, 4], [2, 5]],
]
const bolted = (c: number, r: number) => c === 1 && (r === 2 || r === 3)
export const CRIT_ROW0 = -16 // the grid's top row, in the sprite's own cells (room for the hat and the bolt above the staff)
const critterGrid = (o: CritterPose): Px => {
  const cells = new Map<string, string>()
  const put = (c: number, r: number, k: string) => cells.set(`${c},${r}`, k)
  const rect = (c: number, r: number, w: number, h: number, f: string | ((x: number, y: number) => string)) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) put(x, y, typeof f === 'function' ? f(x, y) : f)
  }
  const b = o.breath ? 1 : 0
  // four legs, two cells wide; a walk lifts alternate pairs; the outer two sit in shadow
  ;[4, 8, 12, 16].forEach((c, i) => {
    const up = o.walk >= 0 && ((o.walk % 2 === 0) === (i % 2 === 0)) ? 1 : 0
    rect(c, 10, 2, 4 - up, x => (i === 0 || i === 3 ? (x === c + 1 ? '4' : '3') : x === c + 1 ? '3' : '2'))
  })
  // the body, rounded at the top corners, lit from the upper left
  rect(4, b, 14, 10 - b, (x, y) => {
    if (y <= b + 1 || x <= 5) return y >= 8 || x >= 16 ? '2' : '1'
    if (y >= 8 || x >= 16) return y >= 9 && x >= 16 ? '4' : '3'
    return '2'
  })
  cells.delete(`4,${b}`); cells.delete(`17,${b}`)
  // arms: at rest, both up for a jump, or the right one raised to cast
  const arm = (c: number, r: number, side: number) => rect(c, r, 4, 4, (x, y) => (y === r ? '1' : y === r + 3 ? '3' : side > 0 && x === c + 3 ? '3' : '2'))
  if (o.arms === 1) { arm(0, 1 + b, -1); arm(18, 1 + b, 1) } else { arm(0, 4 + b, -1); arm(18, o.cast ? 1 + b : 4 + b, 1) }
  // eyes: two slits with a glint; a blink is one line; joy is two little arches
  for (const e of [7, 13]) {
    if (o.happy) { put(e - 1, 4 + b, '6'); put(e, 3 + b, '6'); put(e + 1, 3 + b, '6'); put(e + 2, 4 + b, '6') }
    else if (o.blink) rect(e, 4 + b, 2, 1, '6')
    else { rect(e, 2 + b, 2, 4, '6'); put(e, 2 + b, '7') }
  }
  // the two forms' marks, each cell with the moment it appears (0..1) as the wizard comes in
  const acc: [number, number, string, number, 0 | 1][] = []
  const A = (c: number, r: number, k: string, rv: number, form: 0 | 1) => acc.push([c, r, k, rv, form])
  const band = o.night ? '2' : 'e'; const bandLo = o.night ? '3' : 'f'
  for (let x = 2; x < 20; x++) A(x, b - 1, x < 6 ? '8' : x > 15 ? 'a' : '9', 0.02 + ghash(x, 1) * 0.1, 1) // the hat builds up from the brim
  ;([[5, 12], [5, 12], [6, 10], [6, 10], [7, 8], [7, 8], [8, 6], [8, 6], [9, 4], [10, 3], [11, 2]] as const).forEach(([c0, w], k) => {
    const r = b - 2 - k
    for (let x = c0; x < c0 + w; x++) A(x, r, x === c0 ? '8' : x >= c0 + w - 2 ? 'a' : '9', 0.08 + k * 0.055 + ghash(x, r) * 0.08, 1)
  })
  for (let x = 5; x < 17; x++) A(x, b - 3, x > 14 ? bandLo : band, 0.2 + ghash(x, 3) * 0.08, 1)
  A(12, b - 13, '9', 0.7, 1); A(13, b - 13, '9', 0.72, 1); A(13, b - 12, 'a', 0.74, 1); A(14, b - 12, 'a', 0.76, 1); A(15, b - 12, 'a', 0.78, 1); A(15, b - 11, band, 0.8, 1)
  if (!o.night) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) A(9 + dx, b - 7 + dy, dx || dy ? 'e' : 'm', 0.62, 1) // the gold star
  else for (const [c, r] of BOLT[0]!) A(9 + c, b - 10 + r, bolted(c, r) ? 't' : 'j', 0.62, 1) // a violet bolt on the night hat
  const top = o.cast ? b - 9 : b - 6; const ax = o.cast ? 20 : 21
  for (let y = top + 3; y < 14; y++) A(ax, y, y % 3 === 0 ? 'g' : 'h', 0.3 + (14 - y) / 26, 1) // the staff draws itself up from the hand
  for (let x = ax - 1; x <= ax + 1; x++) A(x, top + 2, 'i', 0.86, 1)
  if (!o.night) { for (let y = top - 1; y <= top + 1; y++) for (let x = ax - 1; x <= ax + 1; x++) A(x, y, x === ax - 1 && y === top - 1 ? 'j' : x === ax + 1 && y === top + 1 ? 'l' : 'k', 0.92, 1) }
  else { A(ax - 1, top + 1, 'l', 0.9, 1); A(ax + 1, top + 1, 'l', 0.9, 1) }
  if (o.night) { // the critter form's antennae, each ending in a charged bead
    const ant = (c: number, dir: number) => {
      for (let k = 1; k <= 5; k++) A(c + (k > 3 ? dir : 0), b - k, k > 3 ? '3' : '2', 0.1 + k * 0.07, 0)
      const bx = c + dir - (dir < 0 ? 1 : 0)
      A(bx, b - 8, 'j', 0.55, 0); A(bx + 1, b - 8, 'l', 0.55, 0); A(bx, b - 7, 'l', 0.55, 0); A(bx + 1, b - 7, 'l', 0.55, 0)
    }
    ant(7, -1); ant(14, 1)
  }
  // Sherlock: a deerstalker cap with ear flaps, and a magnifying glass held up in the raised hand
  if (o.kit === 'sherlock') {
    for (let x = 4; x <= 17; x++) put(x, b - 1, 'c')
    for (let x = 5; x <= 16; x++) put(x, b - 2, 'c')
    for (let x = 6; x <= 15; x++) put(x, b - 3, 'c')
    for (let x = 8; x <= 13; x++) put(x, b - 4, 'p')
    put(10, b - 5, 'p'); put(11, b - 5, 'p')
    for (const [x, y] of [[3, b], [3, b + 1], [3, b + 2], [18, b], [18, b + 1], [18, b + 2]] as const) put(x, y, 'p')
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if ((r === 0 || r === 4) && (c === 0 || c === 4)) continue // a round lens
      put(22 + c, b - 1 + r, r === 0 || r === 4 || c === 0 || c === 4 ? 'q' : 'z')
    }
    put(23, b, 'v') // the glint on the glass
    put(22, b + 3, 'h'); put(21, b + 4, 'h')
  }
  // Chef: a tall white hat, and a pan held out in front that throws gold sparks as it cooks
  if (o.kit === 'chef') {
    for (let x = 5; x <= 16; x++) put(x, b - 1, 'Y')
    for (let r = 2; r <= 4; r++) for (let x = r === 4 ? 5 : 4; x <= (r === 4 ? 16 : 17); x++) put(x, b - r, x >= 16 ? 'Y' : 'W')
    for (let x = 6; x <= 15; x++) put(x, b - 5, x >= 14 ? 'Y' : 'W')
    for (const x of [4, 5, 6, 9, 10, 11, 12, 15, 16, 17]) put(x, b - 6, x >= 15 ? 'Y' : 'W')
    for (const x of [5, 6, 10, 11, 16]) put(x, b - 7, 'W')
    for (const x of [22, 23]) put(x, b + 4, 'q') // the handle
    for (let x = 24; x <= 29; x++) { put(x, b + 3, 'q'); put(x, b + 4, 'K'); put(x, b + 5, 'K') }
    for (const [x, y] of o.walk === 0 ? [[25, b], [28, b + 1], [26, b - 1]] as const : [[26, b + 1], [24, b - 1], [28, b]] as const) put(x, y, 'G') // the sparks
  }
  const m = o.morph; const front = 0.14; const sparks: [number, number][] = []
  for (const [c, r, k, rv, form] of acc) {
    const shown = form === 1 ? m - rv : rv - m // above 0: this cell belongs to the current form
    if (shown > 0) put(c, r, k)
    if (m > 0 && m < 1 && Math.abs(m - rv) < front) sparks.push([c, r]) // the burning edge of the change
  }
  // the official critter has no outline, only shading: the site's one-cell line is left out here
  for (const [x, y] of sparks) put(x, y, ghash(x, y + m * 9) > 0.5 ? 'v' : 'k')
  if (o.bolt && m >= 1) { // the lightning off the staff's orb: struck afresh a few times a second, outlined like the sprite
    const cellsB = BOLT[o.bolt - 1]!; const on = new Set(cellsB.map(([c, r]) => `${c},${r}`)); const x0 = ax - 1; const y0 = top - 8
    for (const [c, r] of cellsB) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (!on.has(`${c + dx},${r + dy}`)) put(x0 + c + dx, y0 + r + dy, 'u')
    for (const [c, r] of cellsB) put(x0 + c, y0 + r, bolted(c, r) ? 't' : 'r')
  }
  if (o.kit === 'wizard' && m >= 1) { // motes of light drift round the hat and the staff, three of them, a few cells apart
    const MOTES: [number, number][] = [[3, -9], [16, -12], [1, -4], [19, -6], [8, -15], [22, -3], [12, -14], [5, -11]]
    for (let i = 0; i < 3; i++) { const [mc, mr] = MOTES[(o.aura + i * 3) % MOTES.length]!; if (!cells.has(`${mc},${mr + b}`)) put(mc, mr + b, i === 0 ? 'v' : 'r') }
  }
  const rows: string[] = []
  for (let r = CRIT_ROW0; r <= 13; r++) rows.push(Array.from({ length: 30 }, (_, c) => cells.get(`${c},${r}`) ?? '.').join(''))
  return rows
}
const critterCache = new Map<string, Px>()
const critterPx = (s: Scene, step: 0 | 1): Px => {
  const wiz = s.look === 'wizard'
  const o: CritterPose = {
    aura: wiz ? Math.floor(s.tick / 2) % 8 : 0,
    kit: wiz ? 'wizard' : s.look === 'reader' ? 'sherlock' : s.look === 'chef' ? 'chef' : 'none',
    walk: s.look !== 'coder' && s.look !== 'chef' && !isAsleep(s) ? step : -1,
    arms: s.jt > 0 ? 1 : 0,
    cast: (wiz && s.wt >= 8) || s.look === 'reader',
    blink: isAsleep(s) || s.tick % 14 === 0,
    happy: s.look === 'done',
    breath: s.tick % 16 < 8,
    morph: wiz ? Math.round(Math.min(1, s.wt / 8) * 16) / 16 : 0,
    night: s.form === 'bolt' ? true : s.form === 'gold' ? false : s.night,
    bolt: wiz && s.wt >= 8 ? ((Math.floor(s.tick / 2) % 2) + 1) as 1 | 2 : 0,
  }
  const key = `${o.kit}${o.aura}${o.walk}${o.arms}${+o.cast}${+o.blink}${+o.happy}${+o.breath}|${o.morph}|${+o.night}${o.bolt}`
  const hit = critterCache.get(key)
  if (hit) return hit
  const made = critterGrid(o)
  critterCache.set(key, made)
  return made
}

/** A cup of coffee, flat and cream, steam rising: it stands beside the critter when a turn is done. */
export const CUP_W = 8
const cupPx = (tick: number): Px => {
  const steam = tick % 8 < 4 ? ['..W..W..', '...W..W.'] : ['...W..W.', '..W..W..']
  return [...steam, '.YYYYYY.', 'YWWWWWWY', 'YWBBBBWYY', 'YWBBBBWWY', '.YWWWWY.']
}
export const LAPTOP_W = 18
/** An open laptop seen from the front, flat like the official critter's: a dark screen whose sparks move as it types, a lit edge, a keyboard deck. */
const laptopPx = (tick: number): Px => {
  const spark = [[5, 3], [12, 4], [8, 5], [14, 2], [4, 5], [10, 3], [6, 2], [13, 5]] // the screen's sparkle cells, two or three alight at a time
  const on = new Set([0, 1, 2].map(i => spark[(Math.floor(tick / 3) + i * 3) % spark.length]!.join(',')))
  const screen = Array.from({ length: 6 }, (_, y) => '.q' + Array.from({ length: 14 }, (_, x) => (on.has(`${x + 2},${y + 1}`) ? 'v' : 'K')).join('') + 'q.')
  return [
    '..qqqqqqqqqqqqqq..', ...screen, '..qKKKKKKKKKKKKq..',
    'qqqqqqqqqqqqqqqqqq', 'qKqKqKqKqKqKqKqKqq', 'qqqqqqqqqqqqqqqqqq',
  ]
}

// ---- the cat -----------------------------------------------------------------
// Our own cat, drawn in the manner of a pixel-cat sheet: seated, facing you, 28 pixels tall. It is built from shapes (a head,
// two ears, a chest, a haunch, two front legs, a curved tail) so that one drawing serves every coat and pose, and each
// pose is made once and kept. Light falls from the top left, so the right and the underside are a shade darker.
export const CAT_W = 30
export const CAT_H = 30
type CatStyle = { stripes: boolean; mask: boolean; bib: boolean; eye: 'K' | 'y' }
const STYLE: Record<string, CatStyle> = {
  orange: { stripes: true, mask: false, bib: false, eye: 'K' }, ink: { stripes: true, mask: false, bib: false, eye: 'K' }, brown: { stripes: true, mask: false, bib: false, eye: 'K' },
  tabby: { stripes: true, mask: false, bib: false, eye: 'K' }, ginger: { stripes: true, mask: false, bib: false, eye: 'K' },
  grey: { stripes: true, mask: false, bib: false, eye: 'K' }, black: { stripes: false, mask: false, bib: false, eye: 'y' },
  tuxedo: { stripes: false, mask: false, bib: true, eye: 'K' }, cream: { stripes: false, mask: false, bib: false, eye: 'K' },
  siamese: { stripes: false, mask: true, bib: false, eye: 'K' }, day: { stripes: false, mask: false, bib: false, eye: 'K' },
  night: { stripes: true, mask: false, bib: false, eye: 'K' },
}
type CatPose = { blink: boolean; yawn: boolean; lift: boolean; phase: 0 | 1 }
const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
const inTriangle = (px: number, py: number, a: [number, number], b: [number, number], c: [number, number]) => {
  const side = (p1: [number, number], p2: [number, number], p3: [number, number]) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  const p: [number, number] = [px, py]
  const d1 = side(p, a, b); const d2 = side(p, b, c); const d3 = side(p, c, a)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}
const outlined = (g: string[][]): Px => {
  const out = g.map(r => [...r])
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y]!.length; x++) {
    if (g[y]![x] !== '.') continue
    const touches = ([[0, 1], [0, -1], [1, 0], [-1, 0]] as const).some(([dx, dy]) => { const k = g[y + dy]?.[x + dx] ?? '.'; return k !== '.' && k !== 'w' })
    if (touches) out[y]![x] = 'x'
  }
  return out.map(r => r.join(''))
}
const catSeated = (style: CatStyle, pose: CatPose): Px => {
  const g: string[][] = Array.from({ length: CAT_H }, () => Array.from({ length: CAT_W }, () => '.'))
  const set = (x: number, y: number, k: string) => { if (g[y] && x >= 0 && x < CAT_W) g[y]![x] = k }
  const cx = 11
  for (let y = 0; y < CAT_H; y++) for (let x = 0; x < CAT_W; x++) {
    const head = inEllipse(x, y, cx, 10, 9.5, 7.6)
    const ears = inTriangle(x, y, [2, 7], [3, 0], [10, 3.5]) || inTriangle(x, y, [20, 7], [19, 0], [12, 3.5])
    const chest = inEllipse(x, y, cx, 21, 7.5, 8.5) && y >= 15
    const haunch = inEllipse(x, y, 16, 23.5, 6.5, 5.5)
    const front = (x >= 6 && x <= 9) || (x >= 13 && x <= 16)
    const bottom = pose.lift && x >= 6 && x <= 9 ? 26 : 28 // one front paw lifts when it walks
    if (head || ears || chest || haunch || (front && y >= 22 && y <= bottom)) set(x, y, 'o')
  }
  // the tail: a curve up the right of the body, in rings, its stripes swapping as it flicks
  for (let i = 0, t = 0; t <= 1; t += 0.02, i++) {
    const x = Math.round(20 + 6 * Math.sin(t * 2.2)); const y = Math.round(27 - 17 * t)
    for (let dx = 0; dx < 3; dx++) set(x + dx, y, (i + pose.phase * 4) % 9 < 4 ? 'o' : style.stripes ? 's' : 'd')
  }
  for (let y = 0; y < CAT_H; y++) for (let x = 0; x < CAT_W; x++) if (g[y]![x] === 'o' && (x > cx + 5 || y > 26 || (x > cx + 3 && y > 14))) g[y]![x] = 'd'
  for (const [x, y] of [[4, 3], [4, 4], [5, 4], [18, 3], [18, 4], [17, 4]] as const) set(x, y, 'n') // pink inner ears
  if (style.stripes) {
    for (const x of [8, 11, 14]) for (let y = 3; y <= 5; y++) set(x, y, 's')
    for (const y of [9, 11]) { for (let x = 1; x <= 3; x++) set(x, y, 's'); for (let x = 19; x <= 21; x++) set(x, y, 's') }
    for (const y of [17, 19, 21, 23, 25]) for (const x of [3, 4, 5, 17, 18, 19]) if (g[y]![x] !== '.') set(x, y, 's')
    for (const y of [24, 26]) for (const x of [6, 7, 8, 9, 13, 14, 15, 16]) set(x, y, 's')
  }
  if (style.mask) for (let y = 7; y <= 13; y++) for (let x = 5; x <= 17; x++) if (inEllipse(x, y, cx, 11, 6.5, 4.5)) set(x, y, 's')
  for (let y = 11; y <= 15; y++) for (let x = 7; x <= 15; x++) if (inEllipse(x, y, cx, 13.2, 4.2, 2.8)) set(x, y, 'b') // the muzzle
  if (style.bib) for (let y = 16; y <= 24; y++) for (let x = 7; x <= 15; x++) if (inEllipse(x, y, cx, 19.5, 3.6, 5.4)) set(x, y, 'b')
  for (const y of [27, 28]) for (const x of [6, 7, 8, 9, 13, 14, 15, 16]) if (g[y]![x] === 'o' || g[y]![x] === 'd' || g[y]![x] === 's') set(x, y, 'b') // paws
  if (pose.blink) for (const ex of [7, 14]) for (const x of [ex, ex + 1]) set(x, 10, 'K')
  else {
    for (const ex of [7, 14]) for (let y = 8; y <= 11; y++) for (const x of [ex, ex + 1]) set(x, y, style.eye)
    set(7, 8, 'W'); set(14, 8, 'W') // the glint
  }
  set(11, 12, 'n'); set(12, 12, 'n')
  if (pose.yawn) { for (let y = 13; y <= 15; y++) for (let x = 10; x <= 13; x++) set(x, y, 'x'); set(11, 15, 'n'); set(12, 15, 'n') }
  else { set(11, 13, 'x'); set(12, 13, 'x'); set(10, 14, 'x'); set(13, 14, 'x') }
  for (const [x, y] of [[1, 12], [0, 12], [1, 14], [0, 15], [22, 12], [23, 12], [22, 14], [23, 15]] as const) set(x, y, 'w') // whiskers
  return outlined(g)
}
/** Asleep: a loaf with its head tucked in front and its tail round it, ears down, eyes shut. It breathes by lifting its back. */
const catLoaf = (style: CatStyle, breathe: boolean): Px => {
  const h = 16
  const g: string[][] = Array.from({ length: h }, () => Array.from({ length: CAT_W }, () => '.'))
  const set = (x: number, y: number, k: string) => { if (g[y] && x >= 0 && x < CAT_W) g[y]![x] = k }
  const lift = breathe ? 0 : 1
  for (let y = 0; y < h; y++) for (let x = 0; x < CAT_W; x++) {
    const body = inEllipse(x, y, 17, 9 + lift, 11, 6.5 - lift * 0.5)
    const head = inEllipse(x, y, 7, 10, 6, 5)
    const ears = inTriangle(x, y, [2, 7], [3, 3], [7, 5.5]) || inTriangle(x, y, [12, 7], [11, 3], [7, 5.5])
    const tail = inEllipse(x, y, 16, 14, 11, 2.2) && y >= 12
    if (body || head || ears || tail) set(x, y, 'o')
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < CAT_W; x++) if (g[y]![x] === 'o' && (x > 20 || y > 13)) g[y]![x] = 'd'
  if (style.stripes) for (const x of [12, 15, 18, 21]) for (let y = 4 + lift; y <= 7 + lift; y++) if (g[y]![x] !== '.') set(x, y, 's')
  for (const [x, y] of [[3, 5], [3, 6], [11, 5], [11, 6]] as const) set(x, y, 'n')
  for (let y = 11; y <= 14; y++) for (let x = 4; x <= 10; x++) if (inEllipse(x, y, 7, 12.5, 3.5, 2)) set(x, y, 'b')
  for (const ex of [4, 8]) for (let x = ex; x <= ex + 1; x++) set(x, 10, 'K') // eyes shut
  set(6, 12, 'n'); set(7, 12, 'n')
  for (const [x, y] of [[0, 12], [1, 12], [0, 14], [12, 12], [13, 12]] as const) set(x, y, 'w')
  return outlined(g)
}
const poseCache = new Map<string, Px>()
const cached = (key: string, make: () => Px): Px => {
  const hit = poseCache.get(key)
  if (hit) return hit
  const made = make()
  poseCache.set(key, made)
  return made
}
const styleOf = (s: Scene): CatStyle => STYLE[keyFor(s)] ?? STYLE.cream!
const catPose = (s: Scene, pose: CatPose): Px => cached(`${keyFor(s)}|${pose.blink}${pose.yawn}${pose.lift}${pose.phase}`, () => catSeated(styleOf(s), pose))
const catAsleep = (s: Scene, breathe: boolean): Px => cached(`${keyFor(s)}|sleep${breathe}`, () => catLoaf(styleOf(s), breathe))

const FX: Record<string, Px> = {
  heart: ['.R.R.', 'RRRRR', '.RRR.', '..R..'], z: ['WW.', '.W.', '.WW'], spark: ['.G.', 'GGG', '.G.'],
  bubble: ['TT', 'TT'], cup: ['GGG', 'GGG', '.G.'], treat: ['TTT', '.T.'],
}

const keyFor = (s: Scene): string => (s.variant === 'pair' ? (s.night ? 'night' : 'day') : s.variant)

// ---- state ----------------------------------------------------------------
export const initial = (): Scene => ({
  form: 'auto', tick: 0, cols: 80, look: 'idle', label: 'ready', tools: 0, skills: 0, night: false, idle: 0, wt: 0,
  cx: 4, cdir: 1, jt: 0, kx: 60, kdir: -1, mode: 'loaf', mt: 0, target: 40, seed: 7, variant: 'orange',
  trust: 60, joy: 60, fx: [], game: { on: false, lane: 1, row: 0, score: 0, best: 0 },
  stats: { turns: 0, errors: 0, pets: 0, commits: 0, tests: 0, denials: 0, knocks: 0 }, log: [],
})

const addFx = (s: Scene, ...f: Fx[]): Fx[] => [...s.fx, ...f].slice(-24)
const hearts = (s: Scene, n: number): Fx[] =>
  Array.from({ length: n }, (_, i) => ({ k: 'heart' as const, x: s.kx + 8 + i * 4, y: 24 + i, vx: 0.2, vy: 0.5, life: 12 }))
const sparks = (x: number, n: number): Fx[] =>
  Array.from({ length: n }, (_, i) => ({ k: 'spark' as const, x: x + i * 4 - n * 2, y: 12 + (i % 2) * 2, vx: (i - n / 2) * 0.3, vy: 0.4, life: 8 }))
const say = (s: Scene, line: string): string[] => [...s.log, line].slice(-6)

export const poke = (s: Scene, mode: CatMode): Scene => ({ ...s, mode, mt: 0 })

// The cat keeps count. A round number gets a line of its own; every other one gets the usual.
const ERROR_LINES: Record<number, string> = {
  3: 'Three now. {cat} is keeping a list.', 5: 'Five. {pip} has stopped looking up.', 10: 'Ten. The list is mostly this.',
}
const TEST_LINES: Record<number, string> = {
  5: 'Five green runs. {cat} may stand up.', 10: 'Ten. {cat} sits on the laptop to celebrate.', 25: 'Twenty-five. Nobody checks any more.',
}
const COMMIT_LINES: Record<number, string> = {
  5: 'Five commits. A village in the history.', 10: 'Ten. A small town. {cat} wants a window seat.', 25: 'Twenty-five. The history needs a bigger cat.',
}
/** The line for the n-th event when n is a round one; `exported` so the tests can pin it. */
export const milestone = (n: number, lines: Record<number, string>): string | undefined => lines[n]

/** What happened out in the session, and how the pair take it. The cat's lines are its own. */
export const react = (s: Scene, ev: Reaction, arg = 0): Scene => {
  const woke = { ...s, idle: 0 }
  switch (ev) {
    case 'error':
      return { ...poke(woke, 'pounce'), joy: clamp(s.joy - 6), stats: { ...s.stats, errors: s.stats.errors + 1 },
        log: say(s, milestone(s.stats.errors + 1, ERROR_LINES) ?? 'That broke. {cat} was already watching it.') }
    case 'test':
      return { ...woke, jt: 1, joy: clamp(s.joy + 6), stats: { ...s.stats, tests: s.stats.tests + 1 },
        look: 'wizard', wt: 8, label: 'green', fx: addFx(s, ...sparks(s.cx + 6, 3)), log: say(s, milestone(s.stats.tests + 1, TEST_LINES) ?? 'Green. {cat} allows it.') }
    case 'commit':
      return { ...woke, jt: 1, joy: clamp(s.joy + 8), stats: { ...s.stats, commits: s.stats.commits + 1 },
        look: 'wizard', wt: 8, label: 'committed', fx: addFx(s, ...sparks(s.cx + 6, 4)), log: say(s, milestone(s.stats.commits + 1, COMMIT_LINES) ?? 'A commit. {pip} drew a small star in the history.') }
    case 'turn': {
      const mins = Math.round(arg / 60000)
      const long = arg > 120000
      return { ...(long ? poke(woke, 'yawn') : woke), jt: long ? 0 : 1, look: long ? 'wizard' : 'done', wt: long ? 8 : s.wt, label: 'done', // a long turn ends with one last bolt before the coffee
        fx: addFx(s, ...sparks(s.cx + 6, 3)),
        stats: { ...s.stats, turns: s.stats.turns + 1 },
        log: say(s, long ? `That took ${mins} minutes. {cat} slept through most of it and would again.` : 'Done. {pip} bows. {cat} did not look up.') }
    }
    case 'ask':
      return { ...poke(woke, 'alert'), log: say(s, '{pip} is asking you something. {cat} was not consulted.') }
    case 'deny':
      return { ...poke(woke, 'swat'), stats: { ...s.stats, denials: s.stats.denials + 1 },
        fx: addFx(s, ...sparks(s.kx + 14, 2)), log: say(s, 'Denied. {cat} would have done it with one paw.') }
    case 'pet':
      return { ...poke(woke, 'purr'), trust: clamp(s.trust + 6), stats: { ...s.stats, pets: s.stats.pets + 1 },
        fx: addFx(s, ...hearts(s, 3)), log: say(s, s.trust < 30 ? '{cat} allows it. {cat} is still angry. Continue.' : '{cat} allows it. Do not stop.') }
    case 'treat':
      return { ...poke(woke, 'follow'), trust: clamp(s.trust + 3), joy: clamp(s.joy + 8), jt: 1,
        target: s.cx + (s.cdir === 1 ? -14 : 14),
        fx: addFx(s, { k: 'treat', x: s.cx + 5, y: 12, vx: 0, vy: -1, life: 10 }), log: say(s, 'A treat. {pip} is sure it was his.') }
    case 'nap':
      return { ...poke(s, 'loaf'), look: 'idle', label: 'napping', idle: 200, log: say(s, '{cat} and {pip} nap. Do not look at the screen.') }
    case 'spell':
      return { ...woke, look: 'wizard', label: 'casting', wt: 0, jt: 1, joy: clamp(s.joy + 4), fx: addFx(s, ...sparks(s.cx + 6, 5)),
        log: say(s, '{pip} cast something. Nothing happened. He is delighted.') }
  }
}

/** The one-key game: a treat falls in a lane; press that lane when it reaches the bottom. */
export const startGame = (s: Scene): Scene => ({ ...s, game: { ...s.game, on: true, row: 0, lane: (rnd(s.seed) % 3) as 0 | 1 | 2 }, idle: 0 })
export const stopGame = (s: Scene): Scene => ({ ...s, game: { ...s.game, on: false } })
export const catchIn = (s: Scene, lane: 0 | 1 | 2): Scene => {
  if (!s.game.on) return s
  const hit = lane === s.game.lane && s.game.row >= 5
  const score = s.game.score + (hit ? 1 : 0)
  const g = { ...s.game, score, best: Math.max(s.game.best, score), row: hit ? 0 : s.game.row, lane: hit ? ((rnd(s.seed + score) % 3) as 0 | 1 | 2) : s.game.lane }
  return hit ? { ...s, game: g, joy: clamp(s.joy + 2), fx: addFx(s, ...hearts(s, 1)), idle: 0 } : { ...s, game: g }
}

export const step = (s: Scene): Scene => {
  const n: Scene = { ...s, tick: s.tick + 1, mt: s.mt + 1, idle: s.idle + 1, seed: rnd(s.seed) }
  // "done" is a few seconds of celebration, then the pair settle to idle so they can nap again
  if (s.look === 'wizard' && (s.label === 'green' || s.label === 'committed') && s.idle > 10) ((n.look = 'idle'), (n.label = 'ready')) // a cast with a reason is brief
  if (s.look === 'wizard' && s.label.startsWith('done') && s.idle > 10) n.look = 'done'
  if (s.look === 'done' && s.idle > 24) ((n.look = 'idle'), (n.label = 'ready'))
  n.wt = s.look === 'wizard' ? Math.min(60, s.wt + 1) : 0 // how long the hat has been building
  const max = Math.max(0, s.cols - CAT_W)
  const asleep = isAsleep(s)
  const calm = s.look === 'idle' || s.look === 'done'

  // the critter walks, jumps now and then, types still at the laptop, naps when it is quiet
  if (s.look !== 'coder' && s.look !== 'chef' && !asleep) {
    const speed = calm ? 1 : 2
    n.cx = s.cx + s.cdir * speed
    // the critter keeps to the stretch of the bar the cat leaves it: left of the cat if the cat is to its right, else right of it
    const catRight = s.kx >= s.cx
    const lo = catRight ? 0 : Math.min(s.cols - CRIT_W, s.kx + CAT_W + 2)
    const hi = catRight ? Math.max(0, Math.min(s.cols - CRIT_W, s.kx - CRIT_W - 2)) : Math.max(0, s.cols - CRIT_W)
    if (n.cx >= hi) ((n.cx = Math.max(lo, hi)), (n.cdir = -1))
    if (n.cx <= lo) ((n.cx = lo), (n.cdir = 1))
  }
  if (s.jt > 0) n.jt = s.jt >= 9 ? 0 : s.jt + 1
  else if (calm && !asleep && n.seed % 53 === 0) n.jt = 1

  // the cat
  const catX = s.kx
  const clampCat = (x: number) => Math.max(0, Math.min(max, x))
  // beside the critter, never on it: behind it if there is room there, else on its other side
  const beside = () => {
    const behind = s.cdir === 1 ? s.cx - CAT_W - 2 : s.cx + CRIT_W + 2
    const other = s.cdir === 1 ? s.cx + CRIT_W + 2 : s.cx - CAT_W - 2
    const fits = (x: number) => x >= 0 && x <= max
    return clampCat(fits(behind) ? behind : fits(other) ? other : behind)
  }
  const goTo = (t: number, v = 2) => { const d = t - catX; if (Math.abs(d) > v) { n.kdir = d > 0 ? 1 : -1; n.kx = catX + n.kdir * v } }
  const cup = s.fx.find(f => f.k === 'cup' && f.vx === 0)
  const near = (x: number) => Math.abs(x - (catX + CAT_W / 2)) < 8
  switch (s.mode) {
    case 'loaf':
      if (s.look === 'coder') { n.mode = 'sit'; n.mt = 0 }
      else if (s.trust < 30 && s.mt > 16) { n.mode = 'sulk'; n.mt = 0; n.target = catX < s.cols / 2 ? max : 0 }
      else if (s.idle > 120 && s.trust >= 40 && s.mt > 30) { n.mode = 'follow'; n.mt = 0 }
      else if (cup && s.mt > 24) { n.mode = 'walk'; n.mt = 0; n.target = Math.max(0, Math.min(max, cup.x - Math.round(CAT_W / 2))) }
      else if (s.mt > 90 + (s.seed % 120)) { n.mode = 'walk'; n.mt = 0; n.target = n.seed % Math.max(1, max) }
      break
    case 'walk':
      if (Math.abs(s.target - catX) <= 2) {
        if (cup && near(cup.x)) { n.mode = 'knock'; n.mt = 0; n.kdir = cup.x > catX ? 1 : -1 }
        else ((n.mode = 'loaf'), (n.mt = 0))
      } else goTo(s.target)
      break
    case 'follow':
      goTo(beside(), 2) // follows close, never on top of it
      if (s.mt > 40) ((n.mode = 'loaf'), (n.mt = 0))
      break
    case 'sit':
      { // sits just past the laptop, on the side it is on; with no room there, behind the critter instead
        const past = s.cdir === 1 ? s.cx + CRIT_W - 2 + LAPTOP_W + 1 : s.cx - LAPTOP_W + 2 - CAT_W - 1
        const room = past >= 0 && past <= max
        n.kx = room ? past : beside(); n.kdir = s.cdir
      }
      if (s.look !== 'coder') ((n.mode = 'loaf'), (n.mt = 0))
      break
    case 'sulk':
      goTo(s.target, 1)
      if (s.trust >= 30 || s.mt > 60) ((n.mode = 'loaf'), (n.mt = 0))
      break
    case 'purr': if (s.mt > 40) ((n.mode = 'loaf'), (n.mt = 0)); break
    case 'yawn': if (s.mt > 8) ((n.mode = 'loaf'), (n.mt = 0)); break
    case 'swat': if (s.mt > 6) ((n.mode = 'loaf'), (n.mt = 0)); break
    case 'alert': if (s.mt > 10) ((n.mode = 'loaf'), (n.mt = 0)); break
    case 'pounce': if (s.mt > 8) ((n.mode = 'loaf'), (n.mt = 0)); break
    case 'knock':
      if (s.mt === 4 && cup) {
        n.fx = s.fx.map(f => (f === cup ? { ...f, vx: 1.5 * n.kdir, vy: 2, life: 14 } : f))
        n.stats = { ...s.stats, knocks: s.stats.knocks + 1 }
        n.log = say(s, 'A cup, off the bar. {cat} meant it.')
      }
      if (s.mt > 8) ((n.mode = 'loaf'), (n.mt = 0))
      break
  }
  // a cup appears on the bar every so often, for the cat to find
  if (!cup && s.mode === 'loaf' && s.tick % 160 === 80) n.fx = [...n.fx, { k: 'cup', x: Math.round(CAT_W / 2) + (n.seed % Math.max(1, max)), y: 0, vx: 0, vy: 0, life: 9999 }]

  // particles
  const fx: Fx[] = []
  for (const f of n.fx) {
    const g = f.k === 'treat' || (f.k === 'cup' && f.vx !== 0) ? 0.4 : 0
    const m = { ...f, x: f.x + f.vx, y: f.y + f.vy, vy: f.vy - g, life: f.life - 1 }
    if (m.life > 0 && m.y > -4) fx.push(m)
  }
  if (isAsleep(n) && s.tick % 8 === 0) fx.push({ k: 'z', x: n.cx + 8, y: 10, vx: 0.4, vy: 0.4, life: 14 })
  if (s.look === 'wizard' && s.tick % 2 === 0) fx.push({ k: 'bubble', x: n.cx + (n.cdir === 1 ? 17 : -8) + (n.seed % 4), y: 5, vx: 0, vy: 0.5, life: 6 })
  if (s.mode === 'purr' && s.mt % 4 === 0) fx.push({ k: 'heart', x: n.kx + 12, y: 24, vx: 0.2, vy: 0.5, life: 9 })
  n.fx = fx.slice(-24)

  // the game
  if (s.game.on) {
    if (s.game.row >= 8) n.game = { ...s.game, row: 0, lane: (n.seed % 3) as 0 | 1 | 2 }
    else n.game = { ...s.game, row: s.game.row + 1 }
  }
  // the pair's moods drift back to even
  if (s.tick % 40 === 0) { n.joy = s.joy + (s.joy > 60 ? -1 : s.joy < 60 ? 1 : 0); if (s.idle > 400) n.trust = clamp(s.trust - 1) }
  // whatever the cat just did, it stays out of the critter: if the two would overlap it stops at the critter's edge
  if (n.kx < n.cx + CRIT_W + 2 && n.cx < n.kx + CAT_W + 2 && s.mode !== 'sit' && s.mode !== 'follow') {
    n.kx = s.kx >= s.cx ? Math.min(max, n.cx + CRIT_W + 2) : Math.max(0, n.cx - CAT_W - 2)
  }
  return n
}

// ---- painting -------------------------------------------------------------
const blit = (c: string[][], px: Px, x0: number, bottom: number, flip: boolean) => {
  const p = flip ? mirror(px) : px
  const y0 = bottom - p.length + 1
  p.forEach((r, dy) => {
    const line = c[y0 + dy]
    if (!line) return
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]
      const x = x0 + i
      if (ch && ch !== '.' && x >= 0 && x < line.length) line[x] = ch
    }
  })
}
const JUMP = [0, 2, 4, 5, 5, 4, 2, 1, 0, 0]
// A jump is the film's, at twice its height, to suit the 22 x 14 critter.
export const SCALE = 2
export const CRIT_W = 30 // the critter's cells, with room for a magnifier or a pan

/** Every pixel of the scene on one canvas, keys into the palette; '.' is clear. */
export const canvasOf = (s: Scene, cols: number): string[][] => {
  const canvas: string[][] = Array.from({ length: H }, () => Array.from({ length: cols }, () => '.'))
  const stepA = (s.tick % 2) as 0 | 1
  const fall = s.mode === 'pounce' ? [0, 3, 5, 5, 3, 1, 0, 0, 0][Math.min(8, s.mt)] ?? 0 : 0
  const lift = s.mode === 'sit' ? 2 : fall // on the laptop it sits a little above the bar
  const walking = s.mode === 'walk' || s.mode === 'follow' || s.mode === 'knock'
  const catPx = s.mode === 'loaf' && isAsleep(s)
    ? catAsleep(s, s.tick % 16 < 8)
    : catPose(s, {
        blink: s.mode === 'sulk' || (!walking && s.tick % 30 > 27), // sulking eyes stay shut; otherwise it blinks now and then
        yawn: s.mode === 'yawn',
        lift: walking && stepA === 1, // a front paw lifts at each step
        phase: s.mode === 'alert' || s.mode === 'swat' || s.tick % 40 > 34 ? 1 : 0, // the tail flicks, and rides up when it is alert
      })
  const facing = s.mode === 'sulk' ? (s.kdir === 1 ? -1 : 1) : s.kdir
  blit(canvas, catPx, s.kx - 1, H - 1 - lift, facing === -1)
  const hop = (JUMP[Math.min(9, s.jt)] ?? 0) * SCALE
  blit(canvas, critterPx(s, stepA), s.cx, H - 1 - hop, s.cdir === -1)
  if (s.look === 'done') blit(canvas, cupPx(s.tick), s.cx + (s.cdir === 1 ? CRIT_W - 4 : -CUP_W), H - 1, s.cdir === -1)
  if (s.look === 'coder') blit(canvas, laptopPx(s.tick), s.cx + (s.cdir === 1 ? CRIT_W - 2 : -LAPTOP_W + 2), H - 1, s.cdir === -1)
  for (const f of s.fx) blit(canvas, FX[f.k] ?? [], Math.round(f.x), H - 1 - Math.round(f.y), false)
  return canvas
}

/** A hex colour a little darker: the shaded side of a coat. */
const shade = (hex: string): string => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.82).toString(16).padStart(2, '0')).join('')

export const colourOf = (s: Scene) => {
  const coat = COATS[keyFor(s)] ?? COATS.ink!
  return (k: string) => BASE[k] ?? coat[k] ?? (k === 'd' ? shade(coat.o ?? '#d97757') : k === 'w' ? coat.x : undefined) ?? '#d97757'
}

export const paint = (s: Scene): Run[][] => {
  const cols = Math.max(24, s.cols)
  return runsOf(canvasOf(s, cols), colourOf(s))
}

/** The wizard alone, built and holding his staff, to stand beside the thinking orb: no cat, no cauldron. */
export const WIZARD_COLS = 32
const wizardCanvas = (s: Scene): string[][] =>
  canvasOf(
    {
      // he paces a cell to and fro beside the orb while Claude works, legs stepping, instead of standing like a statue
      ...s, look: 'wizard', wt: 8, cols: WIZARD_COLS, cx: 1 + (Math.floor(s.tick / 5) % 2), cdir: 1, kx: -40,
      // the sparks of a cast, a finished turn or a pet drift round him; the cup and the treat stay on the bar
      fx: s.fx.filter(f => f.k === 'spark' || f.k === 'heart' || f.k === 'bubble').map(f => ({ ...f, x: f.x - s.cx + 1 })),
    },
    WIZARD_COLS,
  )
export const paintWizard = (s: Scene): Run[][] => runsOf(wizardCanvas(s), colourOf(s))

// ---- vector art -------------------------------------------------------------
// The desktop draws text art as a smear (its cells are not two pixels tall), but it draws SVG crisply. The same canvas
// the terminal paints as half-blocks becomes one rect per run of a colour: no glyphs, no font, the same pixels.
export type Svgd = { source: string; width: number; height: number }
export const svgOf = (canvas: string[][], colour: (k: string) => string, px: number): Svgd => {
  const cols = canvas[0]?.length ?? 0
  const inked = (y: number) => (canvas[y] ?? []).some(k => k !== '.')
  let first = 0
  while (first < canvas.length - 1 && !inked(first)) first++
  let last = canvas.length - 1
  while (last > first && !inked(last)) last--
  const rects: string[] = []
  for (let y = first; y <= last; y++) {
    const row = canvas[y] ?? []
    for (let x = 0; x < cols; ) {
      const k = row[x] ?? '.'
      let end = x + 1
      while (k !== '.' && end < cols && (row[end] ?? '.') === k) end++
      if (k !== '.') rects.push(`<rect x="${x * px}" y="${(y - first) * px}" width="${(end - x) * px}" height="${px}" fill="${colour(k)}"/>`)
      x = end
    }
  }
  const width = cols * px
  const height = (last - first + 1) * px
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rects.join('')}</svg>`
  return { source, width, height }
}
export const paintSvg = (s: Scene, px = 5): Svgd => svgOf(canvasOf(s, Math.max(24, s.cols)), colourOf(s), px)
export const paintWizardSvg = (s: Scene, px = 5): Svgd => svgOf(wizardCanvas(s), colourOf(s), px)
export const paintBigSvg = (s: Scene, px = 8): Svgd => svgOf(portraitCanvas(s), colourOf(s), px)
/** The five-cell face as nine by five pixels: eyes by what the call did. */
export const faceSvg = (kind: FaceKind, tick: number, px = 4): Svgd => {
  const eyes: Record<FaceKind, string[]> = {
    run: tick % 8 === 0 ? ['CCCCCCCCC', 'CKKCCCKKC', 'CCCCCCCCC'] : ['CCCCCCCCC', 'CCKCCCKCC', 'CCCCCCCCC'],
    ok: ['CCKCCCKCC', 'CKCKCKCKC', 'CCCCCCCCC'],
    err: ['CKCKCKCKC', 'CCKCCCKCC', 'CKCKCKCKC'],
    rest: ['CCCCCCCCC', 'CKKCCCKKC', 'CCCCCCCCC'],
  }
  const grid = ['.CCCCCCC.', ...eyes[kind], '.C.CCC.C.'].map(r => [...r])
  return svgOf(grid, k => BASE[k] ?? '#d97757', px)
}

/** The critter's face in five cells, for the rows of the transcript: eyes by what the call did. */
export type FaceKind = 'run' | 'ok' | 'err' | 'rest'
export const faceRuns = (kind: FaceKind, tick: number): Run[] => {
  const eye = kind === 'err' ? '×' : kind === 'ok' ? '^' : kind === 'rest' ? '-' : tick % 8 === 0 ? '·' : '▪'
  return [
    { text: '▐', fg: BASE.C },
    { text: eye, fg: BASE.K, bg: BASE.C },
    { text: '█', fg: BASE.C },
    { text: eye, fg: BASE.K, bg: BASE.C },
    { text: '▌', fg: BASE.C },
  ]
}

/** The Sovereign Matrix mark: a glossy clay orb, its shine breathing. Nine cells wide, eight pixel rows. */
export const ORB = ['..XXXXX..', '.XCHWCDX.', 'XCHWCCDDX', 'XCHCCCDDX', 'XCCCCDDDX', 'XCCDDDDDX', '.XDDDDDX.', '..XXXXX..']
export const ORB_COLS = 9
export const paintOrb = (tick: number): Run[][] => {
  const shine = tick % 6 < 3 ? 'W' : 'H' // lit from the top left; the shine breathes
  const canvas = ORB.map(r => [...r].map(c => (c === 'W' ? shine : c)))
  return runsOf(canvas, k => BASE[k] ?? '#d97757')
}

/** The same orb, unchanged, as vector art for the desktop. */
export const paintOrbSvg = (tick: number, px = 5): Svgd =>
  svgOf(ORB.map(r => [...r].map(c => (c === 'W' && tick % 6 >= 3 ? 'H' : c))), k => BASE[k] ?? '#d97757', px)

const runsOf = (canvas: string[][], colour: (k: string) => string): Run[][] => {
  const cols = canvas[0]?.length ?? 0
  const out: Run[][] = []
  for (let y = 0; y < canvas.length; y += 2) { // two pixel rows to a text row; a sprite of its own height paints too
    const runs: Run[] = []
    let ink = false
    for (let x = 0; x < cols; x++) {
      const t = canvas[y]?.[x] ?? '.'
      const b = canvas[y + 1]?.[x] ?? '.'
      let text = ' '; let fg: string | undefined; let bg: string | undefined
      if (t !== '.' && b !== '.') { text = '▀'; fg = colour(t); bg = colour(b) }
      else if (t !== '.') { text = '▀'; fg = colour(t) }
      else if (b !== '.') { text = '▄'; fg = colour(b) }
      if (text !== ' ') ink = true
      const last = runs[runs.length - 1]
      if (last && last.fg === fg && last.bg === bg) last.text += text
      else runs.push({ text, fg, bg })
    }
    if (ink || out.length) out.push(runs)
  }
  return out
}

/** The portrait's own canvas: wide enough for the critter and a whole cat side by side, whatever the pane's width. */
export const PORTRAIT_W = 70
export const portraitCanvas = (s: Scene): string[][] =>
  canvasOf({ ...s, cols: PORTRAIT_W, cx: 4, cdir: 1, kx: PORTRAIT_W - CAT_W - 1, kdir: -1, mode: s.mode === 'walk' || s.mode === 'follow' ? 'loaf' : s.mode }, PORTRAIT_W)

/** The portrait: each pixel two cells wide when the pane has room for that, else one, so the cat is never cut off. */
export const paintBig = (s: Scene): Run[][] => {
  const canvas = portraitCanvas(s)
  if (s.cols < PORTRAIT_W * 2) return runsOf(canvas, colourOf(s))
  const colour = colourOf(s)
  return canvas.map(row => {
    const runs: Run[] = []
    for (const k of row) {
      const fg = k === '.' ? undefined : colour(k)
      const text = k === '.' ? '  ' : '██'
      const last = runs[runs.length - 1]
      if (last && last.fg === fg) last.text += text
      else runs.push({ text, fg })
    }
    return runs
  })
}

// ---- names ---------------------------------------------------------------------
// The lines say {cat} and {pip}; what the person called them is put in at the last moment, so a rename changes every line at once.
export type Names = { cat: string; pip: string }
export const NAMES_DEFAULT: Names = { cat: 'Biscuit', pip: 'Pip' }
export const named = (line: string, n: Names = NAMES_DEFAULT): string => line.replaceAll('{cat}', n.cat).replaceAll('{pip}', n.pip)
/** A name the person typed, made safe to print: letters, digits, spaces, hyphens and apostrophes, 16 at most. */
export const cleanName = (raw: string): string => raw.replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 16)

// ---- voice -----------------------------------------------------------------
// What the pair say outside the diary. Every line is picked from what just happened (how long the turn took, whether
// anything failed, the hour in Johannesburg), and the pick is a function of the scene, never of chance, so a replay says
// the same thing and a test can pin it.
export type Voice = 'turn' | 'ask' | 'greet' | 'hint'

const pickBy = (pool: readonly string[], s: Scene): string => pool[(s.stats.turns + s.stats.commits + s.seed) % pool.length]!

const TURN_FAST = ['{cat} did not look up', 'quick. {cat} is unimpressed', 'gone before {cat} blinked']
const TURN_MID = ['{pip} approves', '{pip} nodded once', 'a clean cast, says {pip}']
const TURN_LONG = ['{pip} dozed off', '{cat} has moved house since', 'long enough for two naps']
const TURN_ROUGH = ['{cat} saw that error first', '{pip} blames {cat}', 'bumpy. {pip} is calm about it']
const MORNING = ['good morning. {pip} is up first', 'morning. {cat} has not decided yet']
const DAY = ['{pip} is at the orb', 'daylight. {cat} took the warm spot']
const EVENING = ['evening. {pip} lit the lamp', '{cat} is awake now, as promised']
const NIGHT = ['night shift. antennae out', 'the glass is dark. {pip} keeps the orb lit']

/** `hour` is the hour in Africa/Johannesburg, 0 to 23. `ms` is only read for the turn line. */
export const quip = (kind: Voice, s: Scene, hour = 12, ms = 0): string => {
  switch (kind) {
    case 'turn':
      if (s.stats.errors > 0 && s.log.some(l => /fail/i.test(l)) && ms < 120_000) return pickBy(TURN_ROUGH, s)
      return pickBy(ms < 10_000 ? TURN_FAST : ms < 120_000 ? TURN_MID : TURN_LONG, s)
    case 'ask':
      return s.trust < 30 ? '{cat} is watching you decide, and has opinions' : s.skills > 2 ? '{pip} would cast it, if asked' : '{cat} is watching you decide'
    case 'greet': {
      const pool = hour >= 18 || hour < 5 ? NIGHT : hour < 11 ? MORNING : hour < 17 ? DAY : EVENING
      return `${pickBy(pool, s)} · /critter`
    }
    case 'hint':
      return s.look === 'wizard' ? '{pip} is casting' : s.mode === 'sit' ? '{cat} is on the laptop' : s.look === 'idle' && s.idle > 100 ? 'both asleep' : '/critter pet'
  }
}

// ---- the typeahead -------------------------------------------------------------
export type Suggestion = { text: string; label: string; description: string }
const COATS_LIST = ['orange', 'ink', 'brown', 'tabby', 'ginger', 'black', 'tuxedo', 'cream', 'grey', 'siamese', 'pair']
/** What `/critter ` offers as you type it. Pure: the draft in, rows out; only at the end of the draft, and only for /critter. */
export const suggest = (text: string, cursor: number, n: Names = NAMES_DEFAULT): Suggestion[] => {
  const m = /^\/critter\s+(?:(cat|wizard|sound|talk|name|feel)\s+)?(\S*)$/.exec(text)
  if (!m || cursor !== text.length) return []
  const [, group, typed = ''] = m
  const row = (word: string, description: string): Suggestion => ({ text: word, label: word, description })
  const list: Suggestion[] =
    group === 'cat' ? COATS_LIST.map(c => row(c, c === 'orange' ? `${n.cat}'s own coat` : c === 'pair' ? 'follows day and night' : `${n.cat} in ${c}`))
    : group === 'wizard' ? [row('auto', 'gold star by day, bolt hat by night'), row('gold', 'always the gold star'), row('bolt', 'always the violet bolt')]
    : group === 'sound' ? [row('on', 'a cast chime and a purr'), row('off', 'quiet again')]
    : group === 'talk' ? [row('on', `${n.cat} speaks after a turn; one small model call each`), row('off', `${n.cat} keeps their own counsel`)]
    : group === 'feel' ? [row('calm', 'still: no hops, no sparks, no sound'), row('warm', 'the usual'), row('playful', 'more hops, more sparks')]
    : group === 'name' ? [row('cat', `rename ${n.cat}`), row('pip', `rename ${n.pip}`)]
    : [
        row('pet', `${n.cat} allows it`), row('treat', `${n.pip} is sure it is his`), row('cast', `${n.pip} casts something`), row('nap', 'both of them sleep'),
        row('stage', 'the critter alone on an empty stage'), row('corner', `${n.cat}'s corner: moods, diary, a game`), row('diary', `what ${n.cat} wrote`),
        row('cat', 'choose a coat'), row('wizard', 'choose the wizard'), row('name', 'rename them'), row('sound', 'chime and purr'), row('talk', `let ${n.cat} speak`), row('feel', 'calm, warm or playful'),
        row('lite', 'the bar, the wizard and the orb'), row('full', 'and the rows of the transcript'), row('party', 'and every message'), row('hide', 'out of sight'), row('show', 'back again'),
      ]
  return list.filter(r => r.text.startsWith(typed.toLowerCase()) && r.text !== typed)
}


// ---- the prompt box: the draft, painted as it is typed ---------------------------
export type DraftRun = { start: number; end: number; color?: string; bold?: boolean; underline?: boolean; dimColor?: boolean; virtualText?: string }
const CLAY = '#d97757'
const TEAL = '#4fa39a'
const GOLD = '#d4a548'
/** What each /critter word does, in the pair's voice; the ghost line after a finished word. */
const WORDS = (n: Names): Record<string, string> => ({
  pet: `${n.cat} allows it`, treat: `${n.pip} is sure it is his`, cast: `${n.pip} casts something`, spell: `${n.pip} casts something`, nap: 'both of them sleep',
  stage: 'the critter alone on a stage', corner: `${n.cat}'s corner`, diary: `what ${n.cat} wrote`, hide: 'out of sight', show: 'back again',
  lite: 'the bar, the wizard, the orb', full: 'and the rows of the transcript', party: 'and every message',
  cat: 'choose a coat', wizard: 'choose the wizard', name: 'rename them', sound: 'chime and purr', talk: `let ${n.cat} speak`, feel: 'calm, warm or playful',
})
const ARGS: Record<string, string[]> = { cat: COATS_LIST, wizard: ['auto', 'gold', 'bolt'], sound: ['on', 'off'], talk: ['on', 'off'], name: ['cat', 'pip'], feel: ['calm', 'warm', 'playful'] }
/**
 * Runs to paint over a /critter draft: the command in clay, a word it knows in teal, a stray word underlined in gold, and a dim
 * ghost line after a finished word saying what it does. Pure: the draft in, runs out. Any other draft is left alone.
 */
const FAMILY: Record<string, { ghost: string; subs?: Record<string, string> }> = {
  diary: { ghost: 'what Claude did, in order', subs: { copy: 'the whole session, as markdown', clear: 'empty it' } },
  stunt: { ghost: 'the critter in a pane, a card per call' },
  everywhere: { ghost: 'your three most-used tools' },
}
export const draftRuns = (text: string, n: Names = NAMES_DEFAULT): DraftRun[] => {
  const fam = /^\/(diary|stunt|everywhere)(?=\s|$)/.exec(text)
  if (fam) {
    const f = FAMILY[fam[1]!]!
    const end = fam[0].length
    const out: DraftRun[] = [{ start: 0, end, color: CLAY, bold: true }]
    const words = [...text.matchAll(/\S+/g)].slice(1)
    const sub = words[0]
    if (!sub) return [...out, { start: end, end, dimColor: true, virtualText: ` · ${f.ghost}` }]
    const hit = f.subs?.[sub[0].toLowerCase()]
    out.push(hit ? { start: sub.index!, end: sub.index! + sub[0].length, color: TEAL } : { start: sub.index!, end: sub.index! + sub[0].length, color: GOLD, underline: true })
    if (hit && words.length === 1) out.push({ start: text.length, end: text.length, dimColor: true, virtualText: ` · ${hit}` })
    return out
  }
  const m = /^\/critter(?=\s|$)/.exec(text)
  if (!m) return []
  const out: DraftRun[] = [{ start: 0, end: 8, color: CLAY, bold: true }]
  const words = [...text.matchAll(/\S+/g)].slice(1) // the words after the command
  const sub = words[0]
  if (!sub) return out
  const word = sub[0].toLowerCase()
  const known = word in WORDS(n)
  const at = sub.index!
  out.push(known ? { start: at, end: at + sub[0].length, color: TEAL } : { start: at, end: at + sub[0].length, color: GOLD, underline: true })
  const arg = words[1]
  if (known && arg && ARGS[word]) {
    const a = arg[0].toLowerCase()
    const ok = ARGS[word]!.includes(a) || word === 'name'
    out.push(ok ? { start: arg.index!, end: arg.index! + arg[0].length, color: TEAL } : { start: arg.index!, end: arg.index! + arg[0].length, color: GOLD, underline: true })
    if (word === 'cat' && ok && words.length === 2) out.push({ start: text.length, end: text.length, dimColor: true, virtualText: ` · ${n.cat} in ${a}` })
  } else if (known && words.length === 1 && !ARGS[word]) out.push({ start: text.length, end: text.length, dimColor: true, virtualText: ` · ${WORDS(n)[word]}` })
  return out
}

// ---- the diary, as markdown -------------------------------------------------------
export const diaryParts = (line: string): { time: string; text: string } => {
  const m = /^(\d{2}:\d{2})\s+(.*)$/.exec(line)
  return m ? { time: m[1]!, text: m[2]! } : { time: '', text: line }
}
const plainMd = (s: string) => s.replace(/([\\`*_~[\]<>#])/g, '\\$1')
/** The last twelve lines, newest first, a time in code; a line cannot break the markdown it sits in. */
export const diaryMarkdown = (lines: string[], n: Names = NAMES_DEFAULT): string => {
  const head = `**${n.cat}'s diary**`
  if (!lines.length) return `${head}\n\nNothing yet. ${n.cat} was asleep.`
  const shown = lines.slice(-12).reverse().map(l => {
    const { time, text } = diaryParts(l)
    return time ? `- \`${time}\` ${plainMd(text)}` : `- ${plainMd(text)}`
  })
  return `${head} · ${lines.length} line${lines.length === 1 ? '' : 's'}\n\n${shown.join('\n')}`
}


// ---- the buttons: each says what is true now ---------------------------------------
export type Controls = { pet: string; feed: string; cast: string; nap: string; corner: string }
/** The label of each button on the bar. A cat that is sulking is made up with, not petted; a wizard mid-cast is not asked to cast. */
export const controlLabels = (s: Scene, mood: string, n: Names = NAMES_DEFAULT): Controls => ({
  pet: mood === 'sulking' ? `make up with ${n.cat}` : `pet ${n.cat}`,
  feed: `feed ${n.cat}`,
  cast: s.look === 'wizard' ? `${n.pip} is casting` : `${n.pip} casts`,
  nap: 'nap',
  corner: 'the corner',
})


// ---- the feel dial -----------------------------------------------------------------
export type Feel = 'calm' | 'warm' | 'playful'
export const FEELS: Feel[] = ['calm', 'warm', 'playful']
/**
 * One step of the scene at a chosen feel. warm is the plain step. calm lets no hop begin by itself and lets no spark or heart
 * live: the pair only breathe, walk and sleep. playful hops about three times as often as warm.
 */
export const stepFeel = (s: Scene, feel: Feel): Scene => {
  const n = step(s)
  if (feel === 'warm') return n
  if (feel === 'calm') return { ...n, jt: s.jt > 0 ? n.jt : 0, fx: n.fx.filter(f => f.k !== 'spark' && f.k !== 'heart') }
  const idleish = (s.look === 'idle' || s.look === 'done') && !isAsleep(s)
  return s.jt === 0 && n.jt === 0 && idleish && n.seed % 17 === 0 ? { ...n, jt: 1 } : n
}


// ---- the moods, in words ------------------------------------------------------------
const barOf = (v: number) => '█'.repeat(Math.round(v / 10)) + '░'.repeat(10 - Math.round(v / 10))
const MOOD_WORDS = {
  trust: [[30, 'wary'], [60, 'warming'], [80, 'fond'], [101, 'devoted']],
  joy: [[30, 'flat'], [60, 'content'], [80, 'bright'], [101, 'delighted']],
} as const
/** One mood as a line: its name, its bar, its number and a word for it. */
export const moodLine = (which: 'trust' | 'joy', v: number): string => {
  const x = Math.max(0, Math.min(100, Math.round(v)))
  const word = MOOD_WORDS[which].find(([lim]) => x < lim)![1]
  return `${which.padEnd(5)} ${barOf(x)} ${x} · ${word}`
}

// ---- the sky behind the chat --------------------------------------------------------
const SKY_STARS = Array.from({ length: 22 }, (_, i) => {
  const a = Math.imul(i + 1, 2654435761) >>> 0
  const b = Math.imul(i + 11, 1664525) >>> 0
  return { top: a % 34, left: b % 150, big: i % 5 === 0 }
})
/** The window behind the conversation: paper, a ground band, a sun or a moon, and by night a few stars at fixed places. */
export const skyOf = (w: 'day' | 'night') =>
  w === 'night'
    ? { paper: '#141413', ground: '#1c1b19', body: '☾', bodyColor: '#efe4c4', stars: SKY_STARS }
    : { paper: '#faf9f5', ground: '#f2eee3', body: '●', bodyColor: '#d4a548', stars: [] as typeof SKY_STARS }

// ---- cadence -------------------------------------------------------------------
/**
 * How many clock beats pass between one step of the scene and the next. While anything moves (work, a cast, a jump, a falling
 * cup, the game, sparks) every beat steps: four a second. When both are still it steps once a second, so the desktop is not asked
 * to redraw a picture that has not changed.
 */
export const cadence = (s: Scene): 1 | 4 => {
  const working = s.look !== 'idle' && s.look !== 'done'
  const moving = s.jt > 0 || s.fx.length > 0 || s.game.on || s.mode === 'pounce' || s.mode === 'knock' || s.mode === 'swat' || s.mode === 'yawn'
  return working || moving ? 1 : 4
}
