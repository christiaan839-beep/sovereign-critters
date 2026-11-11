# Changelog

## 0.6.0

- **Renamed from `session-diary` to `critter-diary`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-diary`, and remove the old plugin; anything it stored (a crab note, the diary's week) starts fresh under the new name.

## 0.5.2

- **Fixed:** the five-second guard on store steps no longer leaves a timer running after each step, and a host without a timer simply does not time them.
- Known limit: a store step that gives up is not cancelled, so a very late write could still land after `/diary clear`.

- **Fixed:** a store that never answers can no longer hang `/diary clear` or stop the week recording; each store step gives up after five seconds.

## 0.5.1

- **Fixed:** a slow or stuck store can no longer hold up a tool's result; the week is written behind it.
- **Fixed:** `/diary clear` can no longer lose to a write still on its way, and a clock that steps back cannot erase a day.
- **Fixed:** a tool name with a web address, an e-mail address, a right-to-left control or a line separator can no longer make a link or reorder the copied text.
- Note: two Claude Code sessions open at once each keep their own count and the last to write wins, so a busy parallel week can come out a few calls short.

## 0.5.0

- **Fixed:** `/diary week` now survives a restart. The week was kept in the session's state and started over each session although the README said otherwise; it now lives in the plugin's store, 14 days of counts.
- **Changed:** `/diary clear` empties the week as well as the session. Say so first if you want to keep your week.
- **Fixed:** a time can no longer read "1 min 60 s", "60.0 s" or a made-up "1 ms"; under 10 ms it says "under 10 ms".
- **Fixed:** a tool name an MCP server chose can no longer add a heading, a link or emphasis to the copied markdown.
- **Fixed:** two tools finishing at the same moment both count in the week.

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
