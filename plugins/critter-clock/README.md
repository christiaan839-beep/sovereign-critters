# critter-clock

![critter-clock: Time here, and time Claude worked.](preview.png)

**Witness** pillar: says what happened, honestly. One of thirteen [sovereign-critters](../../README.md#what-is-here) mods.

How long this session has run, and how much of it Claude spent working. Type `/clock`. It also says so once on each full hour, if you leave that on.

```
1h 12m here. Claude worked 41m of it. The longest turn was 6m 40s.
```

## What it does

- `/clock` answers in one line: time since the session began, the total time Claude's turns took, and the longest single turn.
- On each full hour a quiet toast says so ("An hour in. Claude has worked 45m of it."). A session left idle across several hours says the latest hour once, not one toast per hour. Turn this off under **Say so on the hour** in the mod's settings.
- Only the main conversation counts. A subagent's turns run inside the main turn and would count the same minutes twice.

## What it does and sends

- **Answers `/clock`** with the time since the mod loaded, the total time Claude's turns took, and the longest single turn. On each full hour it shows one quiet toast if **Say so on the hour** is on (it is by default).
- **Reads** the time each finished turn took, from the engine, for the main conversation only (a subagent's turns run inside the main turn and would count the same minutes twice). No prompt, no file, no tool call.
- **Keeps** two numbers' worth of times in the session and nothing after it ends. It writes nothing to disk.
- **Sends** nothing: no network request, no telemetry, no sound files, no credentials, no program run. It never blocks anything; every hook fails open.

## Limits

- The count starts when the mod loads. A session you resume, or a mod you switch on late, starts its count again from then.
- "Worked" is the time of finished turns as the engine reports it. A turn you interrupt is counted as the engine counts it.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-clock@sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## Early access

Mods are on by default from Claude Code 2.1.286. An organization can keep installed mods from running (`allowManagedModsOnly` in managed settings), and `claude --safe-mode` starts a session without them. The mod engine may change between releases without notice: tests pin this mod's behaviour, and when the engine moves, expect a patch release that follows it.

Apache-2.0. Not affiliated with Anthropic.
