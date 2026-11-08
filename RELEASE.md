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

All eight plugins and the marketplace must pass. Search the tree for anything that should not be public: keys, personal paths, model IDs.

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

## 5. After

Tag the first release, and keep a changelog line for every change that a person using the plugins can see.
