# Changelog

## 0.11.4

- The band is centred for real: the art, the status line and the buttons are centred across the window. Before, only their vertical alignment was set, so on the desktop everything sat to the left.

## 0.11.3

- The cat talks by default: one small model call after each turn, a line from the cat in the transcript. `/critter talk off` keeps it quiet and spends nothing. Sound is still the founder's to switch on (`/critter sound on`).

## 0.11.2

- Everything on by default: `party` is the starting reach (the bar, the wizard, the orb, the rows and every message). `/critter lite` and `/critter full` still turn it down. (The code change shipped inside 0.11.1; this records it.)

## 0.11.1

- Fixed: on the desktop the last button (`the corner`) wrapped alone onto a second line, and another mod's row under the bar (crab's) was clipped. The status now has its own line, the five buttons share the next, and the air before other mods' rows is a spacer row instead of margins, which the desktop does not count when it sizes the bar.

## 0.11.0

- The greeting under the logo knows the weekday in Johannesburg (Monday is not agreed to yet, Friday suspects the weekend). The night keeps its own lines.

## 0.10.0

- The prompt box paints the family too: `/diary` (with `copy` and `clear`), `/stunt` and `/everywhere`, each with a dim ghost line saying what it does.
- The cat corner says its moods in words (`trust ███░░░░░░░ 30 · warming`). The stage names whose it is and the hour (`Pip's stage · night`).
- The backdrop has a ground band, a sun by day and a moon by night, and the stars by night. It is the same two worlds, drawn with a horizon.

## 0.9.1

- Fixed: 0.9.0 did not pass `claude plugin validate --strict`: the feel setting was missing from the manifest's types contract. It is declared now.

## 0.9.0

- A feel dial: `/critter feel calm | warm | playful`. Calm keeps the pair still (they breathe, walk and sleep; no hops, sparks, hearts or sound). Warm is the usual. Playful hops about three times as often. It is kept between sessions, offered by the typeahead and coloured in the prompt box.

## 0.8.2

- The buttons say what is true now: a sulking cat is `make up with Biscuit`, a casting wizard reads `Pip is casting`. A `nap` button joins them (key `n`).

## 0.8.1

- The band's controls sit on one centred line that wraps in a narrow window: the label in full, the mood dim after it, then the four buttons, with a line of air above. Other mods' rows (usage lines) are held a line clear beneath, instead of crowding the buttons.

## 0.8.0

- The prompt box is painted as you type: `/critter` in clay, a word it knows in teal, a stray word underlined in gold, and a dim ghost line after a finished word saying what it does. It rides on the `prompt.edit` answer, so the colours always sit on the characters they were made for. Other drafts are left alone.
- The diary reads as markdown (`/critter diary`): newest first, the time in code, a line cannot break the markdown. In the cat corner the time is teal and only the latest line is at full strength; the heading uses the cat's own name.

## 0.7.2

- The cauldron beside the wizard is gone. It stood on top of the cat. The wizard casts alone.

## 0.7.1

- Lighter on the desktop: the scene steps four times a second while anything moves, and once a second when both are still, so a picture that has not changed is not redrawn.

## 0.7.0

- The cat and the wizard critter have names, Biscuit and Pip, and every line says them. `/critter name cat <name>` and `/critter name pip <name>` rename them.
- The lines are rewritten: drier, a little warmer, and each one says what happened.
- The wizard comes out for four moments: a Skill or a subagent, a commit, a green test run, and the end of a long turn (one last bolt before the coffee). A commit and a green run also show a toast.
- Three wizards: `/critter wizard auto` (gold star by day, violet bolt by night), `gold` or `bolt`.
- Sound, off until you ask: `/critter sound on` plays a cast chime for a Skill and a purr for a pet.
- Typeahead: as you type `/critter `, the prompt offers what it can do, each in the cat's voice.
- The buttons say what they do: `pet Biscuit`, `feed Biscuit`, `Pip casts`, `the corner`.
- Fixed: the critter and the cat could walk into each other. They now keep to their own stretch of the bar.

## 0.6.1

- Fixed: on the desktop the critter's feet and the laptop touched the label row under the bar. A clear row now sits beneath the picture.
- The footer says what is happening ("reading", "running a command") and no longer repeats the plugin's name.
- The finished wizard has three motes of purple light drifting round his hat and staff.

