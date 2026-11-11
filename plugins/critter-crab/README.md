# critter-crab

![critter-crab: it holds your place.](preview.png)

A small pixel crab that holds a note for you. Tell it where you stopped, and it is there again when you come back to the folder, in a new session, after a restart.

```
/crab hold ask Mira which migration ran before the deploy
```

A band appears above the prompt: the crab, and your note beside it. In the same folder in a later session it says **you left this:** instead of **holding:**.

## Commands

| Command | Does |
| --- | --- |
| `/crab hold <text>` | Leaves a note for this folder. One line, 120 characters at most; a longer one is shortened and the crab says so. A second hold replaces the first. |
| `/crab` | Says what the crab is holding for this folder. |
| `/crab drop` | Puts the note down. The band goes. |

## What it looks like

Nothing, until you give it a note: with no note it draws no band at all and costs no space. With one, it is two lines beside the crab, cut with an ellipsis if the window is narrow, never wrapping. The crab is our own drawing, in the same clay as the pair: half blocks in the terminal, a picture on the desktop.

## What it never does

- It makes no network request and sends no telemetry.
- It keeps a note per folder in the plugin's own store, under a short hash of the folder's path. The path and the folder's name are never kept. Fifty folders at most; the oldest are let go.
- It never reads your prompts, your files or the output of a tool, and it never blocks a tool or a prompt: if its store will not read or write, it says so and carries on.
- A note can be one line of plain text only: colour codes and control characters are stripped.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-crab@sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## For mod authors

The first version of this plugin was a band that showed what a hot reload keeps (the module's own variable starts over, `$.state` stays). It is kept as a teaching example in [`examples/hot-reload-demo`](../../examples/hot-reload-demo). This version keeps the same lesson in earnest: the note survives a reload and a restart because it is in `$.store`, not in a variable.

## Check

```
claude plugin validate . --strict
claude plugin test .
```

Apache-2.0. Not affiliated with Anthropic.
