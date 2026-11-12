# critter-ledger

![critter-ledger: The tokens you used, when you ask.](preview.png)

**Witness** pillar: says what happened, honestly. One of thirteen [sovereign-critters](../../README.md#what-is-here) mods.

The tokens this session has used, when you ask. Type `/ledger`.

```
222k used: 8k out, 34k in, 180k read from the cache. The biggest turn was 222k. You set 500k; you are at 44%.
```

## What it does

- `/ledger` adds up what the API reported for each finished turn: fresh input, input the cache stored, input the cache served, and output. "Used" is all four together; "in" is fresh plus stored; the cache's share is shown on its own because it costs less.
- `/ledger limit 500k` (or `1.5m`, or `250000`) sets a limit of your own. When a turn takes the total past it, a toast says so once. `/ledger limit off` clears it.
- Subagent turns count, because their tokens are really spent.

## What it does and sends

- **Answers `/ledger`** with the tokens the session has used, as the API reported them for each finished turn: fresh input, input the cache stored, input the cache served, and output. Subagent turns count. It counts; it knows nothing about prices or plans.
- **Your own limit:** `/ledger limit 500k` sets one, and a toast says so once when a turn takes the total past it. `/ledger limit off` clears it. It is the only time the mod speaks unasked.
- **Reads** the usage numbers the engine reports on each turn. No prompt, no file, no tool call.
- **Keeps** the sums and the limit in the session and nothing after it ends. It writes nothing to disk.
- **Sends** nothing: no network request, no telemetry, no sound files, no credentials, no program run, and it spends no tokens of its own.

## Limits

- It counts what the engine reports to a mod on each turn. A model call a plugin makes in the background may not appear.
- The count starts when the mod loads. A session you resume starts its count again from then.
- It is a count, not a bill: it knows nothing about prices or plans.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-ledger@sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## Early access

Mods are on by default from Claude Code 2.1.286. An organization can keep installed mods from running (`allowManagedModsOnly` in managed settings), and `claude --safe-mode` starts a session without them. The mod engine may change between releases without notice: tests pin this mod's behaviour, and when the engine moves, expect a patch release that follows it.

Apache-2.0. Not affiliated with Anthropic.
