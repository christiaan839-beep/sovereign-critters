# critter-seal

An opt-in guard that keeps secrets on your machine. It holds back a command that sends a secret to a host you have not listed.

```
seal: this sends .env to paste.example, which is not on your list. Add it under "Hosts you trust" in this mod's settings, or ask the person to run it themselves.
```

## What it looks for

A **sender** (`curl`, `wget`, `http`, `nc`, `scp`, `sftp`, `rsync`, `ssh`, `ftp`) in the same pipeline as a **secret**:

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
- It sees only the senders listed above. `python -c`, `node -e`, `openssl s_client`, `git push` to a remote and the like are not read.
- A secret that is encoded, split, or held in a variable other than the names above gets past it.
- A host it cannot read (`$URL`) is held back when a secret goes with it.
- It fails closed for a line that names a sender and that it cannot read; any other command goes on as if the mod were not there.
