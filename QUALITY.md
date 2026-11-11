# Quality

What has been checked for each mod, as facts with dates. A row says what was checked and when, never how good the mod is, and it never claims more than its evidence.

- **Measured** (the version, tests passing, strict validation, hooks that fail open): read from the plugins by `tools/quality.py`, so they cannot drift. `bash tools/preflight.sh` tells you when this file is out of date; `python3 tools/quality.py --write` brings it up to date.
- **Witnessed** (independent reviews, sightings in the real app): written by people in `tools/quality-facts.json`, each with a date. An empty row means it has not happened yet.

The first three are the lead of the release; the other six are held to the same promise.

## The lead mods

### critter-buddy 0.28.5

| | |
| --- | --- |
| Tests passing | 166 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |

**Independent reviews**

- 2026-11-11: independent code review of the clock, the painter cache, the band sky, trust and pane width. Found: 2 confirmed bugs and 5 smaller; all fixed with a test that failed first.
- 2026-11-11: documentation audit against the code. Found: 14 claims corrected across the repo.

**Seen working in the real app**

- 2026-11-11, Claude desktop app: the band and its buttons, the sky in the band, /critter doctor, /critter perf, the prompt box colouring.

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

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: stamp words, line counts and what /mods needs corrected.

**Seen working in the real app**

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

**Independent reviews**

- 2026-11-11: independent red-team for ways past it. Found: 5 bypasses (piped scripts, an alias made on the line, xargs -I%, hidden command names), all fixed with a test that failed first; 2 gaps documented.

**Seen working in the real app**

- not yet

**Known gaps**

- never seen stopping a push in the real app
- a program that changes main or .git/HEAD earlier on the line is not tracked (documented)

## The others

### session-diary 0.4.4

| | |
| --- | --- |
| Tests passing | 19 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | Claude desktop app, terminal |

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: no claims needed correcting.

**Seen working in the real app**

- not yet

**Known gaps**

- never seen in the real app
- no independent code review yet

### build-bell 0.4.4

| | |
| --- | --- |
| Tests passing | 13 |
| Strict validation | passes |
| Tool-path hooks fail open | yes, checked by preflight |
| Surfaces | any surface that plays sound or shows toasts |

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: failure toast, playback and tick wording corrected.

**Seen working in the real app**

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

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: the root README line described an older version.

**Seen working in the real app**

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

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: no claims needed correcting.

**Seen working in the real app**

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

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: no claims needed correcting.

**Seen working in the real app**

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

**Independent reviews**

- 2026-11-11: documentation audit against the code. Found: no claims needed correcting.

**Seen working in the real app**

- not yet

**Known gaps**

- never called by the model in the real app
- no independent code review yet