## 0.6.0

- `/critter stage` opens a stage: the critter alone on an empty screen, walking and idling as your session runs, with cast, nap and close buttons. On the desktop it is crisp vector art; in a terminal, cell art.

## 0.5.2

- The wizard takes the bar for the whole turn: the hat builds while Claude thinks, and the critter changes to Sherlock, chef or the laptop when it starts working.

## 0.5.1

- Fixed: when a command ran, the cat sat on top of the critter and its laptop. It now sits just past the laptop, or beside the critter when that side is full, and follows without overlapping.
- The cat is the orange tabby by default, in the clay of the critter; cream and the rest are one `/critter cat` away.

## 0.5.0

- The critter wears what the work needs. Reading, searching and finding files: a deerstalker cap and a magnifying glass, and it keeps walking about. A build, an install, a test run or a compile: a chef's hat and a pan that throws sparks, and it stays at the stove. A turn that is done: happy eyes and a cup of coffee with steam. A skill or a subagent: the wizard, as before. A plain command is still the laptop.
- The laptop is drawn flat, with a screen whose sparkles move as it types.
- The critter has no outline, like the official one; the cat keeps its soft one.

## 0.4.1

- Fixed: the critter's outline was drawn twice and looked heavy. The critter now has no outline at all, only the shading, like the official critter. The cat keeps its soft outline.
- A new laptop, drawn flat like the official critter's: a dark screen whose sparkles move as it types, a lit edge, a keyboard deck.

## 0.4.0

- The critter and the wizard are now the studio site's own sprite, ported as it is from `crit.js`: three tones of clay lit from the upper left, eyes with a glint, a walk cycle, arms up for a jump, and joy. The wizard's hat builds up from the brim in sparks, has a gold star, and the staff's orb throws lightning once he casts. By night it is the antennae critter with a violet bolt on its hat.
- A `cast` button (key `c`) lets you make the wizard cast from the bar; `pet` is `p`, `treat` is `t`, the cat corner is `k`.
- The cat keeps its own size; the critter is 22 x 14 cells, level with it.

## 0.3.0

- A new cat, drawn for this mod in the manner of a pixel-cat sheet: 28 pixels tall, seated and facing you, with a glinting eye, pink ears, whiskers, a shaded side and a ringed tail. Cream is the default; there are tabby, ginger, black, tuxedo, grey and siamese too. It sleeps as a loaf with its tail round it.
- The critter and the wizard are the studio's film sprite exactly, drawn at twice the size so they stand level with the cat.
- The bar can be up to 96 pixels wide, to hold both.

## 0.2.1

- Fixed: the cat in the cat-corner pane was cut off at the right edge. The portrait now has its own canvas wide enough for the critter and a whole cat.

## 0.2.0

- The wizard stands beside the thinking orb, drawn with the studio's glossy clay orb; his hat and staff build up over nine frames.
- Night antennae, redrawn cat, faces on tool rows, error lines from the cat.
- Day and Night desktop backdrop (Africa/Johannesburg).
- Diary rows after each turn and a `cat_diary` tool for the model.
- `/critter lite|full|party`, explicit `hide`/`show`.
- On the desktop and other graphical surfaces the band, the wizard, the orb, the faces and the cat-corner portrait are drawn as vector art, not block glyphs, so they are crisp instead of smeared. The terminal keeps its cell art.
- The cat looks up when you type (`prompt.edit`), and the wizard paces beside the orb while Claude works.
- `/critter talk on|off`: the cat can speak after a turn through one small model call. Off by default, because it costs tokens.
- The bar is 24 pixel rows tall to fit a 17-pixel cat.
- The cat sits up facing you like the cat sheet (ears, eyes, bib, ringed tail), curls into a ball to sleep, twitches an ear and blinks. Eight new coats.
- The cat keeps count: round numbers of errors, green test runs and commits get a line of their own.
- A voice that follows what happened (turn length, failures, the hour) instead of fixed lines.
- The bar stops at 72 cells so a wide window does not spread the pair thin.
- Every hook catches its own errors, so a decorative mod never blocks a tool.

## 0.1.0

First version: the critter and the cat on the bar, pet and treat buttons, the cat corner.
