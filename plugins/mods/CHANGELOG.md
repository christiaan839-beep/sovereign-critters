# Changelog

## 0.3.0

- Each mod is a card: a rounded border in the pair's clay when it is on and dim when it is off, its name and version, one line of what it is, one line of how to use it, a toggle that shows where it stands (`━● on`, `●━ off`; the state is always in a word too), and its open buttons. A change that waits for a restart says so on the card.

## 0.2.0

- The footer carries a small chip, `mods 8/8`, the number of mods that are on, after whatever the footer already says. It says nothing where the plugin manager could not be read.
- The look-and-feel dials: feel, reach, pair and sound, as buttons that run critter-buddy's own commands.

## 0.1.0

- `/mods`: the control room. One pane lists the eight mods with their state, a switch for each (through the plugin manager, applied on restart), an install button for the missing ones, and a button for each of their own panes. `/mods list`, `on`, `off`, `install` and `open` do the same in plain text.
