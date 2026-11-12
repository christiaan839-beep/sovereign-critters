# critter-latch

![critter-latch: Holds the delete you cannot take back.](preview.png)

**Guard** pillar: stops the one thing you cannot take back. One of thirteen [sovereign-critters](../../README.md#what-is-here) mods.

An opt-in guard against deletes you cannot take back. Install it and it stops these before the Bash tool runs them:

- a recursive `rm` that reaches outside the folder you opened, or would remove that folder or one above it (`rm -rf ..`, `rm -rf ~`, `rm -rf *`);
- `git reset --hard`;
- `git clean -f` (any spelling that forces and is not a dry run);
- `git checkout .`, `git checkout -f`, `git switch -f` (or `--discard-changes`) and `git restore .` over the whole tree; a `--pathspec-from-file` it cannot read waits.

```
latch: rm -r reaches outside the folder you opened (/work/app). Ask the person to run it themselves if they meant it.
```

A recursive delete inside the folder (`rm -rf dist`, `find . -name __pycache__ -exec rm -rf {} +`, `git ls-files | xargs rm -rf`) goes through. So do `git clean -n`, `git reset --soft` and `git checkout main`.

## How it reads

It reads the command line, past `sudo`, `env`, `time`, `nice`, `watch`, `xargs`, `find -exec`, `bash -c` (and the other shells' `-c`), `eval`, `echo ... | sh`, `bash <(…)`, `source /dev/stdin`, `$( )`, backticks, redirects, heredocs, line continuations and shell keywords. It follows `cd`, `pushd`, `popd` and zsh's `chdir` on the same line, and a wrapper that runs the command elsewhere (`env -C`, `sudo -D`, `chroot`), and when a `cd` might not have happened (after `;`, `||` or in a subshell) it judges a relative target against every folder the command could be in. A `cd` it can read to a folder outside the one you opened makes a recursive delete after it a clear stop (`cd /tmp/x && rm -rf dist`). A target it cannot read (`$VAR`, a brace, a backtick) is held back, not guessed.

## Limits

It is best effort and no substitute for a backup or for version control.

- It reads how a command is spelled, not what a script does. `make clean`, `npm run reset`, `find -delete`, `rsync --delete`, a git alias and a program that deletes on its own are invisible to it, and so is a script that comes out of another program (`… | base64 -d | sh`, `curl … | sh`).
- It guards `rm` and four git commands. It does not guard `mv`, `dd`, `>` truncation, `git branch -D`, `git stash drop`, `git checkout-index`, `git read-tree --reset` or `git push --force` (that is [critter-ward](../critter-ward)).
- It cannot read options built from a variable (`rm $FLAGS x`), a `case` inside `$( )`, or a `CDPATH` that changes where `cd` goes. A symlink inside the folder that points outside it is not followed.
- `cd sub; make; cd ..; rm -rf build` is held: if the first `cd` had failed, the second would have left the folder. Write it with `&&`. An `eval` of anything but a well-known setup tool's output (`ssh-agent`, `direnv`, `pyenv`, `opam` and the like) is held, and an alias defined elsewhere is invisible.
- It judges the folder the session was opened in (it asks the session for it, so a shell that has since moved is judged against where it began). If it cannot tell which that is, a recursive delete waits.
- It fails closed for a line that names `rm`, `git`, `xargs` or `find` and that it cannot read; any other command goes on as if the mod were not there.
- It never reads file contents, keeps nothing and sends nothing.

A command it stopped is refused. A command it could not read (a `$VAR` target, an `eval` of something unknown) is put to you as a question instead, so a false alarm costs one click. In a permission mode that answers questions for you (auto mode), the question may be answered without reaching you: that was seen on 2026-11-11, and it is why only what the guard truly cannot read is a question. To run a refused command anyway, run it yourself in a terminal.

## What it does and sends

- **Reads the command line** of each Bash call before it runs, and decides whether it is a recursive delete outside the folder you opened, `git reset --hard`, `git clean -f`, or a `git checkout` / `restore` / `switch -f` over the whole tree. It follows `cd`, `sudo`, `xargs`, `bash -c` and the like within the one line. It looks up `HOME` and the folder the session was opened in. It never reads file contents.
- **Stops, or asks.** A command it can read and that is dangerous is refused, with the reason. A line that names `rm`, `git` or `xargs` and that it cannot read is put to you as a question. Every other command goes on as if the mod were not there.
- **Fails closed** for that one promise only. It is opt-in: install it to turn it on.
- **Keeps** nothing and **sends** nothing: no network request, no telemetry, no sound files, no credentials, no program run.
- It is best effort and reads how a command is spelled, not what a script does. It is not a security boundary, and an organization can turn it off (see [SECURITY.md](../../SECURITY.md)).

## Threat model

| | |
| --- | --- |
| **Protects against** | Claude, or you through Claude, running a delete or a reset that cannot be taken back, by accident: a path that reaches out of the folder, a `cd` that went somewhere else, a `reset --hard` over work not yet committed. |
| **Not against** | Someone who means to get past it, or a program that deletes on its own (`make clean`, an npm script, `rsync --delete`). A prompt injection that writes such a script is outside it too. |
| **Where it looks** | The command line of Claude's Bash tool, before it runs (`tool.call`). Not your own terminal, not another mod's `$.process` calls, not what a program does once started. |
| **How it fails** | Closed, for its one promise: a line that names `rm`, `git`, `xargs` or `find` and that it cannot read is put to you as a question; a clear stop is refused outright. |
| **Where it does not run** | Where it does not run at all: on a machine whose organization sets `allowManagedModsOnly` (no mod a person installs runs its hooks), in a `claude --safe-mode` session, under `disableAllHooks`, and in a folder before you answer its trust prompt. Check `/plugin` before counting on it on a managed machine. In auto mode a question may be answered without reaching you (seen 2026-11-11). |
| **Review record** | Four independent adversarial rounds (2026-11-11 and 2026-11-12; about 950 commands). The fourth, on 0.1.7, ran about 350 against real git and shells and found 8 high and 8 medium ways past it (a wrapper or zsh `cd` that moved the delete, options turned back off, more spellings of the whole tree, a heredoc misread), all fixed in 0.1.9 with a test that failed first. Seen in the desktop app refusing `git reset --hard` and, after the 0.1.2 fix, `cd /tmp && rm -rf x`. Open high findings: none. Known gap: the fourth round's fixes were checked again only by the session that made them. `QUALITY.md` has the full record. |
| **The real control** | Version control and a backup. |
| **Found a way past it?** | That counts as a vulnerability: report it privately, as [`SECURITY.md`](../../SECURITY.md) says. |

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-latch@sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## Early access

Mods are on by default from Claude Code 2.1.286. An organization can keep installed mods from running (`allowManagedModsOnly` in managed settings), and `claude --safe-mode` starts a session without them. The mod engine may change between releases without notice: tests pin this mod's behaviour, and when the engine moves, expect a patch release that follows it.

Apache-2.0. Not affiliated with Anthropic.
