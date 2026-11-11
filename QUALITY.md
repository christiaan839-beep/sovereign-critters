# Quality

What has been checked for each mod, against a release bar, as facts with dates. A row says what was checked and when, never how good the mod is, and it never claims more than its evidence.

- **Measured** (the version, tests passing, strict validation, hooks that fail open): read from the plugins by `tools/quality.py`, so they cannot drift. `bash tools/preflight.sh` tells you when this file is out of date; `python3 tools/quality.py --write` brings it up to date.
- **Witnessed** (reviews, sightings in the real app, a cold install, new tests watched failing first): written by people in `tools/quality-facts.json`, each with the date and the commit it was about. A witnessed fact is **fresh** only while that plugin has not changed since that commit; after any change it shows **stale** until someone looks again.

## The release bar

Eight gates. The lead mods (the first three) must meet all eight before release. The others must meet the first six (all but the desktop sighting and the cold install) to be on the shelf of extras, and all eight to be released.

| Mod | Tests pass | Strict validation | Hooks fail open | New tests failed first | Independent code review | Seen in the desktop app | Docs audited | Cold install by someone else | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| critter-buddy | met | met | met | stale | stale | stale | stale | open | Not ready: 5 of 8 open |
| mods | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |
| guard | met | met | met | stale | stale | open | open | open | Not ready: 5 of 8 open |
| session-diary | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |
| build-bell | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |
| crab | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |
| stunt | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |
| everywhere | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |
| forge | met | met | met | open | open | open | stale | open | Not ready: 5 of 8 open |

met: done, and nothing has changed since. stale: done, but the plugin has changed since, so it needs another look. open: not done yet.

## The lead mods

### critter-buddy 0.29.1

| | |
| --- | --- |
| Tests passing | 169 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): independent code review of the clock, the painter cache, the band sky, trust and pane width. Found: 2 confirmed bugs and 5 smaller; all fixed with a test that failed first.
- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: 14 claims corrected across the repo.

**New tests watched failing first**

- 2026-11-11 (at 0729a52): every test added that day (the clock, the painters, the sky, trust, pane width, the prompt box words) was watched failing on the old code, then passing.

**Seen working in the real app**

- 2026-11-11 (at 7bb227d), Claude desktop app: the band and its buttons, the sky in the band, /critter doctor, /critter perf, the prompt box colouring.

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the corner and the stage have not been seen in the real app
- the cat overlapping Pip when a side panel opens was seen once and not reproduced

### mods 0.5.3

| | |
| --- | --- |
| Tests passing | 54 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: stamp words, line counts and what /mods needs corrected.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- the index cards have not been photographed in the real app
- no independent code review yet

### guard 0.1.3

| | |
| --- | --- |
| Tests passing | 67 |
| Strict validation | passes |
| Tool-path hooks | fails closed on purpose: when it cannot tell where a push goes, the push waits |
| Surfaces | any surface that runs hooks (it draws nothing) |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): independent red-team for ways past it. Found: 5 bypasses (piped scripts, an alias made on the line, xargs -I%, hidden command names), all fixed with a test that failed first; 2 gaps documented.

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

### session-diary 0.4.5

| | |
| --- | --- |
| Tests passing | 20 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- no independent code review yet

### build-bell 0.4.5

| | |
| --- | --- |
| Tests passing | 14 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface that plays sound or shows toasts |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: failure toast, playback and tick wording corrected.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never heard or seen in the real app
- where its three settings are set is not documented
- no independent code review yet

### crab 0.2.2

| | |
| --- | --- |
| Tests passing | 20 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: the root README line described an older version.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- no independent code review yet

### stunt 0.1.3

| | |
| --- | --- |
| Tests passing | 13 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- no independent code review yet

### everywhere 0.1.2

| | |
| --- | --- |
| Tests passing | 8 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never seen in the real app
- no independent code review yet

### forge 0.1.2

| | |
| --- | --- |
| Tests passing | 5 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface (it is a tool the model calls) |
| Verdict | Not ready: 5 of 8 open |

**Independent reviews**

- 2026-11-11 (at 5a3a16d): documentation audit against the code. Found: no claims needed correcting.

**New tests watched failing first**

- not recorded yet

**Seen working in the real app**

- not yet

**Cold install by someone who is not the founder**

- not yet

**Known gaps**

- never called by the model in the real app
- no independent code review yet
