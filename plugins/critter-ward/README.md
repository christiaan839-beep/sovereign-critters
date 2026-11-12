# critter-ward

![critter-ward: Stops the push before it happens.](preview.png)

**Guard** pillar: stops the one thing you cannot take back. One of thirteen [sovereign-critters](../../README.md#what-is-here) mods.

Stops a git push that forces, or that writes main or master, before the Bash tool runs it. It fails closed, and it is best effort: no substitute for branch protection on the server.

## What it does

Before the Bash tool runs a command, `critter-ward` reads it. It stops a `git push` that **forces**, or that **writes `main` or `master`**: by name, as `HEAD`, with `--all`, `--mirror` or `:`, as a delete, or where git's own settings send a branch named on the line.

It reads the common spellings of a command line (quotes, `cd`, `VAR=` words, wrappers such as `env`, `timeout` and `sudo`, `bash -c`, heredocs), and it asks git where each push really goes.

## What it does and sends

It reads the command line the model is about to run, and it sends nothing out: no network request, no telemetry, no file written, no state kept. The only program it starts is `git`, on your machine, in the push's own repository, to ask three things: which branch is checked out, what `git config --list` says about where a push goes, and which branch names are aliases of others. Each answer is held in memory for that one check and dropped. It never runs, evals or executes the command it reads.

The portal lists a few holds on this mod. Here is what each one is, from the code:

- **Decoded code at runtime.** The guard does not decode and run anything. The words `base64`, `xxd`, `openssl`, `gunzip` and the like appear in the source (the `DECODERS` list) only so it can spot a line that pipes a decoder into a shell (`… | base64 -d | sh`), which it cannot read ahead; that line is put to you with an ask.
- **Credential use.** The guard reads, holds and sends no credentials. `credential` in the source is the name of a git subcommand on a list of commands that do not move a branch. `git config --list` can print settings such as a remote URL or a credential helper name; the guard looks at them to learn where a push would go and keeps none of it. It sets no token, key or password anywhere.
- **Run-program and send-data items.** Run-program: one call, `git` with fixed arguments (`branch --show-current`, `config --list -z`, `for-each-ref`), no shell, with git's trace output switched off. Send-data: none; there is no network call in the module. The commands it recognises as programs the line starts (`git rebase -x`, `filter-branch --msg-filter`, `-c core.sshCommand=`) are only read, to judge them, never run by the guard.
- **A permission decision.** For a line it cannot read ahead, the guard answers the host's permission check with an ask, so you are the one who decides. If that check itself breaks, it asks too, and does not pass the call through unconfirmed. It never answers allow of its own.

## It fails closed

If the check cannot finish (git fails or times out, or the line cannot be read), the command waits and the refusal tells the model to ask the person. It also refuses what it cannot read ahead: an expansion, a glob, a `cd` it cannot be sure of, a push run with `PATH`, `GIT_EXEC_PATH` or an `LD_` or `DYLD_` variable set.

## What it does not do

**It stops an accidental push to main or master. It is not a security boundary against a script that is written to get past it.** A shell line can be spelled more ways than any reader can follow, and independent reviews keep finding new spellings; each one found is fixed and kept as a test, but the next one is not found yet. For a rule that must hold, use **branch protection on the server**.

It is **best effort**. A push made by a script or another program (`make`, an npm script, `gh`, an MCP tool, a python or node one-liner, a script file written on the line), and a command built while the line runs, are outside it. A git alias in a config file is read: `git pf` is judged as the `push --force` it stands for. So is a line that changes what a bare `git push` would do through something other than git before it: a `git checkout main --`, `git rebase --root main`, `git bisect reset main`, `git update-ref --stdin`, or a write into `.git/HEAD`, `.git/config`, a gitconfig or a settings file the line then points git at. A git hook written on the line is put to you, since a hook can run `git push` at the next commit. The programs a git command starts (`git rebase -x`, `filter-branch --msg-filter`, `fetch --upload-pack`, `-c core.sshCommand=`) are read as scripts. An alias the line itself makes (`git config alias.p "push -f"; git p`) is read and judged.

A line the guard cannot read ahead is **put to the person with an ask, never refused**, since `eval "$(direnv hook zsh)"` is common: an expansion run as a script or a command (`eval "$(…)"`, `sh -c "$(…)"`, `… | base64 -d | sh`, `C=$(…); eval "$C"`), a python, perl, node, ruby, awk or make script that names `git push`, a file the line writes and then runs, a git hook the line writes, and `core.hooksPath` set on a line that writes files. The ask goes through the host's permission check (`tool.check`), not through the tool call, which can only run or refuse; a push the guard can read on the same line is still refused. In a permission mode that answers questions for you (auto mode), the question may be answered without reaching you; that was seen with critter-latch on 2026-11-11. It stays a question on purpose: refusing would stop `eval "$(direnv hook zsh)"` and every shell setup line like it.

## What it never does

- It makes no network request and sends no telemetry. It runs `git` locally to ask where a push would go, and nothing else.
- It keeps no state.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-ward@sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## Check

```
claude plugin validate . --strict
claude plugin test .
```

## Early access

Mods are on by default from Claude Code 2.1.286. An organization can keep installed mods from running (`allowManagedModsOnly` in managed settings), and `claude --safe-mode` starts a session without them. The mod engine may change between releases without notice: tests pin this mod's behaviour, and when the engine moves, expect a patch release that follows it.


Apache-2.0. Not affiliated with Anthropic.
