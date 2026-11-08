// One mod as an index card, drawn as one SVG: cream paper, ruled lines, typewriter text, a stamp that says whether it is on duty.
// The pane's SVG draws no filters and skips a shape that names a missing one, so there are none: the shadow is stacked translucent
// rectangles. Every id (there are none today) would carry the mod's name, so two cards never share one.
import { titleOf, wrap } from './catalog'
import type { Notes, State } from './catalog'

export const CARD_W = 600
export const SHOWN_W = 640

export type CardArgs = {
  id: string
  title: string
  version: string
  state: State
  line: string
  steps: string[]
  notes?: Notes
  restart: boolean
}
export type Card = { source: string; width: number; height: number; viewHeight: number; alt: string }

const INK = '#141413'
const CLAY = '#d97757'
const PAPER = '#f7f5ef'
const PAPER_ASLEEP = '#ece8de'
const RULE = '#9db4c8'
const PITCH = 22 // between ruled lines
const TOP = 124 // the first ruled line of the body
const CHARS = 58 // typewriter characters that fit between the margins at 15 px

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

type Row = { text: string; kind: 'body' | 'label' | 'note' | 'restart'; gap?: boolean }

const STAMP: Record<State, { word: string; alt: string }> = {
  on: { word: 'ON DUTY', alt: 'on duty' },
  off: { word: 'ASLEEP', alt: 'asleep' },
  missing: { word: 'NOT HERE', alt: 'not installed' },
}

