# critter-seal

![critter-seal: Keeps your secrets on your machine.](preview.png)

**Guard** pillar: stops the one thing you cannot take back. One of thirteen [sovereign-critters](../../README.md#what-is-here) mods.

An opt-in guard that keeps secrets on your machine. It holds back a command that sends a secret to a host you have not listed.

```
seal: this sends .env to paste.example, which is not on your list. Add it under "Hosts you trust" in this mod's settings, or ask the person to run it themselves.
```

## What it looks for

A **sender** (`curl`, `wget`, `http`, `nc`, `scp`, `sftp`, `rsync`, `ssh`, `ftp`) in the same pipeline as a **secret**, read past wrappers (`sudo`, `env`, `timeout`, `watch`, `xargs`, `find -exec` and the like) and through `bash -c`, `eval`, heredocs and pipelines that go on to the next line:

- a secret file: `.env` (not `.env.example`), a private key, `*.pem`, `*.key`, `.npmrc`, `.netrc`, `.aws/credentials`, `.git-credentials` and the like;
- a key-shaped value: an AWS access key, a GitHub token, an API key, a Slack or npm token, a private key block;
- a secret variable: `$GITHUB_TOKEN`, `${API_KEY}`, `$NPM_PASSWORD`.

It also holds back a `WebFetch` whose address carries a key-shaped value.

The same send to a host on your list goes through. The list is **Hosts you trust** in the mod's settings (a host and its subdomains; the default is GitHub, npm, PyPI, localhost). A lookalike (`github.com.evil.example`, `evilgithub.com`, or a trusted name placed before an at sign in the address) is not trusted.

## What it never does

It matches shapes and forgets them. It never prints a secret (the message names the file or the kind, and the host), never stores one and never sends one anywhere. It reads no file contents.

## Limits

It is best effort and no substitute for keeping secrets out of reach.

- It reads the command, not the traffic. A program that reads a secret and sends it on its own, a script, a package install script, and a browser are invisible to it.
- It sees only the senders listed above, plus `xh`, `ncat`, `telnet`, `socat`, `openssl s_client`, `/dev/tcp`, `aria2c`, `dig`, `mail`, `lftp`, `rclone`, `gsutil`, `aws s3`, `gh gist` and `gh api gists`. `python -c`, `node -e`, `perl`, `git push` to a remote and the like are not read.
- A secret printed by a program (`gh auth token`, `security find-generic-password`, `aws configure get`) is not a shape it knows. A send to a listed host goes through whatever it does there: `curl` to GitHub's API can make an issue, a release asset or a gist.
- It follows a secret through a variable or a copied file only within one command line. A secret that is encoded (`base64` in a separate step), split in pieces, or held in a variable other than the names above gets past it.
- `curl -L` can be sent on to a host you did not list by a redirect. It reads the address on the line, a proxy, a `--connect-to` and a `Host:` header, not where the server sends you next.
- It can hold back a download it should not: a command that fetches a remote secret file to your machine (`scp host.example:/app/.env .`) looks like a send. It keeps a file open by `exec 3<>/dev/tcp/...` and writes to it later only if both are on one line piece. It does not read the text of a remote command (`ssh host 'cat .env'` is held).
- A host it cannot read (`$URL`) when a secret goes with it is put to you as a question instead of refused; a host it read and found unlisted is refused. In a permission mode that answers questions for you (auto mode), the question may be answered without reaching you; that was seen with critter-latch on 2026-11-11. It stays a question on purpose: refusing would stop every send whose address is a variable. Hosts in the settings may be written as `github.com`, `*.github.com` or `https://github.com`.
- It fails closed for a line that names a sender and that it cannot read; any other command goes on as if the mod were not there.

## Threat model

| | |
| --- | --- |
| **Protects against** | Claude, or you through Claude, sending a secret to a host you have not listed, by accident: `.env` in a `curl -d @`, a token pasted into a URL, a key file in an `scp`. |
| **Not against** | Someone who means to get past it: a secret encoded or split in a separate step, a program or install script that reads and sends it on its own, a language one-liner (`python -c`, `node -e`). A prompt injection that does any of these is outside it too. |
| **Where it looks** | The command line of Claude's Bash tool and the address of a `WebFetch`, before they run (`tool.call`). Not the traffic, not your own terminal, not another mod's `$.http` or `$.process` calls. |
| **How it fails** | Closed, for its one promise: a line that names a sender and that it cannot read is held; a send whose host it cannot read is put to you as a question; a host it read and found unlisted is refused. |
| **Where it does not run** | Where it does not run at all: on a machine whose organization sets `allowManagedModsOnly` (no mod a person installs runs its hooks), in a `claude --safe-mode` session, under `disableAllHooks`, and in a folder before you answer its trust prompt. Check `/plugin` before counting on it on a managed machine. In auto mode a question may be answered without reaching you. |
| **Review record** | Four independent adversarial rounds (2026-11-11 and 2026-11-12; about 760 commands). The fourth, on 0.1.7, ran about 430 and found 3 high and 10 medium ways past it (a heredoc delimiter read short, a pipeline split over two lines, more shells and wrappers), all fixed in 0.1.8 with a test that failed first. Seen holding back `curl -d @.env` to an unlisted host with the README's message, word for word. Open high findings: none. Known gap: the fourth round's fixes were checked again only by the session that made them. `QUALITY.md` has the full record. |
| **The real control** | Keeping secrets out of reach: a secret store, short-lived tokens, nothing in the working folder. |
| **Found a way past it?** | That counts as a vulnerability: report it privately, as [`SECURITY.md`](../../SECURITY.md) says. |

## Early access

Mods are on by default from Claude Code 2.1.286. An organization can keep installed mods from running (`allowManagedModsOnly` in managed settings), and `claude --safe-mode` starts a session without them. The mod engine may change between releases without notice: tests pin this mod's behaviour, and when the engine moves, expect a patch release that follows it.
