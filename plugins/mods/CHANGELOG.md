# Changelog

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
