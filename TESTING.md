# Test prompts: paste these, in order

Restart Claude Code first (plugins load only in a new session), in a window at least 110 columns wide. Everything below is typed at the prompt.

## 1. The control room

| Type | You should see |
| --- | --- |
| `/mods` | A pane docked on the right: every mod with `●` on, a switch, an `open` row (for the mods that have a pane of their own), then "Look and feel" with feel, reach, pair and sound buttons. |
| `/mods list` | Ten lines: "Mods: 8 of 8 on.", one line per mod, and a hint line. |
| `/mods off forge` | "forge is off. Restart Claude Code to apply." |
| `/mods on forge` | "forge is on." (put it back) |
| `/mods off rm -rf` | The usage line. Nothing is run. |
| `/mods open critter` | `/critter corner` appears in the prompt box; press Enter. |

## 2. The pair

`/critter doctor` · `/critter pet` · `/critter nap` · `/critter spell` · `/critter stage` · `/critter corner` · `/critter feel still` (nothing moves) then `/critter feel warm` · `/critter hide` then `/critter show` · `/critter sound on`, then `/critter pet` (a purr) · `/critter diary`

## 3. A session worth a diary

Ask Claude: *"List the files in this folder and read the README."* Then `/diary`, `/diary week`, `/diary postcard`, `/diary postcard copy` (paste it somewhere).

## 4. The crab

`/crab hold ask Mira about the seed file` → the crab appears above the prompt. Quit, start again in the same folder: it says **you left this:**. `/crab drop` puts it down.

## 5. The guard

Ask Claude: *"Run `git push --force origin main` in a scratch repo."* The guard must stop it before Bash runs.

## 6. The bell

Ask Claude: *"Run `sleep 25` in Bash."* A bell and a toast when it ends. (build-bell has its own `sound` setting, on by default; `/critter sound on` is for the pair's sounds, a different thing.)

## 7. Everywhere and stunt

`/stunt`, `/everywhere`.

## Local, the desktop app, and the cloud

- **Local terminal:** everything above. This is the surface it was built and tested on; the terminal run is the most verified.
- **Claude desktop app (Code tab):** panes, the see-through stage, the sky behind the chat and the picture band are drawn there. The version of the app we tested has no window backdrop (`/critter doctor` says so), so the sky is drawn in the band behind the pair; the band, its buttons, the party faces and `/critter perf` were confirmed by the founder's photos on 2026-11-11. The stage, the corner and the sky in the band have not been seen yet.
- **Cloud sessions (`claude --cloud`, claude.ai/code):** not tested, and could not be from here. The mods that only react to what Claude does (guard, build-bell's toast, forge, session-diary's counting) should load wherever plugins load. `/mods` needs the `claude` command on the machine, so in a session without it, it says so: `/mods list`, `on`, `off` and `install` answer that they cannot reach the plugin manager, and `/mods` opens its pane with a warning. Panes only draw on surfaces that draw panes.
- **VS Code panel and `claude -p`:** the mods' hooks run and nothing is drawn; commands answer in text.
