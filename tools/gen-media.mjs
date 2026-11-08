import { mkdirSync, writeFileSync } from 'node:fs'
import * as S from './scene.ts'
import * as W from './world.ts'

const FONT = `font:13px/1.25 'SF Mono',Menlo,monospace`
const sky = (o) => W.skyFor({ festive: false, season: 'spring', ...o })
const skyHtml = (k) => `
<div style="position:absolute;inset:0;background:${k.paper};overflow:hidden">
  <div style="position:absolute;left:0;right:0;bottom:0;height:30%;background:${k.ground}">
    <div style="position:absolute;top:-1.25em;left:0;white-space:pre;color:${k.ridgeColour}">${W.RIDGE}</div></div>
  ${k.bodyHidden ? '' : `<div style="position:absolute;top:${k.bodyTop * 1.25}em;right:6ch;color:${k.bodyColor}">${k.body}</div>`}
  ${k.clouds.map(c => `<div style="position:absolute;top:${c.top * 1.25}em;left:${c.left}ch;color:${k.cloudColour};white-space:pre">▂▄▆██▆▄▂</div>`).join('')}
  ${k.wisps.map(c => `<div style="position:absolute;top:${c.top * 1.25}em;left:${c.left}ch;color:${k.cloudColour};white-space:pre">▁▂▃▃▂▁</div>`).join('')}
  ${k.rain.map(c => `<div style="position:absolute;top:${c.top * 1.25}em;left:${c.left}ch;color:${k.cloudColour}">╲</div>`).join('')}
  ${k.bolt ? `<div style="position:absolute;top:${k.bolt.top * 1.25}em;left:${k.bolt.left}ch;color:#c9a8ff">⚡</div>` : ''}
  ${k.stars.map(c => `<div style="position:absolute;top:${c.top * 1.25}em;left:${c.left}ch;color:${c.big ? '#d4a548' : '#8f7cc4'};opacity:${c.big ? 1 : .55}">${c.big ? '✦' : '·'}</div>`).join('')}
</div>`
const ink = (k) => (k.paper < '#80' ? '#e8e6dc' : '#141413')
const band = (s, k, label, mood, w) => `
<div style="position:absolute;inset:0;${FONT};color:${ink(k)}">${skyHtml(k)}
  <div style="position:absolute;left:0;right:0;top:${w.top}px;display:flex;flex-direction:column;align-items:center">${S.paintSvg(s, 5).source.replace('<svg ', '<svg style="display:block" ')}
    <div style="margin-top:10px"><b style="font-weight:600">${label}</b> <span style="opacity:.6">· cat ${mood}</span></div></div></div>`

const page = (w, h, inner, extra = '') => `<!doctype html><meta charset=utf-8><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#000}${extra}</style><body><div style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${inner}</div>`

// ---- the loop: a working day, then dusk, night, a storm, and morning again ----
mkdirSync('frames', { recursive: true })
const moods = (s) => (s.mode === 'loaf' ? 'unbothered' : s.mode === 'walk' ? 'on patrol' : s.mode === 'alert' ? 'watching' : s.mode === 'sit' ? 'on the laptop' : s.mode === 'purr' ? 'purring' : s.mode === 'yawn' ? 'yawning' : s.mode)
const script = [
  // [frames, look, label, sky opts, night]
  [8, 'reader', 'reading 3 files', { phase: 'day', weather: 'clear' }],
  [8, 'chef', 'cooking a build', { phase: 'day', weather: 'clear' }],
  [8, 'wizard', 'casting a skill', { phase: 'day', weather: 'clear' }],
  [8, 'done', 'done, 7 tools', { phase: 'day', weather: 'clear' }],
  [6, 'idle', 'ready', { phase: 'dusk', weather: 'cloud' }],
  [8, 'idle', 'ready', { phase: 'night', weather: 'clear' }],
  [8, 'coder', 'editing retry.ts', { phase: 'night', weather: 'rain' }],
  [6, 'idle', 'ready', { phase: 'dawn', weather: 'clear' }],
]
let s = { ...S.initial(), cols: 80, kx: 40, cx: 10 }
let n = 0
for (const [count, look, label, o] of script) {
  for (let i = 0; i < count; i++) {
    s = { ...S.stepFeel({ ...s, look, label, night: o.phase === 'night' || o.phase === 'dusk', cols: 80 }, 'playful') }
    const k = sky(o)
    const html = page(640, 340, band(s, k, label, moods(s), { top: 70 }))
    writeFileSync(`frames/f${String(n++).padStart(3, '0')}.html`, html)
  }
}
console.log('frames', n)

