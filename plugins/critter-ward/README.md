# critter-ward

![critter-ward: Stops the push before it happens.](preview.png)

Stops a git push that forces, or that writes main or master, before the Bash tool runs it. It fails closed, and it is best effort: no substitute for branch protection on the server.

## What it does

Before the Bash tool runs a command, `critter-ward` reads it. It stops a `git push` that **forces**, or that **writes `main` or `master`**: by name, as `HEAD`, with `--all`, `--mirror` or `:`, as a delete, or where git's own settings send a branch named on the line.

It reads the common spellings of a command line (quotes, `cd`, `VAR=` words, wrappers such as `env`, `timeout` and `sudo`, `bash -c`, heredocs), and it asks git where each push really goes.

## It fails closed

If the check cannot finish (git fails or times out, or the line cannot be read), the command waits and the refusal tells the model to ask the person. It also refuses what it cannot read ahead: an expansion, a glob, a `cd` it cannot be sure of, a push run with `PATH`, `GIT_EXEC_PATH` or an `LD_` or `DYLD_` variable set.

## What it does not do

**It stops an accidental push to main or master. It is not a security boundary against a script that is written to get past it.** A shell line can be spelled more ways than any reader can follow, and independent reviews keep finding new spellings; each one found is fixed and kept as a test, but the next one is not found yet. For a rule that must hold, use **branch protection on the server**.

It is **best effort**. A push made by a script or another program (`make`, an npm script, `gh`, an MCP tool, a python or node one-liner, a script file written on the line), and a command built while the line runs, are outside it. A git alias in a config file is read: `git pf` is judged as the `push --force` it stands for. So is a line that changes what a bare `git push` would do through something other than git before it: a `git checkout main --`, `git rebase --root main`, `git bisect reset main`, `git update-ref --stdin`, or a write into `.git/HEAD`, `.git/config`, a gitconfig or a settings file the line then points git at. A git hook written on the line is refused, since a hook can run `git push` at the next commit. The programs a git command starts (`git rebase -x`, `filter-branch --msg-filter`, `fetch --upload-pack`, `-c core.sshCommand=`) are read as scripts. An alias the line itself makes (`git config alias.p "push -f"; git p`) is read and judged.

A script or a command name that is an expansion nobody can read ahead (`eval "$(…)"`, `sh -c "$(…)"`, `… | base64 -d | sh`, `C=$(…); eval "$C"`) is marked for the person to be asked, never refused, since `eval "$(direnv hook zsh)"` is common. The permission check puts such a line to you with the reason, and you decide; a push the guard can read on the same line is still refused.

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

Apache-2.0. Not affiliated with Anthropic.
