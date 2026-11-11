import type { Register } from 'claude-code'

// critter-seal holds back a command that sends a secret to a host you have not listed: a secret file (.env, a private key,
// .npmrc), a key-shaped value (an AWS or GitHub key, a private key block) or a secret variable ($GITHUB_TOKEN).
//
// It matches SHAPES in the command line and then forgets them: a secret is never printed, stored or sent, and the message
// names the kind of secret and the host, never the value. It reads how a command is spelled, not what a program does or what
// travels on the network, so it is best effort and no substitute for keeping secrets out of reach.

const SENDERS = new Set(['curl', 'wget', 'http', 'https', 'xh', 'nc', 'ncat', 'netcat', 'scp', 'sftp', 'rsync', 'ssh', 'ftp', 'telnet'])
const WRAPPERS = /^(sudo|doas|env|command|builtin|exec|nohup|time|nice|ionice|stdbuf|timeout|setsid|caffeinate|xargs)$/
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh'])
const FILE_WORDS = new Set(['pem', 'key', 'env', 'json', 'txt', 'md', 'tgz', 'gz', 'zip', 'sh', 'js', 'ts', 'py', 'log', 'conf', 'cfg', 'yml', 'yaml', 'p12', 'pfx', 'pub', 'crt', 'cer', 'csv', 'xml', 'html', 'toml', 'lock', 'bak'])

const SECRET_FILE =
  /(?<![\w.-])(\.env(?:\.(?!example\b|sample\b|template\b|dist\b)[\w-]+)?|id_(?:rsa|dsa|ecdsa|ed25519)(?!\.pub)|[\w.-]+\.(?:pem|key|p12|pfx|keystore)|\.npmrc|\.netrc|\.pypirc|\.git-credentials|\.aws\/credentials|\.kube\/config|\.docker\/config\.json)(?![\w.-])/
const KEYS: [RegExp, string][] = [
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, 'an AWS access key'],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/, 'a GitHub token'],
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/, 'an API key'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'a Google API key'],
  [/\bnpm_[A-Za-z0-9]{36}\b/, 'an npm token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
]
const SECRET_VAR = /\$\{?[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL)[A-Z0-9_]*\}?/

// What kind of secret a stretch of command line holds, named without the value.
export function secretIn(text: string): string | undefined {
  const file = SECRET_FILE.exec(text)
  if (file) return file[1]
  for (const [re, kind] of KEYS) if (re.test(text)) return kind
  const v = SECRET_VAR.exec(text)
  return v ? `the variable ${v[0].replace(/[{}]/g, '')}` : undefined
}

export const trusted = (host: string, list: readonly string[]) => {
  const h = host.toLowerCase()
  return list.some(t => h === t.toLowerCase() || h.endsWith('.' + t.toLowerCase()))
}

