# Changelog

## 0.4.6

- **Fixed:** a tool named like an object property (`constructor`, `toString`, `__proto__`) is now counted as itself in the day, the week and the postcard; before, its count turned into text.

## 0.4.5

- **Fixed:** a subagent finishing is no longer counted as a turn in your day or your week.

## 0.4.4

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.4.3

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.4.2

- Timing a tool call no longer waits on the clock before the tool starts, and each tool's two diary writes are made together.

## 0.4.1

- The pane's buttons are spaced by a column gap, so none loses its closing bracket in the terminal (the same fault seen in critter-buddy's stage).

## 0.4.0

- `/diary postcard` sums the session up on one screen: how long, the hours it ran, turns and Claude's working time, tool calls and failures, the busiest hour, and the three tools used most. `/diary postcard copy` (or `p` in the pane) puts it on the clipboard as markdown. Tool names and times only, as ever. A session of two hours or more gets a line saying so; a diary at its 300-line cap says the start may be missing.

## 0.3.0

- `/diary week` draws a bar for each day, scaled to the busiest, so the week reads at a glance, and names the busiest day (nobody on a tie).

## 0.2.0

- `/diary week`: the last seven days in Johannesburg, a line a day (tool calls, failures, turns, time Claude worked), the totals and the three busiest tools. `/diary week copy` puts it on the clipboard as markdown. Counts are kept for 14 days, tool names only, so the week survives the 300-line cap.

## 0.1.0

- /diary: every tool call with its Johannesburg hour, outcome and duration; a line for each turn; copy as markdown (`/diary copy`); clear (`/diary clear`). Tool names and times only, the last 300 lines.
