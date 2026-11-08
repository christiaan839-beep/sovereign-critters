# Changelog

## 0.20.1

- The button rows of the stage and the corner are spaced by a column gap, as the band is, instead of a space between them. In the terminal the stage showed "[ cast   [ nap   [ close ]" with the closing brackets missing (seen by driving a real terminal session).

## 0.20.0

- After a session has run two hours, the cat puts `/diary postcard` dim in the empty prompt box, once per session, for Tab to take. The new-prop corner nudge still comes first and the Friday week after. Needs session-diary 0.4.0 for the command to exist; without it the line is simply a command that is not there.

## 0.19.1

- A first-ever session carries one dim line under the greeting: "Biscuit and Pip are here. /critter for the controls". It is said once, remembered in the store, and never blocks the greeting.
- The Friday `/diary week` nudge counts as taken when you send the line it offered, not when it was merely shown, so a nudge you ignored comes back.
- The wizard beside a `/critter nap` reply is drawn asleep (eyes shut, a z, no lightning) and beside `/critter spell` with his hat lifted and tipped forward, smiling. Pixels of our own; unconfirmed until seen in the real window. Plain replies keep the plain wizard, and the terminal still draws none.
- `/critter doctor` reports the whole window width, not the width the band is capped at.
- `/critter voice` stays in the command list.

## 0.19.0

- Three new sounds, each one physical event built from a model and not from a sample (`tools/foley.py`, standard library only, the same bytes every run): a soft double tap for a treat (a pitch-dropped thump on low noise), a page turned for `/critter diary` (filtered noise in three swells with a few fibre crackles), and a small brass bell for a prop earned (inharmonic partials that each fade at their own rate). No music.
- They play only where the others do: after `/critter sound on`, never in calm. The chime for a prop earned is wired but not covered by a test, because a streak milestone cannot be driven in the test kit; the paw and the page are.
- `tools/check-sounds.py` checks every sound of the mod: 16-bit mono 44.1 kHz, audible, never clipped, no click at either end, a sensible length.

## 0.18.2

- The wizard rule now reads through the plugin name the engine prints before a reply ("critter-buddy: The pair are hidden."), which the real window showed and the 0.16.0 tests had not: with it, `hide`, a usage line and a report no longer get the wizard.

## 0.18.1

- The band keeps its shape at any width, after a photo of the real window showed two faults: the glass line sat on top of the status and the buttons, and in a narrower window the five buttons wrapped to a second row and clipped the row beneath.
- The status is now one row: the label, then the cat's mood and the glass line. When the row is too wide the mood goes first, then the glass line is cut with an ellipsis.
- The five buttons keep the full words while they fit one row (79 cells, 88 when the cat is sulking) and the short ones (pet, feed, cast, nap, corner) the moment they would not.

## 0.18.0

- The cat learns your habits across sessions, kept as counts and hashes: the hours you come at and a short hash of each folder (the last 50), never a path or a name, and nothing leaves the plugin's own store.
- A folder she has not seen gets one line ("A new folder. Biscuit is inspecting the corners."). Every eighth session, if three in five fall in the same part of the day, she remarks on it in her own dry way. A new folder outranks the habit, there is at most one remark a session, and the very first session says nothing.

## 0.17.0

- The sky follows a failing streak as well as the cat's joy: errors in a row with no green test or commit between them cloud the sky at two, rain at three and storm at five. A green run or a commit clears the count; a treat does not. The worse of the joy and the streak wins, and the sky never brightens because of a streak.

## 0.16.0

- `/critter doctor`: says what is on and what is off (reach, feel, sound, voice, talk, a hidden pair, a narrow window under 110 columns) and the one command that changes each.
- A damaged store is read as nothing and never as a crash: the cat's memory and the day count are checked and clamped before they are used.
- The cat comes back at 25 trust at the least: wary, not sulking. A green test run (+3) and a commit (+4) earn trust back, and a cat lifted out of a sulk says so, once.
- The same diary line twice in a row is one line with a count (`(×6)`), keeping the first time.
- The wizard beside a `/critter` reply is half the size and sits only beside a moment: not beside `hide`, a usage line or a report.

## 0.15.0

