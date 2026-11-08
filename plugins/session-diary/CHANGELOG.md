# Changelog

## 0.4.0

- `/diary postcard` sums the session up on one screen: how long, the hours it ran, turns and Claude's working time, tool calls and failures, the busiest hour, and the three tools used most. `/diary postcard copy` (or `p` in the pane) puts it on the clipboard as markdown. Tool names and times only, as ever. A session of two hours or more gets a line saying so; a diary at its 300-line cap says the start may be missing.

## 0.3.0

- `/diary week` draws a bar for each day, scaled to the busiest, so the week reads at a glance, and names the busiest day (nobody on a tie).

## 0.2.0

- `/diary week`: the last seven days in Johannesburg, a line a day (tool calls, failures, turns, time Claude worked), the totals and the three busiest tools. `/diary week copy` puts it on the clipboard as markdown. Counts are kept for 14 days, tool names only, so the week survives the 300-line cap.

## 0.1.0

- /diary: every tool call with its Johannesburg hour, outcome and duration; a line for each turn; copy as markdown (`/diary copy`); clear (`/diary clear`). Tool names and times only, the last 300 lines.