// ---- the poster: 1080 x 1350 ----
const barOf = (n, max, width = 12) => { if (n <= 0) return ''; const e = Math.max(1, Math.round((n / max) * width * 8)); return '█'.repeat(Math.floor(e / 8)) + ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'][e % 8] }
const win = (o, look, label, nightish, left) => {
  let t = { ...S.initial(), cols: 76, kx: 40, cx: 8, look }
  for (let i = 0; i < 6; i++) t = S.stepFeel({ ...t, look, label, night: nightish, cols: 76 }, 'playful')
  const k = sky(o)
  return `<div style="position:absolute;left:${left}px;top:545px;width:330px;height:250px;border-radius:14px;overflow:hidden;box-shadow:0 18px 36px #0006;${FONT};color:${ink(k)}">
    ${skyHtml(k)}
    <div style="position:absolute;left:0;right:0;top:62px;display:flex;flex-direction:column;align-items:center">${S.paintSvg(t, 4).source.replace('<svg ', '<svg style="display:block" ')}
      <div style="margin-top:12px;font-size:13px"><b>${label}</b></div></div></div>`
}
const card = (x, y, rot, w, inner) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg);background:#f1e6cf;border-radius:8px;padding:22px 26px;box-shadow:0 14px 28px #0005;color:#2a1f16">${inner}</div>`
const serifI = 'font-family:Georgia,serif;font-style:italic;font-weight:700;color:#c4553a;font-size:30px'
const mono = "font:600 19px/1.35 'SF Mono',Menlo,monospace"
const week = [['Mon', 31], ['Tue', 54], ['Wed', 12], ['Thu', 48], ['Fri', 77], ['Sat', 0], ['Sun', 9]]
const poster = `
<div style="position:absolute;inset:0;background:linear-gradient(#2f3a28,#4d5c3d 55%,#44543a)"></div>
<div style="position:absolute;left:539px;top:0;width:2px;height:96px;background:#cbbd9b"></div>
<div style="position:absolute;left:150px;top:92px;width:780px;height:300px;background:#f1e6cf;border-radius:10px;box-shadow:0 22px 40px #0006;text-align:center;font-family:Georgia,serif">
  <div style="font-size:104px;font-weight:700;line-height:1;margin-top:44px;color:#2a1f16;letter-spacing:-2px">Your terminal</div>
  <div style="font-size:104px;font-style:italic;line-height:1.05;color:#c4553a;letter-spacing:-2px">has company.</div></div>
<div style="position:absolute;left:150px;top:432px;width:780px;text-align:center"><span style="display:inline-block;background:#d4a548;color:#2a1f16;padding:14px 26px;border-radius:7px;${mono};font-size:21px;white-space:nowrap">/critter · a wizard, a cat, a sky that keeps the hour</span></div>
${win({ phase: 'day', weather: 'clear' }, 'reader', 'reading 3 files', false, 30)}
${win({ phase: 'night', weather: 'clear' }, 'idle', 'ready', true, 375)}
${win({ phase: 'night', weather: 'storm' }, 'coder', 'editing retry.ts', true, 720)}
${card(50, 860, -2, 395, `<div style="${serifI}">Friday.</div><div style="${mono}">Pip is wrapping things up neatly · day 5 together</div>`)}
${card(540, 835, 1.5, 450, `<div style="${serifI}">The glass is full.</div><div style="${mono}">Biscuit is sitting on the compact button · 93% full</div>`)}
${card(250, 1020, -1, 580, `<div style="${serifI};font-size:26px">/diary week</div><div style="font:600 16px/1.4 'SF Mono',Menlo,monospace;white-space:pre">${week.map(([d, n]) => `${d}  ${barOf(n, 77).padEnd(12, ' ')}  ${n ? n + ' calls' : 'quiet'}`).join('\n')}</div>`)}
<div style="position:absolute;left:0;right:0;top:1300px;text-align:center;color:#cbbd9b;${mono};font-weight:400;font-size:20px">Claude's critter · fan art · not affiliated with Anthropic</div>`
writeFileSync('poster.html', page(1080, 1350, poster))