// The hosts named in a sender's words: a URL, user@host:path, or a bare host. Userinfo is dropped (the host is what
// follows the last @ in the part before the first /). A host with an expansion in it comes back as '$'.
export function hostsOf(words: readonly string[]): string[] {
  const out: string[] = []
  for (const w of words) {
    if (!w || w.startsWith('-') || w.startsWith('@') || w.startsWith('.') || /^[\w.-]+=/.test(w)) continue
    let rest = w
    const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(w)
    if (scheme) rest = w.slice(scheme[0].length)
    else if (!/^[^/\s@]+@[^/\s]+:/.test(w) && !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(w)) continue
    let auth = rest.split(/[/?#]/)[0]!
    auth = auth.slice(auth.lastIndexOf('@') + 1)
    if (!scheme) auth = auth.replace(/:.*$/, '') // user@host:path
    else auth = auth.replace(/^\[|\](?=:|$)/g, '').replace(/:\d+$/, '')
    if (/[$`]/.test(auth)) out.push('$')
    else if (auth) {
      const last = auth.slice(auth.lastIndexOf('.') + 1).toLowerCase()
      if (scheme || !FILE_WORDS.has(last)) out.push(auth.toLowerCase())
    }
  }
  return out
}

// ---- reading the line -------------------------------------------------------------------------------------------

// Splits at the characters in `at`, outside quotes and outside $( ) and backticks.
function split(text: string, at: string): string[] {
  const parts: string[] = []
  let cur = ''
  let quote = ''
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '\\' && quote !== "'") {
      cur += c + (text[++i] ?? '')
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
      cur += c
      continue
    }
    if (c === "'" || c === '"' || c === '`') quote = c
    else if (c === '$' && text[i + 1] === '(') depth++
    else if (c === ')' && depth) depth--
    else if (!depth && at.includes(c)) {
      // && and || are two separators in a row, and an empty part between them is dropped.
      parts.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  parts.push(cur)
  return parts.map(p => p.trim()).filter(Boolean)
}

const unquote = (w: string) => w.replace(/^(["'])(.*)\1$/s, '$2')

function words(part: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote = ''
  for (const c of part) {
    if (quote) {
      if (c === quote) quote = ''
      cur += c
    } else if (c === '"' || c === "'") {
      quote = c
      cur += c
    } else if (/\s/.test(c)) {
      if (cur) out.push(cur)
      cur = ''
    } else cur += c
  }
  if (cur) out.push(cur)
  return out.map(unquote)
}

// The words of a part from its command on: past assignments and wrappers (sudo, env, xargs and the like, with their options).
function command(ws: string[]): string[] {
  let w = ws
  for (let guard = 0; guard < 10 && w.length; guard++) {
    const head = w[0]!.slice(w[0]!.lastIndexOf('/') + 1)
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]!)) w = w.slice(1)
    else if (WRAPPERS.test(head)) {
      let k = 1
      while (k < w.length && (w[k]!.startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[k]!))) k += /^-[uCSIPnLdEsa]$/.test(w[k]!) ? 2 : 1
      w = w.slice(k)
    } else break
  }
  return w
}

const ASK = (what: string, to: string) => `this sends ${what} to ${to}`

export function judge(line: string, list: readonly string[], depth = 0): string | undefined {
  if (depth > 4) return 'the line nests shells too deep for the guard to read'
  for (const chunk of split(line, ';&\n')) {
    const senders: string[][] = []
    for (const part of split(chunk, '|')) {
      const w = command(words(part))
      if (!w.length) continue
      const name = w[0]!.slice(w[0]!.lastIndexOf('/') + 1)
      if (SENDERS.has(name)) senders.push(w.slice(1))
      else if (SHELLS.has(name)) {
        const c = w.findIndex(a => /^-[A-Za-z]*c[A-Za-z]*$/.test(a))
        const script = c >= 0 ? w.slice(c + 1).find(a => !a.startsWith('-')) : undefined
        const why = script ? judge(script, list, depth + 1) : undefined
        if (why) return why
      }
    }
    if (!senders.length) continue
    const what = secretIn(chunk)
    if (!what) continue
    const hosts = senders.flatMap(hostsOf)
    if (!hosts.length || hosts.includes('$')) return ASK(what, 'a host the guard cannot read')
    const bad = hosts.find(h => !trusted(h, list))
    if (bad) return `${ASK(what, bad)}, which is not on your list`
  }
  return undefined
}

// A page fetch that carries a key in its address.
export function judgeUrl(url: string, list: readonly string[]): string | undefined {
  const what = secretIn(url)
  if (!what) return undefined
  const hosts = hostsOf([url])
  const bad = hosts.find(h => !trusted(h, list))
  return bad ? `${ASK(what, bad)}, which is not on your list` : undefined
}

const TAIL = `Add it under "Hosts you trust" in this mod's settings, or ask the person to run it themselves.`
const list = (options: { trustedHosts?: unknown } | undefined) =>
  String(options?.trustedHosts ?? 'github.com, npmjs.org, pypi.org, pythonhosted.org, localhost, 127.0.0.1')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean)

export const register: Register = (on, options) => {
  const hosts = list(options)

  on('tool.call', { tool: 'Bash' }, (_$, e, next) => {
    const why = typeof e.command === 'string' ? judge(e.command, hosts) : undefined
    return why ? { deny: `seal: ${why}. ${TAIL}` } : next(e)
  })
    // Fails closed, but only for a line that names something that sends: any other command goes on as if the mod were not here.
    .catch(($, e, next) =>
      !next.called && /\b(curl|wget|nc|ncat|netcat|scp|sftp|rsync|ssh|ftp|telnet|http|https|xh)\b/.test(String((e as { command?: unknown }).command ?? ''))
        ? { deny: `seal: could not read this line, so it waits. ${TAIL}` }
        : next(e),
    )

  on('tool.call', { tool: 'WebFetch' }, (_$, e, next) => {
    const why = typeof e.url === 'string' ? judgeUrl(e.url, hosts) : undefined
    return why ? { deny: `seal: ${why}. ${TAIL}` } : next(e)
  }).catch(($, e, next) => next(e))
}
