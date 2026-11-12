# Changelog

## 0.7.7

- **Changed: the manifest names its privacy policy, support, documentation and terms pages** (`privacyPolicyUrl`, `supportUrl`, `documentationUrl`, `termsOfServiceUrl`), as the plugin directory's listing step asks. No behaviour changed.

## 0.7.6

- Docs: the README has a "What it does and sends" section, written from the code: what the mod reads, keeps, sends and runs, and whether it plays sound files. It has an install line and a licence line. No behaviour change.

## 0.7.5

- **Smoother: the control room opens on the list it has.** It used to ask the plugin manager and read all eight changelogs every time it opened (3 list calls and 16 file reads for two opens); it now asks once, reads each changelog once per version, opens at once on the last list, and refreshes in the background when that list is a few seconds old. A missing `claude` command still says so straight away.
- **Changed:** the plugin manager is given 8 seconds, not 20. The ward card says what it stops; its steps and the line about switching the control room off name the right plugin.

## 0.7.4

- Docs: the README names the mod's pillar (Workshop) in the sovereign-critters family, and the marketplace lists it under that tag. No behaviour change.

## 0.7.3

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.
- Types: the pane asks for `Svg` only where the surface's kit has one (the terminal's has none); it drew the same before. No behaviour change.

## 0.7.2

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.7.1

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.7.0

- **Four more mods in the control room:** critter-clock, critter-ledger, critter-latch and critter-seal now have cards, switches and install buttons (12 mods in all). `/mods open clock` and `/mods open ledger` run their commands; latch and seal have nothing to open, they work quietly.

## 0.6.1

- **Fixed: five cards showed the generic steps.** After the rename, the start-up steps for critter-ward, critter-stunt, critter-crab, critter-measure and critter-tally were still filed under the old names, so those cards said "Type / in the chat box" instead of their own lines (the crab card never mentioned `/crab hold`). Each card now shows its own steps, and a test fails if a mod has none.
- Fixed the README's disable command (`claude plugin disable critter-mods`) and a missing type import. Found by an independent review.

## 0.6.0

- **Renamed from `mods` to `critter-mods`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-mods`, and remove the old plugin; anything it stored (a crab note, the diary's week) starts fresh under the new name.
- **Changed:** the README opens on a preview poster instead of the icon. No behaviour change.

## 0.5.7

- **Fixed:** `/mods list` before the plugin manager has answered says so, instead of "dropped something".
- **Fixed:** when a read of the plugin manager fails, `/mods list` and the refresh button say they are showing the last list.

## 0.5.6

- **Fixed:** no mod claims "restart to load" before the control room knows what this session loaded; the first good read of the plugin manager settles it, even if the first one timed out.
- **Fixed:** one failed read of the plugin manager no longer wipes the last good list from the pane.
- **Fixed:** a switch the plugin manager reported as failed but actually made is now said to have happened.
- **Fixed:** `/mods install all` keeps each failure's reason, including when the plugin manager could not be started.

## 0.5.5

- **Fixed:** after a switch that failed or timed out the pane reads the list again, so it shows what the plugin manager actually did instead of a stale state.
- **Fixed:** `/mods install all` now names each mod that would not install and why, instead of reporting only the ones that worked.
- **Fixed:** a new session no longer waits up to 20 seconds on the plugin manager before it starts; the list fills in when it arrives.

## 0.5.4

- **Fixed: a plugin list that cannot be read no longer looks like "nothing installed".** If `claude plugin list --json` printed a warning before its JSON, or was cut off, the control room showed every mod as ON LEAVE and offered to install what was already there. It now says the plugin manager cannot be read.
- **Fixed: one odd entry in the list could spoil all of it**, and a mod name is now matched as a plain name, never as a pattern.
- **Fixed: a changelog with Windows line endings showed no notes** on its card; and a control character or half an emoji in a changelog could make the card unreadable, so they are dropped, and long words are broken between whole characters.
- The README now says what it reads (bytes, not characters), what else it runs (other mods' own commands) and that it holds the last list within a session.

## 0.5.3

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.5.2

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.5.1

- Opening the control room draws each card once: a card is redrawn only when its mod's name, version, state or notes change.

## 0.5.0

- Four stamps, four words, never plain ON/OFF: **ON DUTY** (on, and the lead mod), **AWAKE** (on), **NAPPING** (installed and switched off), **ON LEAVE** (not installed). Each stamp has its own mark, so it never relies on colour: a check, an eye, a ZZ, three dots. The plugin manager gives no signal for "used this week", so critter-buddy is ON DUTY when on and the others are AWAKE; nothing counts your use.
- The pane is ordered: critter-buddy first, then the states in order, each alphabetical, with a ruled strip between them that names the state and counts its mods.

## 0.4.0

- **Index cards.** Each mod in `/mods` is now a card: its name in title case, a version chip, a plain one-line "what it is", "How to use" in two or three short steps, and "What's new", the newest entry of that mod's own CHANGELOG (release notes, not file times). On the desktop each card is one picture: cream paper, ruled lines, typewriter text and a stamp that reads ON DUTY, ASLEEP or NOT HERE, each with its own mark (a tick, a dash, three dots) and border, so the three never differ by colour alone. In a plain terminal the same words sit in a rounded box.
- The header reads "Your mods · X of Y on", with **refresh** (re-reads the plugin manager and every changelog) and **close**.
- The switching, the restart notes, the install buttons and the `mods N/N` footer chip are unchanged. The pane is wider (80 columns) to hold the cards.
- The one-liners and the steps are in my words, in `hooks/catalog.ts` (`line` and `STEPS`), for the founder to replace.

## 0.3.0

- Each mod is a card: a rounded border in the pair's clay when it is on and dim when it is off, its name and version, one line of what it is, one line of how to use it, a toggle that shows where it stands (`━● on`, `●━ off`; the state is always in a word too), and its open buttons. A change that waits for a restart says so on the card.

## 0.2.0

- The footer carries a small chip, `mods 8/8`, the number of mods that are on, after whatever the footer already says. It says nothing where the plugin manager could not be read.
- The look-and-feel dials: feel, reach, pair and sound, as buttons that run critter-buddy's own commands.

## 0.1.0

- `/mods`: the control room. One pane lists the eight mods with their state, a switch for each (through the plugin manager, applied on restart), an install button for the missing ones, and a button for each of their own panes. `/mods list`, `on`, `off`, `install` and `open` do the same in plain text.
