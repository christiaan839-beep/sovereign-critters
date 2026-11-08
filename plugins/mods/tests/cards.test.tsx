import { expect, test } from 'claude-code/testing'

import { DEFAULT_STEPS, MODS, STEPS, parseList, parseTopEntry, safeInstallPath, titleOf, wrap } from '../hooks/catalog'
import { CARD_W, SHOWN_W, cardSvg } from '../hooks/card-svg'
import type { CardArgs } from '../hooks/card-svg'

const base = (over: Partial<CardArgs> = {}): CardArgs => ({
  id: 'critter-buddy', title: 'Critter Buddy', version: '0.22.1', state: 'on', line: 'A wizard and a cat live above your prompt and react to what Claude does.',
  steps: ['Switch it on here, then start a new session.', 'Type /critter to see what it does.'], notes: { heading: '0.23.0', bullets: ['The sky warms while Claude is thinking.'] }, restart: false, ...over,
})

// ---- the words on a card -----------------------------------------------------

test('a mod\'s name on its card is its id with the dashes turned to spaces, in title case', () => {
  expect(titleOf('critter-buddy')).toBe('Critter Buddy')
  expect(titleOf('session-diary')).toBe('Session Diary')
  expect(titleOf('crab')).toBe('Crab')
  expect(titleOf('build-bell')).toBe('Build Bell')
})

test('every mod has a plain one-liner and two or three short steps, and the steps table falls back to the default two', () => {
  expect(DEFAULT_STEPS).toEqual(['Switch it on here, then start a new session.', 'Type / in the chat box to see its commands.'])
  for (const m of MODS) {
    const steps = STEPS[m.id] ?? DEFAULT_STEPS
    expect(steps.length).toBeGreaterThanOrEqual(2)
    expect(steps.length).toBeLessThanOrEqual(3)
    for (const s of steps) { expect(s.length).toBeGreaterThan(10); expect(s.length).toBeLessThanOrEqual(70) }
    expect(m.line.length).toBeGreaterThan(20)
    expect(m.line.length).toBeLessThanOrEqual(90)
    expect(m.line).not.toMatch(/\b(hook|atom|pane|SVG|render|API|store)\b/i) // plain words: no engine talk on a card
  }
  expect(new Set(MODS.map(m => m.line)).size).toBe(8)
})

test('the top entry of a changelog is its first heading and its first two bullets, cleaned and cut', () => {
  const md = '# Changelog\n\n## 0.23.0\n\n- **The sky answers you.** While Claude is `thinking`, the paper warms.\n- Second thing that changed.\n- A third that is left out.\n\n## 0.22.1\n\n- Older.\n'
  expect(parseTopEntry(md)).toEqual({ heading: '0.23.0', bullets: ['The sky answers you. While Claude is thinking, the paper warms.', 'Second thing that changed.'] })
  expect(parseTopEntry('# Changelog\n')).toBeUndefined()
  expect(parseTopEntry('')).toBeUndefined()
  expect(parseTopEntry('## 1.0.0\n\nNo bullets here, only prose.\n')).toEqual({ heading: '1.0.0', bullets: [] })
  const long = parseTopEntry('## 2.0\n- ' + 'word '.repeat(60))!
  expect(long.bullets[0]!.length).toBeLessThanOrEqual(110)
  expect(long.bullets[0]!.endsWith('…')).toBe(true)
  expect(parseTopEntry('## 0.1.0\n- exactly\n## 0.0.9\n- older')!.bullets).toEqual(['exactly']) // stops at the next heading
  expect(parseTopEntry(('## 3.0.0\n- ' + 'x'.repeat(110) + '\n'))!.bullets[0]).toBe('x'.repeat(110)) // 110 stays whole
})

