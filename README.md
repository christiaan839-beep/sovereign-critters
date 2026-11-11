# sovereign-critters

Small, careful mods for Claude Code from Sovereign Matrix: pixel characters that live in Claude's own interface and react to what it is doing.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-buddy@sovereign-critters
```

Start a new session afterwards: plugins load at start-up.

## What is here

| Plugin | What it is |
| --- | --- |
| [`critter-buddy`](plugins/critter-buddy) | The wizard Pip, the tabby Biscuit, faces on every tool row, a prompt box that colours `/critter` as you type, a stage, a diary the model can read, and a Day and Night sky. |
| [`mods`](plugins/mods) | `/mods`: the control room. One pane on the right lists every mod, switches each on or off, installs the missing ones and opens each mod's own panes. |
| [`build-bell`](plugins/build-bell) | A counter-bell strike and a toast when a long command or turn finishes, and a soft tick for a short turn. |
| [`session-diary`](plugins/session-diary) | /diary: every tool call with its time, a line for each turn, and a copy-as-markdown button. Names and times only. |
| [`forge`](plugins/forge) | A tool that counts text exactly: characters, words, lines and UTF-8 bytes. |
| [`stunt`](plugins/stunt) | /stunt: the critter painted in a pane, with a card for each of the last 40 tool calls. |
| [`crab`](plugins/crab) | A band that shows what a reload keeps and what it does not. |
| [`guard`](plugins/guard) | Stops a git push that forces or writes main or master, before Bash runs it. Best effort. |
| [`everywhere`](plugins/everywhere) | /everywhere: a pane of your three most-used tools, drawn by each app its own way. |

The critter and the cat are our own drawing. Nothing here copies Anthropic's art. Not affiliated with Anthropic.

## Principles

- A decorative mod never blocks a tool: every hook catches its own errors.
- Everything the characters say is a pure function of the session, never of chance, so a replay is identical and a test can pin it.
- No network, no telemetry, nothing read outside the session. State stays in the plugin's own store. The one thing that spends anything is opt-in: `/critter talk on` asks the model for one short line after a turn and sends only numbers (the seconds the turn took, whether it failed). It is off until you turn it on.
- Apache-2.0.

## Develop

```
cd plugins/critter-buddy
claude plugin validate . --strict
claude plugin test .
claude --plugin-dir .          # try it in a real session
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Not affiliated with Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic.
