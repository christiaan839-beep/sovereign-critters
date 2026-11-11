# Changelog

## 0.4.0

- **A note says how old it is.** From an earlier session the band reads "you left this yesterday:" or "you left this 3 days ago:", so a note from last month is not taken for this morning's. Under a day it still says "you left this:". Nothing new is stored: the age comes from when the note was held.
- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.3.2

- **The crab will not carry a key.** `/crab hold` refuses a note that looks like an access key, a token, a private key block or a `password: …` line, says so without repeating it, and stores nothing. A note is kept as plain text and drawn above the prompt.

## 0.3.1

- Docs: the rename note below no longer says the diary's week was lost with the crab.
- Tests: the folder key is pinned to the value earlier releases wrote, so a note held last week is still found.

## 0.3.0

- **Renamed from `crab` to `critter-crab`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-crab`, and remove the old plugin. The notes you left in your folders start fresh under the new name; hold them again.

## 0.2.6

- **Fixed:** a new session in a folder that cannot be identified no longer inherits the previous folder's note.

## 0.2.5

- **Fixed:** while the store will not read, `/crab` and `/crab drop` now say so instead of claiming the crab holds nothing; when it reads again the band comes back by itself.

## 0.2.4

- **Fixed:** if the store would not read when a session started, `/crab` said it held nothing and `/crab drop` did nothing even once the store was back. Both now ask the store again.

## 0.2.3

- **Fixed: a note cannot be disguised with Unicode direction controls** (such as a right-to-left override that reverses the text in the band); they are removed like the colour codes and control characters already were.

## 0.2.2

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.2.1

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.2.0

- Redesigned: the crab holds your place. `/crab hold <text>` leaves a one-line note (120 characters at most) for the folder you are in; `/crab` shows it; `/crab drop` puts it down. A small pixel crab of our own, in the pair's clay, carries it in a band above the prompt: "holding: ..." for a note from this session, "you left this: ..." when you come back to the folder in a new session.
- Nothing is drawn until you give it a note. The band is two lines, never wraps, and is cut with an ellipsis at the width it has.
- Notes live in the plugin's own store, one per folder, under a short hash of the path (never the path or the name); fifty folders at most, the oldest let go. A store that will not read or write never blocks a session or a prompt.
- The old hot-reload band, "module's own: loaded ... / $.state: N prompts", is no longer part of the install. It lives on as a teaching example for mod authors in `examples/hot-reload-demo/`.

## 0.1.0

First release.
