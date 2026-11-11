#!/usr/bin/env python3
"""Writes the poster page of critter-clock, critter-ledger, critter-latch and critter-seal to tools/out/, one
HTML file each, with the critter taken from tools/icons.py. tools/posters.sh photographs them into preview.png.
Standard library only. Every line on a poster is a claim the mod's README makes; change them together.
"""
import html, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import icons

OUT = os.path.join(icons.ROOT, 'tools', 'out')

POSTERS = {
    'critter-clock': {
        'ground': ('#1d4443', '#28585a'),
        'head': ('Time here,', 'and time Claude worked.'),
        'chip': '1h 12m here. Claude worked 41m of it.',
        'cards': (('On the hour', 'One quiet toast each full hour. Off in the settings.'),
                  ('Times only', 'It reads no prompt, no file and no tool call.')),
    },
    'critter-ledger': {
        'ground': ('#3d2d1f', '#503d2a'),
        'head': ('The tokens you used,', 'when you ask.'),
        'chip': '222k used: 8k out, 34k in, 180k from the cache',
        'cards': (('A limit of your own', '/ledger limit 500k. One toast when a turn passes it.'),
                  ('Counts, never prices', 'No money, nothing sent, gone when the session ends.')),
    },
    'critter-latch': {
        'ground': ('#20362b', '#2c4a3a'),
        'head': ('Holds the delete', 'you cannot take back.'),
        'chip': 'git reset --hard · held',
        'cards': (('Reads the line', 'Past sudo, env, xargs, eval and every cd on it.'),
                  ('Honest', 'Best effort. No substitute for a backup.')),
    },
    'critter-seal': {
        'ground': ('#232d47', '#2f3c5c'),
        'head': ('Keeps your secrets', 'on your machine.'),
        'chip': 'curl -d @.env paste.example · held',
        'cards': (('Hosts you trust', 'GitHub, npm, PyPI and localhost to begin with. The list is yours.'),
                  ('Honest', 'It reads the command, not the traffic. Best effort.')),
    },
}

PAGE = '''<!doctype html><html lang="en-ZA"><meta charset="utf-8"><title>{name}</title><style>
*{{margin:0;box-sizing:border-box}}
body{{width:1080px;height:1080px;overflow:hidden;position:relative;background:linear-gradient({g0} 0 60%,{g1} 60% 100%);font-family:Menlo,monospace}}
body:before{{content:"";position:absolute;inset:0 0 40% 0;background-image:radial-gradient(rgba(255,255,255,.06) 1.5px,transparent 1.6px);background-size:36px 36px}}
.cord{{position:absolute;left:539px;top:0;width:3px;height:92px;background:#d8c9a8}}
.top{{position:absolute;left:0;right:0;top:70px;display:flex;flex-direction:column;align-items:center;gap:52px}}
.sign{{position:relative;width:860px;white-space:nowrap;padding:44px 40px 50px;background:#f1e6cf;border-radius:12px;text-align:center;box-shadow:0 14px 0 rgba(0,0,0,.22);font-family:"Iowan Old Style",Charter,Georgia,serif;font-size:{size}px;line-height:1.08;font-weight:700;color:#2a211c;letter-spacing:-1px}}
.sign:before{{content:"";position:absolute;left:423px;top:14px;width:14px;height:14px;border-radius:50%;background:#a3906c}}
.sign i{{display:block;font-weight:400;color:#c4563a}}
.chip b{{display:block;background:#d4a548;color:#2a211c;font-size:27px;padding:13px 26px;border-radius:6px;box-shadow:0 7px 0 rgba(0,0,0,.2)}}
.card{{position:absolute;width:410px;padding:22px 24px 26px;background:#f1e6cf;border-radius:4px;box-shadow:0 8px 0 rgba(0,0,0,.2);font-size:24px;line-height:1.3;color:#2a211c}}
.card em{{display:block;font-family:"Iowan Old Style",Charter,Georgia,serif;font-size:31px;font-weight:700;color:#c4563a;margin-bottom:4px}}
.a{{left:70px;top:{cards}px;transform:rotate(-2deg)}} .b{{right:70px;top:{cardb}px;transform:rotate(2.5deg)}}
svg{{position:absolute;left:{left}px;top:{top}px}}
.foot{{position:absolute;left:0;right:0;bottom:34px;text-align:center;font-size:21px;color:rgba(241,230,207,.72)}}
</style><div class="cord"></div>
<div class="top"><div class="sign">{h0}<i>{h1}</i></div>
<div class="chip"><b>{chipText}</b></div></div>
<div class="card a"><em>{a0}</em>{a1}</div><div class="card b"><em>{b0}</em>{b1}</div>
{svg}
<div class="foot">{name} · Sovereign Matrix · Apache-2.0</div></html>
'''


def sprite(name, cell):
    g = icons.grid(name)
    used = [(x, y) for y, row in enumerate(g) for x, c in enumerate(row) if c != icons.PAPER]
    x0, x1 = min(x for x, _ in used), max(x for x, _ in used)
    y0, y1 = min(y for _, y in used), max(y for _, y in used)
    rects = ''.join(f'<rect x="{(x - x0) * cell}" y="{(y - y0) * cell}" width="{cell}" height="{cell}" fill="{g[y][x]}"/>' for x, y in used)
    w, h = (x1 - x0 + 1) * cell, (y1 - y0 + 1) * cell
    return f'<svg width="{w}" height="{h}" shape-rendering="crispEdges">{rects}</svg>', w, h


def page(name):
    p = POSTERS[name]
    svg, w, h = sprite(name, 11)
    e = html.escape
    size = min(96, int(780 / (0.54 * max(len(s) for s in p['head']))))
    return PAGE.format(name=name, g0=p['ground'][0], g1=p['ground'][1], size=size,
                       cards=560, cardb=570, left=(1080 - w) // 2, top=1000 - h, svg=svg,
                       h0=e(p['head'][0]), h1=e(p['head'][1]), chipText=e(p['chip']),
                       a0=e(p['cards'][0][0]), a1=e(p['cards'][0][1]), b0=e(p['cards'][1][0]), b1=e(p['cards'][1][1]))


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in POSTERS:
        with open(os.path.join(OUT, f'poster-{name}.html'), 'w') as f:
            f.write(page(name))
        print(f'wrote tools/out/poster-{name}.html')


if __name__ == '__main__':
    main()