test('an install path from the plugin manager is trusted only if it is this marketplace\'s cache folder for that mod', () => {
  const ok = '/srv/u/.claude/plugins/cache/sovereign-critters/crab/0.2.0'
  expect(safeInstallPath(ok, 'crab')).toBe(ok)
  expect(safeInstallPath(ok, 'forge')).toBeUndefined() // another mod's folder
  expect(safeInstallPath('/srv/u/.claude/plugins/cache/sovereign-critters/crab/0.2.0/../../..', 'crab')).toBeUndefined()
  expect(safeInstallPath('/srv/u/.claude/plugins/cache/other/crab/0.2.0', 'crab')).toBeUndefined()
  expect(safeInstallPath('relative/path/crab/0.2.0', 'crab')).toBeUndefined()
  expect(safeInstallPath('/a b/plugins/cache/sovereign-critters/crab/0.2.0', 'crab')).toBe('/a b/plugins/cache/sovereign-critters/crab/0.2.0') // a space is fine: no shell is involved
  expect(safeInstallPath('/x/plugins/cache/sovereign-critters/crab/0.2.0\n', 'crab')).toBeUndefined()
  expect(safeInstallPath(undefined, 'crab')).toBeUndefined()
  expect(safeInstallPath(42, 'crab')).toBeUndefined()
  const list = parseList(JSON.stringify([{ id: 'crab@sovereign-critters', version: '0.2.0', enabled: true, installPath: ok }, { id: 'forge@sovereign-critters', version: '1', enabled: true, installPath: '/etc/passwd' }]))
  expect(list[0]!.installPath).toBe(ok)
  expect(list[1]!.installPath).toBeUndefined()
})

test('text wraps at a width in characters, on spaces, and never loses a word', () => {
  expect(wrap('one two three', 20)).toEqual(['one two three'])
  expect(wrap('one two three', 7)).toEqual(['one two', 'three'])
  expect(wrap('one two three', 8)).toEqual(['one two', 'three'])
  expect(wrap('one two three', 13)).toEqual(['one two three']) // exactly the width
  expect(wrap('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']) // a word longer than the line is broken
  expect(wrap('', 10)).toEqual([''])
  const text = 'the quick brown fox jumps over the lazy dog and keeps running far away'
  expect(wrap(text, 16).join(' ')).toBe(text)
  for (const l of wrap(text, 16)) expect(l.length).toBeLessThanOrEqual(16)
})

// ---- the card itself ---------------------------------------------------------

