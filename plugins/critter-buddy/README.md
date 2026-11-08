# critter-buddy

The Sovereign Matrix critter, a wizard version of it, and a tabby cat, living in Claude Code's own interface: above the prompt, beside the thinking orb, on every tool row, and behind the conversation on the desktop app.

![The critter's day: reading, cooking a build, casting, done](demo.gif)

```
/plugin install critter-buddy --marketplace christiaan839-beep/sovereign-critters
```

Plugins load in a new session.

## What you get

| Where | What it does |
| --- | --- |
| The bar above the prompt | The critter changes with the tool Claude uses: laptop for Bash, glasses to read, pencil to edit, wizard hat and staff (built up frame by frame) for a skill or a subagent. The cat sleeps, follows, sits on the laptop, pounces on errors and knocks cups off. |
| Beside the thinking orb | The wizard stands to its left; the orb is the glossy clay Sovereign Matrix orb and breathes while Claude thinks. |
| Every tool row | A small face by what the call did: working, done, failed. |
| End of a turn | A line from the diary and a quip that depends on how long it took and whether anything failed. |
| Footer, hint, greeting | The cat's mood among the modes, a hint that follows what is happening, a greeting that follows the hour in Johannesburg. |
| Desktop backdrop | Cream by day, dark glass with a few stars by night (18:00 to 05:59, Africa/Johannesburg). |
| The prompt box | Type `/critter` and the command turns clay, a word it knows turns teal, a stray one is underlined in gold, and a dim line after a finished word says what it does. The typeahead offers the words and the coats. |
| The diary | `/critter diary` and the cat corner show it newest first, the time in teal, the latest line at full strength. |
| The model | A `cat_diary` tool, so Claude can read what the cat wrote. |

The cat keeps its trust in you across sessions in `$.store`; it falls by 8 for each day you are away.

## Commands

| Command | Does |
| --- | --- |
| `/critter pet`, `treat`, `nap`, `spell` | The same as the buttons. |
| `/critter stage` | The critter alone on an empty stage, walking and idling. |
| `/critter corner` | The cat corner pane: portrait, moods, diary and a one-key treat game. |
| `/critter diary` | What the cat wrote. |
| `/critter lite`, `full`, `party` | How far it reaches: lite is the bar, the wizard and the orb; full adds the transcript's rows (default); party adds every message. |
| `/critter talk on`, `off` | The cat speaks after each turn through one small model call. Off by default: it costs tokens. |
| `/critter cat <coat>` | The cat's coat: `orange` (the default), `ink`, `brown`, `tabby`, `ginger`, `black`, `tuxedo`, `cream`, `grey`, `siamese`, or `pair` (follows day and night). |
| `/critter name cat <name>`, `name pip <name>` | What the cat (Biscuit) and the wizard critter (Pip) are called; every line says it. |
| `/critter wizard auto`, `gold`, `bolt` | The wizard by the hour, the gold star always, or the violet bolt always. |
| `/critter sound on`, `off` | A cast chime for a Skill and a purr for a pet. Off until you ask. |
| `/critter hide`, `show` | Explicit; bare `/critter hide` toggles. |

It draws above other mods' rows in the same place and registers only `/critter`.

## Check

```
claude plugin validate . --strict
claude plugin test .
```

Apache-2.0. See CHANGELOG.md.
