# guard

![guard: Stops the push before it happens.](preview.png)

Stops a git push that forces, or that writes main or master, before the Bash tool runs it. It fails closed, and it is best effort: no substitute for branch protection on the server.

## What it does

Before the Bash tool runs a command, `guard` reads it. It stops a `git push` that **forces**, or that **writes `main` or `master`**: by name, as `HEAD`, with `--all`, `--mirror` or `:`, as a delete, or where git's own settings send a branch named on the line.

It reads the common spellings of a command line (quotes, `cd`, `VAR=` words, wrappers such as `env`, `timeout` and `sudo`, `bash -c`, heredocs), and it asks git where each push really goes.

## It fails closed

If the check cannot finish (git fails or times out, or the line cannot be read), the command waits and the refusal tells the model to ask the person. It also refuses what it cannot read ahead: an expansion, a glob, a `cd` it cannot be sure of, a push run with `PATH`, `GIT_EXEC_PATH` or an `LD_` or `DYLD_` variable set.

## What it does not do

It is **best effort**. A push made by a script or another program (`make`, an npm script, `gh`, an MCP tool), a command built while the line runs, and a git alias in a config file are outside it. It is no substitute for **branch protection on the server**.

## Install

```
/plugin install guard --marketplace christiaan839-beep/sovereign-critters
```

Plugins load in a new session. To try it from this folder instead: `claude --plugin-dir .`

## Check

```
claude plugin validate . --strict
claude plugin test .
```

Apache-2.0. Not affiliated with Anthropic.