test('a card is one SVG, 600 wide, shown at 640, in cream paper and ink, with no filter and no id that is not the mod\'s own', () => {
  const c = cardSvg(base())
  expect(CARD_W).toBe(600)
  expect(SHOWN_W).toBe(640)
  expect(c.source).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /)
  expect(c.source).toContain('viewBox="0 0 600 ')
  expect(c.width).toBe(640)
  expect(c.height).toBe(Math.round(c.viewHeight * 640 / 600))
  expect(c.source).toContain('#f7f5ef') // the paper
  expect(c.source).toContain('#141413') // the ink
  expect(c.source).toContain('monospace')
  expect(c.source).not.toMatch(/filter|feGaussianBlur|feDropShadow|<script|href=|onload|onclick|<image|<foreignObject/i)
  for (const m of c.source.matchAll(/\bid="([^"]*)"/g)) expect(m[1]).toMatch(/^mods-critter-buddy-/)
  for (const m of c.source.matchAll(/url\(#([^)]*)\)/g)) expect(m[1]).toMatch(/^mods-critter-buddy-/)
})

test('the stamp reads differently when the mod is on, asleep and not installed, and each also has its own mark, so colour is never the only difference', () => {
  const on = cardSvg(base({ state: 'on' })).source
  const off = cardSvg(base({ state: 'off' })).source
  const miss = cardSvg(base({ state: 'missing', version: '' })).source
  expect(on).toContain('ON DUTY')
  expect(on).not.toContain('ASLEEP')
  expect(off).toContain('ASLEEP')
  expect(off).not.toContain('ON DUTY')
  expect(miss).toContain('NOT HERE')
  expect(on).toContain('#d97757') // the clay stamp
  expect(off).not.toContain('#d97757') // asleep is not stamped in clay
  expect(on).toContain('data-mark="check"') // a tick for on
  expect(off).toContain('data-mark="dash"') // a dash for asleep
  expect(miss).toContain('data-mark="dots"') // dots for not here
  expect(miss).toContain('stroke-dasharray') // a dashed outline for a card that is not here
  expect(new Set([on, off, miss]).size).toBe(3)
  // the card of a mod that is on is the livelier paper
  expect(on).toContain('fill="#f7f5ef"')
  expect(off).toContain('fill="#ece8de"')
})

test('the text on a card is the name, the version, the plain line, the steps and the newest release notes, and nothing is lost to the width', () => {
  const s = cardSvg(base()).source
  expect(s).toContain('Critter Buddy')
  expect(s).toContain('v0.22.1')
  expect(s).toContain('HOW TO USE')
  expect(s).toContain("WHAT&apos;S NEW")
  expect(s).toContain('0.23.0')
  expect(s).toContain('The sky warms while Claude is thinking.')
  for (const w of 'A wizard and a cat live above your prompt and react to what Claude does.'.split(' ')) expect(s).toContain(w)
  expect(s).toContain('1.')
  expect(s).toContain('2.')
  expect(cardSvg(base({ steps: ['a step one is here', 'step two is here', 'step three is here'] })).source).toContain('3.')
  expect(cardSvg(base({ notes: undefined })).source).toContain('No release notes found.')
  expect(cardSvg(base({ restart: true })).source).toContain('RESTART TO APPLY')
  expect(cardSvg(base({ restart: false })).source).not.toContain('RESTART TO APPLY')
})

test('whatever a mod, a changelog or a step says is escaped, so a card can never carry markup', () => {
  const s = cardSvg(base({ title: 'A & B <x>', line: 'say "hi" & </text><script>', steps: ['Type /crab hold <note> now to go', 'Use <b>bold</b> & \'quotes\' here'], notes: { heading: '1 < 2', bullets: ['</svg><rect/>'] } })).source
  expect(s).not.toMatch(/<script|<b>|<note>|<\/svg><rect|<x>/)
  expect(s).toContain('&lt;note&gt;')
  expect(s).toContain('A &amp; B &lt;x&gt;')
  expect((s.match(/<svg /g) ?? []).length).toBe(1)
})

test('a card is taller for more to say, every ruled line lies inside it, and no text line is wider than the paper', () => {
  const short = cardSvg(base({ notes: undefined, steps: ['Switch it on here, then start a new session.', 'Type / to see its commands.'] }))
  const long = cardSvg(base({ line: 'word '.repeat(40).trim(), steps: ['step '.repeat(14).trim(), 'step '.repeat(14).trim(), 'step '.repeat(14).trim()], notes: { heading: '9.9.9', bullets: ['note '.repeat(20).trim(), 'note '.repeat(20).trim()] } }))
  expect(long.viewHeight).toBeGreaterThan(short.viewHeight)
  for (const c of [short, long]) {
    for (const m of c.source.matchAll(/<line [^>]*y1="([\d.]+)"/g)) expect(Number(m[1])).toBeLessThan(c.viewHeight)
    for (const m of c.source.matchAll(/<text [^>]*>([^<]*)<\/text>/g)) expect(m[1]!.replace(/&[a-z]+;/g, 'x').length).toBeLessThanOrEqual(62)
  }
  expect(short.viewHeight).toBeGreaterThan(200)
  expect(long.viewHeight).toBeLessThan(900)
})

test('fake shadows are stacked translucent shapes, not a filter', () => {
  const s = cardSvg(base()).source
  expect((s.match(/fill-opacity="0\.\d+"/g) ?? []).length).toBeGreaterThanOrEqual(2)
  expect(s).not.toMatch(/filter=/)
})

test('the alt text says the mod, its state and its line, in words', () => {
  expect(cardSvg(base()).alt).toBe('Critter Buddy, on duty. A wizard and a cat live above your prompt and react to what Claude does.')
  expect(cardSvg(base({ state: 'off' })).alt).toMatch(/^Critter Buddy, asleep\./)
  expect(cardSvg(base({ state: 'missing' })).alt).toMatch(/^Critter Buddy, not installed\./)
})

test('the restart note is bold and at full strength on a card that is otherwise faded', () => {
  const s = cardSvg(base({ state: 'off', restart: true })).source
  expect(s).toMatch(/font-weight="bold" fill="#d97757" fill-opacity="1" xml:space="preserve">RESTART TO APPLY/)
})

test('the stamp of a card that is not here has a dashed border, the shadow is three layers, and a changelog bullet of 111 characters is cut where 110 is not', () => {
  expect(cardSvg(base({ state: 'missing', version: '' })).source).toContain('stroke-width="3" stroke-dasharray="5 4"')
  expect(cardSvg(base({ state: 'on' })).source).not.toContain('stroke-width="3" stroke-dasharray="5 4"')
  expect((cardSvg(base()).source.match(/fill="#141413" fill-opacity="0\.0[579]"/g) ?? []).length).toBe(3)
  const cut = parseTopEntry('## 1\n- ' + 'y'.repeat(111))!.bullets[0]!
  expect(cut).toBe('y'.repeat(109) + '…')
  expect([...cut].length).toBe(110)
  expect(safeInstallPath('/a/../plugins/cache/sovereign-critters/crab/1.0.0', 'crab')).toBeUndefined() // a way up in the front of the path
})
