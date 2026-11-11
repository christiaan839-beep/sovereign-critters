# Verify a change

What "done" means here, in the order to do it. The first two are machine checks and cost nothing; the rest is what only a
person and a real window can confirm.

1. **`bash tools/preflight.sh`** exits clean. It validates and tests every plugin, checks every sound, checks that every hook
   on the tool path fails open (`tools/check-hooks.py`), and scans for keys, home paths, model ids and emails.
2. **A new test failed first.** Break the code the test covers (invert the condition, return a wrong constant), watch it go red,
   put it back. A test that has never failed proves nothing.
3. **Look at what it draws.** `CRITTER_WORK=$PWD/plugins/critter-buddy zsh tools/review.sh 0 3 6` (outside the Claude sandbox:
   it needs headless Chrome) renders the band by day, night and storm to `tools/out/f0.png`, `f3.png`, `f6.png`. Look for a hard
   edge, a clipped piece, text over the picture, a colour that cannot be told from its ground.
4. **Restart, then look in the desktop app.** Plugins load only in a new session. In a window about 100 columns wide:
   - `/critter doctor`: surface `desktop`, the width, and the `Backdrop:` line (this app version has none, and says so).
   - `/critter perf` after 30 seconds of use: about 2 engine calls a beat while moving, 1 while still, 0 while hidden.
   - `/critter hide` then `/critter show`; `/critter corner`; `/critter stage`; `/mods`; `/diary`.
   - Ask Claude to read a few files: the band's pair works and typing stays smooth.
   - Ask for `sleep 25` in Bash: build-bell's toast and bell when it ends.
   - Ask for `git push --force origin main` in a scratch repo: `critter-ward` stops it before Bash runs.
5. **Send a photo of the whole window, not a crop,** with its width, for anything that draws.

A change that touches `critter-ward` also needs a line that tries to get past it: it is the one plugin whose job is to say no.