/** The card as an SVG, plus the size it is shown at and a sentence for those who cannot see it. */
export const cardSvg = (a: CardArgs): Card => {
  const rows: Row[] = []
  for (const l of wrap(a.line, CHARS)) rows.push({ text: l, kind: 'body' })
  rows.push({ text: 'HOW TO USE', kind: 'label', gap: true })
  a.steps.forEach((step, i) => wrap(step, CHARS - 3).forEach((l, j) => rows.push({ text: `${j === 0 ? `${i + 1}. ` : '   '}${l}`, kind: 'body' })))
  rows.push({ text: "WHAT'S NEW", kind: 'label', gap: true })
  if (a.notes) {
    wrap(`v${a.notes.heading}`, CHARS).forEach(l => rows.push({ text: l, kind: 'body' }))
    for (const b of a.notes.bullets) wrap(b, CHARS - 2).forEach((l, j) => rows.push({ text: `${j === 0 ? '- ' : '  '}${l}`, kind: 'note' }))
  } else rows.push({ text: 'No release notes found.', kind: 'note' })
  if (a.restart) rows.push({ text: 'RESTART TO APPLY', kind: 'restart', gap: true })

  // a gap row is one blank ruled line before it
  let n = 0
  const placed = rows.map(r => { if (r.gap) n++; return { ...r, y: TOP + n++ * PITCH } })
  const viewHeight = TOP + n * PITCH + 20
  const dim = a.state !== 'on'
  const paper = a.state === 'off' ? PAPER_ASLEEP : PAPER
  const inkOpacity = a.state === 'on' ? 1 : a.state === 'off' ? 0.7 : 0.8
  const out: string[] = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHOWN_W}" height="${Math.round((viewHeight * SHOWN_W) / CARD_W)}" viewBox="0 0 ${CARD_W} ${viewHeight}" shape-rendering="geometricPrecision" role="img">`)
  // fake shadow: three stacked translucent shapes, each a little further down and right
  for (const [d, o] of [[8, 0.05], [5, 0.07], [2.5, 0.09]] as const) out.push(`<rect x="${d}" y="${d + 2}" width="${CARD_W - 8}" height="${viewHeight - 8}" rx="8" fill="${INK}" fill-opacity="${o}"/>`)
  out.push(`<rect x="1" y="1" width="${CARD_W - 8}" height="${viewHeight - 8}" rx="8" fill="${paper}"${a.state === 'missing' ? ` stroke="${INK}" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="7 5"` : ` stroke="${INK}" stroke-opacity="0.18"`}/>`)
  // the card's red head rule, then the ruled lines under every row
  out.push(`<rect x="1" y="52" width="${CARD_W - 8}" height="2.5" fill="${a.state === 'on' ? CLAY : '#a39e92'}"/>`)
  for (let y = TOP + 5; y < viewHeight - 14; y += PITCH) out.push(`<line x1="18" y1="${y}" x2="${CARD_W - 26}" y2="${y}" stroke="${RULE}" stroke-opacity="0.5" stroke-width="1"/>`)
  // the name, and the version as a chip
  out.push(`<text x="24" y="38" font-family="'Courier New', Menlo, monospace" font-size="22" font-weight="bold" fill="${INK}" fill-opacity="${inkOpacity}">${esc(a.title)}</text>`)
  if (a.version) {
    out.push(`<rect x="24" y="68" width="${9 * (a.version.length + 1) + 14}" height="24" rx="4" fill="none" stroke="${INK}" stroke-opacity="0.6"/>`)
    out.push(`<text x="31" y="85" font-family="'Courier New', Menlo, monospace" font-size="15" fill="${INK}" fill-opacity="${inkOpacity}">v${esc(a.version)}</text>`)
  }
  // the stamp: a word, a border and a mark, so on, asleep and not here differ by more than colour
  const st = STAMP[a.state]
  const sc = a.state === 'on' ? CLAY : INK
  const so = a.state === 'on' ? 1 : 0.55
  const dash = a.state === 'missing' ? ' stroke-dasharray="5 4"' : ''
  const mark = a.state === 'on'
    ? `<g data-mark="check"><path d="M-62 4 L-52 14 L-36 -6" fill="none" stroke="${sc}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${so}"/></g>`
    : a.state === 'off'
      ? `<g data-mark="dash"><rect x="-62" y="3" width="24" height="3.5" fill="${sc}" fill-opacity="${so}"/></g>`
      : `<g data-mark="dots"><circle cx="-58" cy="5" r="2.5" fill="${sc}" fill-opacity="${so}"/><circle cx="-50" cy="5" r="2.5" fill="${sc}" fill-opacity="${so}"/><circle cx="-42" cy="5" r="2.5" fill="${sc}" fill-opacity="${so}"/></g>`
  out.push(`<g transform="translate(486 74) rotate(-6)">`)
  out.push(`<rect x="-76" y="-22" width="152" height="44" rx="4" fill="none" stroke="${sc}" stroke-opacity="${so}" stroke-width="3"${dash}/>`)
  out.push(`<rect x="-71" y="-17" width="142" height="34" rx="2" fill="none" stroke="${sc}" stroke-opacity="${so * 0.6}" stroke-width="1"${dash}/>`)
  out.push(mark)
  out.push(`<text x="-26" y="6" font-family="'Courier New', Menlo, monospace" font-size="17" font-weight="bold" letter-spacing="1.5" fill="${sc}" fill-opacity="${so}">${st.word}</text>`)
  out.push(`</g>`)
  // the typewriter text
  for (const r of placed) {
    const weight = r.kind === 'label' || r.kind === 'restart' ? ' font-weight="bold"' : ''
    const size = r.kind === 'label' ? 13 : 15
    const fill = r.kind === 'restart' ? CLAY : INK
    out.push(`<text x="24" y="${r.y}" font-family="'Courier New', Menlo, monospace" font-size="${size}"${weight} fill="${fill}" fill-opacity="${r.kind === 'restart' ? 1 : r.kind === 'note' ? inkOpacity * 0.85 : inkOpacity}" xml:space="preserve">${esc(r.text)}</text>`)
  }
  out.push('</svg>')
  const height = Math.round((viewHeight * SHOWN_W) / CARD_W)
  void dim
  return { source: out.join(''), width: SHOWN_W, height, viewHeight, alt: `${a.title}, ${st.alt}. ${a.line}` }
}

export { titleOf }
