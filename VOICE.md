# Voice

How the mods speak and look. One family, four pillars, one voice that changes its weight by pillar. Read this before you write a line a person will see: a reply, a status, a README, a changelog entry, a poster.

## The four pillars

| Pillar | What it is for | Mods | Weight |
| --- | --- | --- | --- |
| **Companion** | Presence: something alive beside the work | `critter-buddy`, `critter-crab`, `critter-stunt` | Warm and playful, never loud |
| **Guard** | Safety: stop the one thing you cannot take back | `critter-ward`, `critter-latch`, `critter-seal` | Serious and exact |
| **Witness** | Memory: say what happened, honestly | `critter-diary`, `critter-ledger`, `critter-clock`, `critter-tally`, `critter-measure`, `critter-bell` | Quiet and plain |
| **Workshop** | Craft: show how a mod is made | `critter-mods`, `examples/hot-reload-demo`, the `review-a-guard` skill | Teaching |

A mod belongs to one pillar. If a new one seems to belong to two, it is two mods.

## What every line does, in every pillar

- **Plain words, short sentences.** British spelling (colour, licence). No exclamation marks, no emoji, no "simply" or "just".
- **Say what is true now, then how to change it.** A status names the command that changes it: `Sound is off: /critter sound on.` A refusal names what to do instead.
- **Claim only what a test or a sighting backs.** "Best effort" when it is. "Not seen yet" when it is not. `QUALITY.md` is the record; a README never outruns it.
- **Never colour alone.** A meaning carried by colour is also carried by a shape or a word.
- **Same input, same words.** Nothing a character says comes from chance, so a replay is identical and a test can pin it.
- **Lead with the name of the mod** when it speaks unasked (`latch:`, `critter-bell:`), so a person always knows who is talking.

## Companion: warm, playful, never loud

Biscuit (the cat) has the dry humour; Pip (the wizard critter) is earnest and does not joke. They have opinions about the hour, the folder and you, and keep them to one line.

- Yes: `Night again. Biscuit has stopped pretending this is unusual.`
- Yes: `A new folder. Biscuit is inspecting the corners.`
- No: `Wow, you're up late! 🌙 Biscuit is SO proud of you!`

Delight is earned by restraint: one remark a session at most, motion that stops when you ask (`/critter feel still`), sound off in calm. A line that would interrupt is not said.

## Guard: serious, exact

A guard is a promise, so it reads like one. It says what it stopped, why, and what to do instead, in that order, and it never jokes.

- Shape: `latch: rm -r reaches outside the folder you opened (/work/app). Ask the person to run it themselves if they meant it.`
- A guard that cannot read a line says so and puts it to the person; it does not guess.
- Every guard README has: what it stops, what it does not (spellings it cannot read, where it does not run), how it fails (closed, for its one promise), its review record, and how to report a bypass (`SECURITY.md`).
- No characters on a guard's refusal. The cat may comment afterwards elsewhere; the refusal itself is plain.

## Witness: quiet, plain

A witness counts and remembers. It speaks when asked, says the number and stops.

- Yes: `2h 14m here. Claude worked 41m of it. The longest turn was 6m 3s.`
- No: `Great session! You've been super productive today.`
- It keeps names, times and counts, never content: no command, path, prompt or file. The README says exactly what is kept and for how long.

## Workshop: teaching

A workshop mod is also a lesson, so its code and README are written for the next person who builds one.

- Code comments say *why*, not what: the engine rule a line obeys, the bug a test pins.
- The README has a "For mod authors" section: the one idea the mod teaches, and where in the code it lives.
- Every claim about the engine names where it was read (Claude Code's docs, the generated types) and when.

## Look

- **Our own pixels.** The critter, the cat, the crab and the icons are our drawings on the family grid (`tools/icons.py`). Nothing copies Anthropic's art.
- **One palette.** Clay `#d97757`, its shadow `#b9573a`, its light `#ec9b78`, ink `#141413`, paper `#faf9f5`, with teal and gold as accents. A guard's poster uses the same palette and fewer characters.
- **Two surfaces, one picture.** Half blocks in the terminal, the same pixels as SVG on the desktop. Neither is the poor relation.

## Names

- A mod is `critter-<word>`, one plain word for what it does.
- The family is **sovereign-critters**. The Guard pillar may also ship on its own as **sovereign-guard** for teams; the mods and their names stay the same.
