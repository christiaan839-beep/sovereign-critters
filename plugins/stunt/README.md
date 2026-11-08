# stunt

![stunt: The critter, painted in a pane.](preview.png)

A card stunt in the terminal: the critter painted cell by cell in a pane, blinking while it is up, a card for each of the last 40 tool calls beneath it, and the count of every call in words.

## What it does

`/stunt` opens a pane. The critter is painted as one `Raster`; a card stands for each of the last 40 tool calls beneath it. Every four seconds `$.ui.blit` flips its eye cards, with no render pass, for as long as the pane is up in a terminal. Closing the pane stops the timer.

Under it, the words count every call; the total is kept in `$.state`.

## Where it draws

- **Terminal:** the painted critter and the cards.
- **Desktop app:** it has no `Raster`, so it gets the words alone.
- **Nowhere that draws panes:** `/stunt` answers with the count.

## What it never does

- It keeps the name and count of tool calls in the plugin's own `$.state`, never a command, a path or a prompt.
- It makes no network request and sends no telemetry.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install stunt@sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## Check

```
claude plugin validate . --strict
claude plugin test .
```

Apache-2.0. Not affiliated with Anthropic.
