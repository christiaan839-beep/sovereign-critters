# Quality

What has been checked for each mod, against a release bar, as facts with dates. A row says what was checked and when, never how good the mod is, and it never claims more than its evidence.

- **Measured** (the version, tests passing, strict validation, hooks that fail open): read from the plugins by `tools/quality.py`, so they cannot drift. `bash tools/preflight.sh` tells you when this file is out of date; `python3 tools/quality.py --write` brings it up to date.
- **Witnessed** (reviews, sightings in the real app, a cold install, new tests watched failing first): written by people in `tools/quality-facts.json`, each with the date and the commit it was about. A witnessed fact is **fresh** only while the part of the plugin it is about has not changed since that commit (a review or a sighting: the hooks, tests and sounds; the docs audit: the README and the hooks; a cold install: the whole plugin). After such a change it shows **stale** until someone looks again.

## The release bar

Eight gates. The lead mods (the first three) must meet all eight before release. The others must meet the first six (all but the desktop sighting and the cold install) to be on the shelf of extras, and all eight to be released.

| Mod | Tests pass | Strict validation | Hooks fail open | New tests failed first | Independent code review | Seen in the desktop app | Docs audited | Cold install by someone else | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| critter-buddy | met | met | met | stale | stale | stale | stale | open | Not ready: 5 of 8 open |
| critter-mods | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |
| critter-ward | met | met | met | met | met | open | met | open | Not ready: 2 of 8 open |
| critter-diary | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |
| critter-bell | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |
| critter-crab | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |
| critter-stunt | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |
| critter-tally | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |
| critter-measure | met | met | met | open | met | open | met | open | Not ready: 3 of 8 open |

met: done, and nothing has changed since. stale: done, but the plugin has changed since, so it needs another look. open: not done yet.

## The whole repository

- 2026-11-11 (at 1fbc7d5): gitleaks over the full git history. Found: no leaks (re-run on 107 commits the same day).
- 2026-11-11 (at d6bd248): a cold clone installs and passes preflight. Found: it does (checked in the audit session; this is a reproducibility check, not the cold install by someone else that the bar asks for).

## The lead mods

### critter-buddy 0.30.2

| | |
| --- | --- |
| Tests passing | 176 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): independent code review of the clock, the painter cache, the band sky, trust and pane width. Found: 2 confirmed bugs and 5 smaller; all fixed with a test that failed first.
- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: 14 claims corrected across the repo.
- 2026-11-11 (at 10f284e): read against the official mods guide and the host's own type declarations. Found: a subagent's turn.complete was counted as the person's turn; fixed with a test that failed first.

**New tests watched failing first**

- 2026-11-11 (at 0729a52): every test added that day (the clock, the painters, the sky, trust, pane width, the prompt box words) was watched failing on the old code, then passing.

**Seen working in the real app**

- 2026-11-11 (at 7bb227d), Claude desktop app: the band and its buttons, the sky in the band, /critter doctor, /critter perf, the prompt box colouring.

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the corner and the stage have not been seen in the real app
- the cat overlapping Pip when a side panel opens was seen once and not reproduced

### critter-mods 0.6.0

| | |
| --- | --- |
| Tests passing | 63 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: stamp words, line counts and what /mods needs corrected.
- 2026-11-11 (at 3c843c2): independent code review (injection, state, card painter, README claims). Found: one high finding (an unreadable plugin list looked like "nothing installed") and four smaller ones fixed with tests; open and not fixed: the pane is not re-read after a failed or timed-out switch, "install all" hides which installs failed, session start waits up to 20 s on the plugin manager, a double press runs the CLI twice.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the index cards have not been photographed in the real app
- a failed or timed-out switch leaves the pane stale
- "install all" does not say which installs failed

### critter-ward 0.2.0

| | |
| --- | --- |
| Tests passing | 68 |
| Strict validation | passes |
| Tool-path hooks | fails closed on purpose: when it cannot tell where a push goes, the push waits |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 2 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): independent red-team for ways past it. Found: 5 bypasses (piped scripts, an alias made on the line, xargs -I%, hidden command names), all fixed with a test that failed first; 2 gaps documented.
- 2026-11-11 (at 1fbc7d5): second independent red-team round, run by the audit session (about 280 spellings of pushes to main and of force pushes). Found: no bypass.
- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: the claim of no network and nothing read outside the session was corrected to say that guard runs git locally.
- 2026-11-11 (at d2ecd7d): closing the alias gap the second red-team round left open. Found: a git alias in a config file ran unjudged; now read from git config and judged, with a test that failed first.

**New tests watched failing first**

- 2026-11-11 (at cf08b68): the nine lines that used to get past it, each with a test that failed on the old code, then passed.

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen stopping a push in the real app
- a program that changes main or .git/HEAD earlier on the line is not tracked (documented)

## The others

### critter-diary 0.6.0

| | |
| --- | --- |
| Tests passing | 30 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 10f284e): read against the official mods guide and the host's own type declarations. Found: a subagent's turn.complete was counted as the person's turn; fixed with a test that failed first.
- 2026-11-11 (at 3c843c2): independent code review (timing, storage, privacy, claims). Found: nothing high; open and not fixed: the week is held in session-scoped state so the README promise of 14 days does not hold after a restart, "/diary clear" leaves the week counts, a duration can print "1 min 60 s" or "1 ms", an MCP tool name goes unescaped into the postcard. Privacy confirmed: names and times only.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- the 14-day week does not survive a restart (session-scoped state)
- /diary clear does not clear the week

### critter-bell 0.6.0

| | |
| --- | --- |
| Tests passing | 20 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface that plays sound or shows toasts |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: failure toast, playback and tick wording corrected.
- 2026-11-11 (at 10f284e): read against the official mods guide and the host's own type declarations. Found: a subagent's turn.complete was counted as the person's turn; fixed with a test that failed first.
- 2026-11-11 (at 3c843c2): independent code review (timing, failure modes, claims). Found: nothing high; open and not fixed: its three settings (minSeconds, sound, shortTurns) have no declared way to be set, a long command rings twice (command and turn), the bell is awaited before the tool result returns, the time may include the permission dialog.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never heard or seen in the real app
- where its three settings are set is not documented
- its three settings cannot be set (no declared user configuration)
- a long command rings twice

### critter-crab 0.3.0

| | |
| --- | --- |
| Tests passing | 24 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: the root README line described an older version.
- 2026-11-11 (at 3c843c2): independent code review (note storage, unicode, folder key). Found: one small finding fixed (direction controls could reverse a note); open and not fixed: /crab drop does nothing if the store could not be read at start, two folders writing at once can overwrite each other, the folder key is the raw path as given.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- /crab drop after a failed store read

### critter-stunt 0.2.0

| | |
| --- | --- |
| Tests passing | 15 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 3c843c2): independent code review (timers, cards). Found: nothing high; open and not fixed: the 160 ms follow-up timer is not cancelled when the pane closes. Cards show tool names only.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- the follow-up timer outlives the pane for up to 160 ms

### critter-tally 0.2.0

| | |
| --- | --- |
| Tests passing | 8 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 3c843c2): independent code review (counts, raster). Found: nothing high; the raster encoding is right for zero to three tools. Open: ties in the top three go to the tool called first (undocumented).

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app

### critter-measure 0.2.0

| | |
| --- | --- |
| Tests passing | 7 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface (it is a tool the model calls) |
| Verdict | Not ready: 3 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.
- 2026-11-11 (at 3c843c2): independent code review (counting, inputs). Found: two found and fixed (a non-string input was counted as text, a very long text could overflow the stack in Node); the README now says what it returns.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never called by the model in the real app