- A permission question gets the cat's line under it when the call deserves a second read: a recursive delete, a forced push (not `--force-with-lease`), a hard reset, a stranger piped into a shell, sudo, a skipped hook, a dropped table, a world-writable tree, or a secrets file. Everything else gets nothing, and the verdict is never touched.
- A long turn is marked in the diary at steps 20, 40 and 80. The model's stream passes through the hook untouched.
- After the cat's own review of this release: `/diary week` is a word the draft knows (it was painted as a stray); `rm` is caught with its flags in any order (`rm dir -rf`, `--recursive`); a voice name keeps its brackets (`Samantha (Enhanced)`); the full-glass mark lives in one place, so rewording the line cannot silently kill the toast and the voice; the agent no longer promises a diff it cannot fetch; the fallback usage text lists `voice`.

## 0.14.0

- `/critter voice on | off | <name>`: the cat says the big moments aloud (a prop earned, the glass nearly full), in the system voice or an installed one you name. Off until you ask; calm stays silent; it never waits for the end of a sentence.
- An agent of the cat's own, `biscuit-looks`: a second look at a change, in her voice, five lines at most, and she can read and search but never edit.

## 0.13.3

- Fixed: the corner nudge in the prompt box never appeared. It compared the streak after the turn had already counted it, so a new prop was never "new". It now remembers the streak from before the turn, and a test earns a prop and watches the box.
- Fixed: a store that will not write no longer stops the cat counting the day, the milestone toast or the nudge.
- The far ridge is wide enough for a very wide window (400 cells) and is cut, never wrapped to a second line.
- Painted words never overlap: a link or a file inside a `code span` stays inside it.

## 0.13.2

- The stage and the corner say how they want to be seated beside the chat: the stage 60 columns wide and see-through, so the day or night sky shows behind the pair; the corner 56 wide and tall enough for the diary. Escape closes either. The surface may grant less; below 110 columns they sit above the prompt as before.

## 0.13.1

- The demo GIF and the preview poster are drawn again from the mod's own scene and sky code: a working day (reading, cooking, casting, done), then dusk, night and rain, with the ridge and the wisps. The poster shows the Friday greeting, the full glass and the week's bars.

## 0.13.0

- The clear-day backdrop has depth: a far ridge along the horizon (the ground tinted toward teal by day, toward violet at night) and three wisps of high thin cloud, instead of one dot and a flat block. A night and a storm keep their own skies.
- The cat watches the context window. From half full the band says how full the glass is; at 75% Pip eyes it; at 90% Biscuit sits on the compact button, with one toast on crossing. Near the end of the five-hour window the cat rations treats.
- One dim nudge in the empty prompt box, for Tab to take: `/critter corner` when a new prop has just been earned, `/diary week` on a Friday afternoon (once a day).
- The prompt box paints ordinary words too: `@files` in teal, links underlined, `code spans` in gold. The `/critter` commands keep their own colours.

## 0.12.3

- The greeting has five lines for every weekday and every part of the day, up from two, and picks one a day: a new line tomorrow, the same one on every reopen today. Lines that name the day or the hour still do.

## 0.12.2

- Several tool calls at once (subagents) each keep their own clock for the long wait, so one call no longer resets another's. The sky arguments and the long-call test moved into `world.ts`, where tests pin them, and the backdrop is tested against the session's weather. No visible change.

## 0.12.1

- The corner and the stage are laid out again: the heading, the portrait and the buttons are centred; a line under the portrait says how many days you have come back and what the cat will bring next (`day 5 together · a cushion in 2 days`); the sections are set apart by spacer rows (a margin is lost to the desktop's measure); the stats are two short lines instead of one that ran off the edge. The stage has a status line and its buttons centred under the art.

## 0.12.0

- The weather sky. The backdrop follows the hour in Johannesburg (night, dawn, day, dusk: the sun sits low at dawn and dusk, the stars come out at dusk) and the season of the southern hemisphere tints the ground. The weather is the session's own, not a forecast: the pair's joy sets it, so errors bring cloud, then rain, then a storm that hides the sun and throws a bolt, and a green test, a commit or a treat clears it. Nothing is fetched.
- The streak. Come back to the cat on consecutive days and it keeps count (`day 5 together` in the greeting); at 3, 7, 14 and 30 days it puts a ball of yarn, a cushion, a plant and a lamp on the bar, drawn behind the pair, with a toast the day each arrives. A missed day starts it again. Only the day and the count are kept.
- Seasons and South African holidays. The public holidays, Easter's included and a Sunday's kept on the Monday, take over the daytime greeting in the cat's voice; the stage title names the holiday and the season; from the 14th of December to New Year's Day a string of lights runs across the top of the window.
- The long wait. A tool call that runs past 20 seconds (a build, an install, a test run) sends the cat to the far end of the bar, to the window; what the call does at the end (green, failed) moves the pair as before. It works beside build-bell, which rings the bell and shows the toast.

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
