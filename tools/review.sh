#!/bin/zsh
# Renders the mod's own drawn trees (band, backdrop, corner, stage; day, night, storm) to PNGs: tools/out/f0..f8.png
# usage: tools/review.sh [frame numbers, default 0 3 6]   needs: claude, python3, Google Chrome (run outside the sandbox)
T=${0:A:h}; ROOT=${T:h}; OUT=$T/out; mkdir -p $OUT
W=${CRITTER_WORK:-$HOME/.claude/dev-mods/5175b3c3-33ac-486c-bf45-14b5cfd07dfd/critter-buddy}   # the work copy; falls back to the repo's plugin
[ -d $W ] || W=$ROOT/plugins/critter-buddy
rm -rf $OUT/cb && rsync -a --exclude node_modules $W/ $OUT/cb/ && cd $OUT/cb
python3 - $T <<'PY'
import sys
t=sys.argv[1]; p='tests/critter.test.tsx'; s=open(p).read()
o="on('clock.now', () => ({ value: 1_000_000_000_000 }))"
s=s.replace(o,"on('clock.now', () => ({ value: (globalThis as any).__now ?? 1_000_000_000_000 }))")
s+=open(t+'/dumptest.tsx').read(); open(p,'w').write(s)
PY
claude plugin test . 2>&1 | grep '^DUMP:' | sed 's/^DUMP://' > $OUT/dump.json
python3 $T/render.py $OUT/dump.json $OUT/review.html
cd $OUT && python3 - <<'PY'
import re
h=open('review.html').read(); head,rest=h.split('</style>',1); head+='</style>'
for i,p in enumerate(re.split(r'(?=<h3>)',rest)[1:]): open(f'f{i}.html','w').write(head+p)
PY
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for i in ${@:-0 3 6}; do "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=$OUT/chrome-profile --window-size=1500,720 --screenshot=$OUT/f$i.png file://$OUT/f$i.html >/dev/null 2>&1; done
echo "wrote $OUT/f*.png"
