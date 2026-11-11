# Changelog

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
