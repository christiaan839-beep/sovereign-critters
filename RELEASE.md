# Release checklist

Nothing here is published yet. This is the order to do it in.

## 1. Use it for a day

Install from the local marketplace and use it in real sessions:

```
claude plugin marketplace add ~/sovereign-critters
claude plugin install critter-buddy@sovereign-critters
```

Then start a new session. Look at:

- The bar above the prompt on the desktop app: the critter and the cat clear of each other, the label row clear of the picture.
- `/critter stage`, `/critter corner` and `/diary`.
- The window backdrop (cream by day, dark with stars from 18:00 to 05:59 in Johannesburg). It has never been seen running.
- `/critter sound on`, then a Skill and a pet. `build-bell` after a command of 20 seconds or more.
- Resting: both asleep should steady the bar to one redraw a second.

Write down anything that looks wrong. Fix it before step 2.

## 2. Last checks

```
for p in plugins/*/; do (cd $p && claude plugin validate . --strict && claude plugin test .); done
claude plugin validate . --strict
```

All nine plugins and the marketplace must pass. Search the tree for anything that should not be public: keys, personal paths, model IDs.

Read the not-affiliated lines in the READMEs once against Anthropic's trademark guidelines.

## 3. Publish

Create the public repository `christiaan839-beep/sovereign-critters` on GitHub, then:

```
git remote add origin git@github.com:christiaan839-beep/sovereign-critters.git
git push -u origin main
```

Watch the first CI run. It installs the Claude Code CLI at the version pinned in `.github/workflows/check.yml`.

## 4. The plugin directory

Submit each plugin at claude.ai/directory/manage. The directory needs, and each plugin has: a licence (Apache-2.0), an icon, a README with an install line, and a clean `claude plugin validate . --strict`. It also runs its own safety scan and policy review, which can ask for more.

## 4b. The cold install, for someone who is not the founder

Two outside testers follow this on a machine that has never seen the mods. It needs the public repository from step 3 (or a private one the tester has been invited to), because it installs from GitHub with no clone. Give them this page and nothing else.

**Before you start:** Claude Code 2.1.275 or later (`claude --version`), and a window at least 110 columns wide for the first look.

1. Start Claude Code in any folder you trust.
2. Add the marketplace and install the lead plugin:

   ```
   /plugin marketplace add christiaan839-beep/sovereign-critters
   /plugin install critter-buddy@sovereign-critters
   ```

3. Quit Claude Code completely and start it again. Plugins load only in a new session.
4. In the new session, run `/critter doctor`.

**A good first minute looks like this:**

- Under the version banner, a dim greeting line from the cat ("critter-buddy: ..."), and under it, once only: `critter-buddy: Biscuit and Pip are here. /critter for the controls`. It does not come back in a second session.
- Above the prompt, a small orange cat and a wizard critter, drawn in pixels. On the desktop app a status line and five buttons sit under them. In a terminal shorter than about 50 rows the buttons may be hidden behind a "more" line: that is known, not your fault.
- `/critter doctor` answers in a few plain lines, beginning `critter-buddy: Reach: party. Feel: warm. Surface: terminal, 130 columns.` (your own surface and width), then what is off and the command that turns it on: sound, the voice, the spoken line after a turn. It must not say "narrow" at 110 columns or more.
- `/critter pet` makes the cat answer in a line. `/critter hide` and `/critter show` make the pair go and come back.
- Nothing makes a sound until you type `/critter sound on`.

**Optional, in the same session:** `/plugin install session-diary@sovereign-critters`, restart, do a few things with Claude, then `/diary` and `/diary postcard`.

**Report back, in one message each:**

- What you saw at step 4, as a photo of the screen if you can (the whole window, not a crop).
- Anything that looked clipped, overlapped or wrong, and the width of your window.
- Whether anything slowed Claude down or got in the way of typing.
- Whether you would leave it on tomorrow, and why or why not.

**To remove it:**

```
/plugin uninstall critter-buddy@sovereign-critters
/plugin marketplace remove sovereign-critters
```

Its settings and notes live in Claude Code's own plugin store, not in your folders: it wrote nothing into your projects.

## 5. After

Tag the first release, and keep a changelog line for every change that a person using the plugins can see.
