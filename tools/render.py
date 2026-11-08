import json,html,sys
d=json.load(open(sys.argv[1]))
def css(p):
    s=[]
    p=p or {}
    pos=p.get('position')
    if pos=='absolute': s.append('position:absolute')
    for k,u in (('top','em'),('left','ch'),('right','ch'),('bottom','em')):
        if k in p: s.append(f'{k}:{p[k]}{u}')
    for k in('width','height'):
        v=p.get(k)
        if v is not None: s.append(f'{k}:{v}' if isinstance(v,str) else f'{k}:{v}{"ch" if k=="width" else "em"}')
    if 'backgroundColor' in p: s.append('background:'+p['backgroundColor'])
    s.append('display:flex;flex-direction:'+p.get('flexDirection','row'))
    if 'justifyContent' in p: s.append('justify-content:'+{'center':'center','flex-end':'flex-end','space-between':'space-between'}.get(p['justifyContent'],'flex-start'))
    if 'alignItems' in p: s.append('align-items:'+{'center':'center','flex-end':'flex-end'}.get(p['alignItems'],'flex-start'))
    if p.get('flexWrap')=='wrap': s.append('flex-wrap:wrap')
    if 'columnGap' in p: s.append(f'column-gap:{p["columnGap"]}ch')
    if 'rowGap' in p: s.append(f'row-gap:{p["rowGap"]}em')
    for k,c in (('paddingX','ch'),('paddingY','em'),('padding','ch'),('marginTop','em'),('marginBottom','em'),('marginX','ch'),('paddingLeft','ch'),('paddingRight','ch')):
        if k in p:
            n={'paddingX':'padding-left:%s;padding-right:%s','paddingY':'padding-top:%s;padding-bottom:%s','padding':'padding:%s','marginTop':'margin-top:%s','marginBottom':'margin-bottom:%s','marginX':'margin-left:%s;margin-right:%s','paddingLeft':'padding-left:%s','paddingRight':'padding-right:%s'}[k]
            v=f'{p[k]}{c}'; s.append(n.replace('%s',v))
    return ';'.join(s)
def r(n):
    if isinstance(n,str): return html.escape(n)
    t=n.get('type'); p=n.get('props') or {}; ch=''.join(r(c) for c in n.get('children') or [])
    if t=='Box': return f'<div style="{css(p)}">{ch}</div>'
    if t=='Text':
        s=[]
        if 'color' in p: s.append('color:'+p['color'])
        if 'backgroundColor' in p: s.append('background:'+p['backgroundColor'])
        if p.get('dimColor'): s.append('opacity:.55')
        if p.get('bold'): s.append('font-weight:700')
        if p.get('italic'): s.append('font-style:italic')
        if p.get('underline'): s.append('text-decoration:underline')
        return f'<span style="white-space:pre;{";".join(s)}">{ch}</span>'
    if t=='Button': return f'<span class="btn">{html.escape(str(p.get("label","")))}<i>{html.escape(str(p.get("hotkey","")))}</i></span>'
    if t=='Svg': return f'<span class="svg">{p.get("source","")}</span>'
    return f'<div style="{css(p)}" title="{t}">{ch}</div>'
frames=[]
for w in ('day','night','storm'):
    bg={'day':'#faf9f5','night':'#141413','storm':'#e9e7df'}[w]
    fg={'day':'#141413','night':'#e8e6dc','storm':'#141413'}[w]
    fake=''.join(f'<div style="opacity:.5">{x}</div>' for x in ['> make the build quiet again','','  I read the failing test and traced it to the retry loop.','  The fix is small: cap the attempts and keep the message.','','  Edit  src/retry.ts','  Bash  npm test   ✓ 41 passed','','  Done. The loop now stops after five attempts.'])
    back=r(d[f'{w}-backdrop'])
    frames.append(f'<h3>{w}: backdrop + band, 110 columns</h3><div class="frame" style="width:110ch;height:34em;color:{fg};background:{bg}"><div class="bd">{back}</div><div class="tx" style="padding:1em 3ch">{fake}</div><div class="band">{r(d[f"{w}-band"])}</div><div class="prompt">╭──────────────────────────────────────────────────────────────╮<br>│ &gt;                                                           │<br>╰──────────────────────────────────────────────────────────────╯</div></div>')
    for n in('corner','stage'):
        frames.append(f'<h3>{w}: {n} pane docked, 60 columns (with backdrop beside)</h3><div class="frame" style="width:150ch;height:40em;color:{fg};background:{bg}"><div class="bd">{back}</div><div class="tx" style="padding:1em 3ch;width:84ch">{fake}</div><div class="pane" style="width:60ch;color:{fg}">{r(d[f"{w}-{n}"])}</div></div>')
open(sys.argv[2],'w').write('''<!doctype html><meta charset=utf-8><style>
body{margin:20px;background:#555;font:14px/1.25 "SF Mono",Menlo,monospace;color:#ddd}
h3{font:600 13px system-ui;margin:24px 0 6px;color:#fff}
.frame{position:relative;overflow:hidden;border-radius:8px}
.bd,.tx,.band,.prompt,.pane{position:absolute}
.bd{inset:0}.tx{top:0;left:0}.band{bottom:5em;left:0;width:110ch}
.prompt{bottom:.5em;left:3ch;opacity:.6;white-space:nowrap}
.pane{top:0;right:0;bottom:0;border-left:1px solid #8884;padding:1em 0}
.btn{border:1px solid #8886;border-radius:4px;padding:0 1ch;white-space:nowrap}.btn i{opacity:.5;margin-left:1ch;font-style:normal}
.svg svg{display:block;max-width:100%;height:auto}
</style>'''+''.join(frames))
