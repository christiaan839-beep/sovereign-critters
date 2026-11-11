import type { Register } from 'claude-code'

// critter-seal holds back a command that sends a secret to a host you have not listed: a secret file (.env, a private key,
// .npmrc), a key-shaped value (an AWS or GitHub key, a private key block), a secret variable ($GITHUB_TOKEN) or the whole
// environment (env, printenv).
//
// It matches SHAPES in the command line and then forgets them: a secret is never printed, stored or sent, and the message
// names the kind of secret and the host, never the value. It reads how a command is spelled, not what a program does or what
// travels on the network, so it is best effort and no substitute for keeping secrets out of reach.

// ---- what sends, and what is secret ----------------------------------------------------------------------------------

const SENDERS = new Set(['curl', 'wget', 'http', 'https', 'xh', 'nc', 'ncat', 'netcat', 'scp', 'sftp', 'rsync', 'ssh', 'ftp', 'telnet', 'socat', 'aria2c', 'dig', 'nslookup', 'host', 'drill'])
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh'])
const KEYWORDS = new Set(['then', 'do', 'else', 'elif', 'if', 'while', 'until', '!', '{', '}', 'time'])
const FILE_WORDS = new Set(['pem', 'key', 'env', 'json', 'txt', 'md', 'tgz', 'gz', 'zip', 'sh', 'js', 'ts', 'py', 'log', 'conf', 'cfg', 'yml', 'yaml', 'p12', 'pfx', 'pub', 'crt', 'cer', 'csv', 'xml', 'html', 'toml', 'lock', 'bak', 'rc'])
const NAMES = ['.env', '.envrc', 'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa', '.npmrc', '.netrc', '.pypirc', '.git-credentials', 'credentials', 'credentials.json', 'secrets.yml', 'secrets.json', 'server.pem', 'server.key', 'private.key']

const SECRET_FILE = new RegExp(
  '(?:(?<![\\w.-])|(?<=\\s-[A-Za-z]))(' +
    [
      '\\.env(?:rc|(?:\\.(?!example\\b|sample\\b|template\\b|dist\\b)[\\w-]+)+)?',
      'id_(?:rsa|dsa|ecdsa|ed25519)(?:_[\\w-]*)?(?:\\.(?!pub\\b)[\\w-]+)*',
      '[\\w.-]+\\.(?:pem|key|p12|pfx|keystore)',
      '\\.npmrc|\\.netrc|\\.pypirc|\\.git-credentials',
      '\\.aws\\/\\S+|\\.kube\\/config|\\.docker\\/config\\.json|gh\\/hosts\\.yml',
      '\\.ssh\\/(?!known_hosts\\b|config\\b|authorized_keys\\b)[\\w.*-]+(?<!\\.pub)',
      'application_default_credentials\\.json|service[-_]?account[\\w.-]*\\.json',
      'credentials(?:\\.json)?|secrets?\\.(?:ya?ml|json|toml)',
      '\\/proc\\/(?:self|\\d+)\\/environ',
      '\\.(?:ssh|aws|gnupg|kube)(?=\\/?(?:\\s|$|[\'"|;&)>*]))',
    ].join('|') +
    ')(?![\\w.-])',
)
const KEYS: [RegExp, string][] = [
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, 'an AWS access key'],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/, 'a GitHub token'],
  [/\bglpat-[A-Za-z0-9_-]{20,}/, 'a GitLab token'],
  [/\b[sr]k_live_[A-Za-z0-9]{16,}/, 'a Stripe key'],
  [/\bsk-(?=[A-Za-z0-9_-]*[A-Za-z0-9]{20})[A-Za-z0-9_-]{20,}/, 'an API key'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'a Google API key'],
  [/\bnpm_[A-Za-z0-9]{36}\b/, 'an npm token'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'a JWT'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/, 'a private key'],
]
const NOT_SECRET_ENDS = new Set(['HINT', 'PATH', 'FILE', 'NAME', 'ID', 'LABEL', 'DIR', 'URL'])
const secretName = (raw: string) => {
  const name = raw.toUpperCase()
  if (/^(?:DATABASE_URL|DB_URL|DSN)$/.test(name)) return true
  const segs = name.split('_')
  if (NOT_SECRET_ENDS.has(segs[segs.length - 1]!)) return false
  // a secret word as a whole segment, or at the end of the name (PGPASSWORD, MYSECRET), but not inside another word (TOKENIZER)
  return segs.some(s => /^(?:PAT|PASS|PWD|APIKEY|PRIVATE)$/.test(s)) || /(?:TOKEN|SECRET|SECRETS|PASSWORD|PASSWD|CREDENTIALS?)(?:_|$)/.test(name) || name.endsWith('_KEY') || name.startsWith('KEY_')
}

// Option values that only USE a secret (an identity, a certificate, an output file) or exclude one are not a send of it. Which
// options those are depends on the program: rsync's --include sends, ssh's -o can carry SendEnv, curl's -i is something else.
const USES: Record<string, string[]> = {
  curl: ['-E', '--cert', '--key', '--cacert', '--capath', '-o', '--output'],
  wget: ['--certificate', '--private-key', '--ca-certificate', '-O', '--output-document', '-o'],
  ssh: ['-i', '--identity'], scp: ['-i'], sftp: ['-i'],
  rsync: ['--exclude', '--exclude-from'],
}
const scrubOf = (senders: ReadonlySet<string>) => {
  const opts = [...new Set([...senders].flatMap(s => USES[s] ?? []))]
  if (!opts.length) return undefined
  const alt = opts.map(o => o.replace(/[-]/g, '\\-')).join('|')
  return new RegExp(`(?:^|\\s)(?:${alt})(?:=|\\s+)(?:"[^"]*"|'[^']*'|\\S+)`, 'g')
}
// A URL named in the command: its path is not a file of yours, but a key in it still is a key, and a substitution in it runs.
const URL_PATH = /\b([a-z][a-z0-9+.-]*:\/\/[^/\s'"?#]*)([^\s'"]*)/gi

const decode = (t: string) => {
  try {
    return decodeURIComponent(t)
  } catch {
    return t
  }
}

// What kind of secret a stretch of command line holds, named without the value. `senders` are the programs that send it.
export function secretIn(text: string, senders: ReadonlySet<string> = new Set()): string | undefined {
  const keyed = decode(text)
  for (const [re, kind] of KEYS) if (re.test(keyed)) return kind
  const scrub = scrubOf(senders)
  let files = scrub ? text.replace(scrub, ' ') : text
  files = files.replace(URL_PATH, (all, head: string, rest: string) => (/\$\(|`/.test(rest) ? all : head))
  files = files.replace(/\$(?:''|"")/g, '').replace(/['"]/g, '')
  const file = SECRET_FILE.exec(files)
  if (file) return file[1]
  for (const w of files.split(/\s+/)) {
    const g = globSecret(w)
    if (g) return g
  }
  for (const v of text.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)) if (secretName(v[1]!)) return `the variable $${v[1]}`
  for (const v of text.matchAll(/SendEnv[= ]+([A-Za-z_][A-Za-z0-9_]*)/g)) if (secretName(v[1]!)) return `the variable $${v[1]}`
  return undefined
}

// A word with a wildcard that could name a secret file: .en*, .e[n]v, id_*. It needs two literal characters, so `*` is no secret.
function globSecret(word: string): string | undefined {
  const base = word.replace(/^[^=@]*=/, '').replace(/^@/, '').split('/').pop() ?? ''
  if (!/[*?[]/.test(base) || base.replace(/[*?[\]]/g, '').length < 2) return undefined
  let re: RegExp
  try {
    re = new RegExp('^' + base.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  } catch {
    return undefined
  }
  return NAMES.find(n => re.test(n))
}

// ---- hosts -----------------------------------------------------------------------------------------------------------

// A trusted-host entry as it is meant: no scheme, path, port or leading wildcard or dot.
export const clean = (entry: string) =>
  entry
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\*?\./, '')

export const trusted = (host: string, list: readonly string[]) => {
  const h = host.toLowerCase().replace(/\.$/, '')
  const local = h === '::1' || /^127(?:\.\d+){0,3}$/.test(h)
  return list.some(t => {
    const x = t.toLowerCase()
    return h === x || h.endsWith('.' + x) || (local && (x === 'localhost' || x === '127.0.0.1'))
  })
}

const BARE = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+|localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#].*)?$/i
const SCP_STYLE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+:[^\s]*$/i

// The hosts named in a sender's words: a URL, user@host[:path], host:path, or a bare host with an optional port or path. Userinfo is
// dropped (the host is what follows the last @ before the first /). A host with an expansion in it comes back as '$'.
export function hostsOf(words: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of words) {
    const w = raw.trim()
    if (!w || w.startsWith('-') || w.startsWith('@') || w.startsWith('.') || /^[\w.-]+=/.test(w)) continue
    let rest = w
    const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(w)
    if (scheme) rest = w.slice(scheme[0].length)
    else if (w.startsWith('//')) rest = w.slice(2)
    else if (!/^[^/\s@]+@[^/\s]+(?::.*)?$/.test(w) && !BARE.test(w) && !SCP_STYLE.test(w)) continue
    let auth = rest.split(/[/?#]/)[0]!
    auth = auth.slice(auth.lastIndexOf('@') + 1)
    const v6 = /^\[([^\]]+)\]/.exec(auth)
    auth = v6 ? v6[1]! : auth.replace(/:.*$/, '')
    auth = auth.replace(/\.$/, '')
    if (/[$`]/.test(auth)) out.push('$')
    else if (auth) {
      const last = auth.slice(auth.lastIndexOf('.') + 1).toLowerCase()
      if (scheme || w.startsWith('//') || v6 || !FILE_WORDS.has(last)) out.push(auth.toLowerCase())
    }
  }
  return out
}

// Options that send the traffic somewhere other than the address on the line.
const REDIRECTS = /^(?:-x|--proxy|--socks[45](?:[ah]|-hostname)?|--preproxy|--connect-to|--resolve|-J|--proxy-header|--url)$/
function redirectHosts(words: readonly string[]): string[] {
  const out: string[] = []
  const pieces = (v: string) => [...hostsOf([v]), ...hostsOf(v.split(/[\s:=,]+/))]
  words.forEach((w, i) => {
    const eq = /^(--[a-z0-9-]+)=(.*)$/.exec(w)
    if (eq && REDIRECTS.test(eq[1]!)) out.push(...pieces(eq[2]!))
    else if (REDIRECTS.test(w) && words[i + 1]) out.push(...pieces(words[i + 1]!))
    else if (/^-x.+/.test(w)) out.push(...pieces(w.slice(2)))
    else if ((w === '-o' || w === '-O') && /^(?:Proxy|HostName)/i.test(words[i + 1] ?? '')) out.push(...pieces(words[i + 1]!))
    const host = /^host:\s*(\S+)/i.exec(w)
    if (host) out.push(...hostsOf([host[1]!]))
    const px = /^(?:[a-z]+_)?proxy=(.*)$/i.exec(w)
    if (px) out.push(...pieces(px[1]!))
  })
  return out
}

// ---- reading the line ------------------------------------------------------------------------------------------------

// Splits at the characters in `at`, outside quotes, outside ( ) and { } groups and outside $( ) and backticks (unless
// `flat`, which looks inside the groups too). An & next to a > or < belongs to a redirect (2>&1, &>file, >&2).
function split(text: string, at: string, flat = false): string[] {
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
    else if (c === '(') depth++
    else if (c === ')' && depth) depth--
    else if (c === '{' && (i === 0 || /[\s;|&)]/.test(text[i - 1]!)) && /\s/.test(text[i + 1] ?? '')) depth++
    else if (c === '}' && depth && (i === 0 || /[\s;]/.test(text[i - 1]!)) && (i + 1 === text.length || /[\s;|&)]/.test(text[i + 1]!))) depth--
    else if (c === '&' && (text[i - 1] === '>' || text[i - 1] === '<' || text[i + 1] === '>')) {
      cur += c
      continue
    } else if ((flat || !depth) && at.includes(c)) {
      parts.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  parts.push(cur)
  return parts.map(p => p.trim()).filter(Boolean)
}

// Parts of a line that belong together because a loop, a conditional or a case is still open.
function compounds(parts: string[]): string[] {
  const out: string[] = []
  let open = 0
  let cur = ''
  for (const p of parts) {
    cur = cur ? cur + '; ' + p : p
    open += (p.match(/(?:^|\|)\s*(?:for|while|until|if|case|select)\b/g) ?? []).length
    open -= (p.match(/(?:^|\|)\s*(?:done|fi|esac)\b/g) ?? []).length
    if (open <= 0) {
      out.push(cur)
      cur = ''
      open = 0
    }
  }
  if (cur) out.push(cur)
  return out
}

// The bodies of ( ), $( ), >( ), <( ) and backticks in a text, nested ones too, each as its own text.
function bodies(text: string): string[] {
  const out: string[] = []
  const stack: number[] = []
  let quote = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '\\') i++
    else if (quote === "'") quote = c === "'" ? '' : quote
    else if (c === '`') {
      const end = text.indexOf('`', i + 1)
      if (end > i) {
        out.push(text.slice(i + 1, end), ...bodies(text.slice(i + 1, end)))
        i = end
      }
    } else if (c === "'") quote = "'"
    else if (c === '(') stack.push(i + 1)
    else if (c === ')' && stack.length) out.push(text.slice(stack.pop()!, i))
  }
  return out
}

// The heredoc operators on a line that the shell would really read: not inside a quote, not in a comment, not <<<.
function markers(l: string): { id: string; dash: boolean }[] {
  const out: { id: string; dash: boolean }[] = []
  let quote = ''
  for (let i = 0; i < l.length; i++) {
    const c = l[i]!
    if (c === '\\') i++
    else if (quote) {
      if (c === quote) quote = ''
    } else if (c === "'" || c === '"') quote = c
    else if (c === '#' && (i === 0 || /\s/.test(l[i - 1]!))) break
    else if (c === '<' && l[i + 1] === '<' && l[i + 2] !== '<' && l[i - 1] !== '<') {
      const m = /^(-?)\s*(['"]?)([A-Za-z_]\w*)\2/.exec(l.slice(i + 2))
      if (m) out.push({ id: m[3]!, dash: m[1] === '-' })
      i += 1
    }
  }
  return out
}

// A heredoc body is part of the command that reads it: it comes back on that command's line, as one quoted word.
function inline(line: string): string {
  const lines = line.replace(/\\\r?\n/g, '').split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]!
    for (const w of markers(l)) {
      const body: string[] = []
      while (i + 1 < lines.length) {
        const b = lines[++i]!
        if ((w.dash ? b.trim() : b) === w.id) break
        body.push(b)
      }
      l += " '" + body.join(' ').replace(/'/g, "'\\''") + "'"
    }
    out.push(l)
  }
  return out.join('\n')
}

// Comments (a # at the start of a word, outside quotes) and empty quotes and backslashes taken out.
function tidy(t: string): string {
  let out = ''
  let quote = ''
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!
    if (c === '\\' && quote !== "'") {
      out += c + (t[++i] ?? '')
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
    } else if (c === "'" || c === '"') quote = c
    else if (c === '#' && (i === 0 || /\s/.test(t[i - 1]!))) {
      while (i < t.length && t[i] !== '\n') i++
      i--
      continue
    }
    out += c
  }
  out = out.replace(/\$(?:''|"")/g, '')
  for (let n = 0; n < 5 && /""|''/.test(out); n++) out = out.replace(/""|''/g, '')
  return out.replace(/\\([^\n])/g, '$1')
}

function words(part: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote = ''
  for (const c of part) {
    if (quote) {
      if (c === quote) quote = ''
      else cur += c
    } else if (c === '"' || c === "'") quote = c
    else if (/\s/.test(c)) {
      if (cur) out.push(cur)
      cur = ''
    } else if (c !== '(' && c !== ')') cur += c
  }
  if (cur) out.push(cur)
  return out
}

// A redirect among the words is no argument: `> /dev/null`, `2>&1`, `<file`, `&>out`.
function noRedirects(ws: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < ws.length; i++) {
    const m = /^\d*(?:>>?\|?|<<?<?|&>>?|>&)(.*)$/.exec(ws[i]!)
    if (!m) out.push(ws[i]!)
    else if (m[1] === '') i++
  }
  return out
}

const nameOf = (w: string) => w.slice(w.lastIndexOf('/') + 1).replace(/\.(?:exe|traditional|openbsd)$/, '')
const isAssign = (w: string) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w)
const WRAP_VALUES: Record<string, RegExp> = {
  sudo: /^-[ughpCDRTU]$/, doas: /^-[uC]$/, env: /^-[uC]$/, timeout: /^-[sk]$/, nice: /^-n$/, ionice: /^-[cnp]$/, watch: /^-[ndw]$/,
  xargs: /^-[IPnLdEsaiJS]$/, command: /^$/, builtin: /^$/, exec: /^-a$/, nohup: /^$/, time: /^$/, stdbuf: /^$/, setsid: /^$/, caffeinate: /^-[tuw]$/,
  parallel: /^-[jNnaS]$/, proxychains: /^-[fq]$/, proxychains4: /^-[fq]$/, torsocks: /^-[aipP]$/, unbuffer: /^$/, strace: /^-[eoPsEp]$/, ltrace: /^-[eoPsp]$/,
  npx: /^$/, busybox: /^$/, flock: /^-[wE]$/,
}
const POSITIONAL: Record<string, number> = { timeout: 1, flock: 1 }

type Command = { name: string; args: string[]; assigns: string[]; scripts: string[]; dumps: boolean }

// Where a command really starts: past assignments, keywords and wrappers (sudo, env, timeout, xargs, find -exec ...).
// Scripts it is handed (eval, bash -c, env -S) come back to be read as lines themselves.
function command(ws0: string[]): Command {
  let w = noRedirects(ws0)
  const assigns: string[] = []
  const scripts: string[] = []
  for (let guard = 0; guard < 16 && w.length; guard++) {
    const head = nameOf(w[0]!)
    if (isAssign(w[0]!)) assigns.push(w.shift()!)
    else if (KEYWORDS.has(head) || head === '&') w = w.slice(1)
    else if (head === 'eval') {
      scripts.push(w.slice(1).join(' '))
      return { name: 'eval', args: [], assigns, scripts, dumps: false }
    } else if (head === 'find') {
      const i = w.findIndex(a => /^-(?:exec|execdir|ok|okdir)$/.test(a))
      if (i < 0) break
      w = w.slice(i + 1)
    } else if (head in WRAP_VALUES) {
      const takes = WRAP_VALUES[head]!
      let k = 1
      while (k < w.length) {
        const a = w[k]!
        if (head === 'env' && a === '-S') {
          scripts.push(w[k + 1] ?? '')
          return { name: 'env', args: [], assigns, scripts, dumps: false }
        }
        if (a.startsWith('-') || isAssign(a)) k += takes.test(a) ? 2 : 1
        else break
      }
      k += POSITIONAL[head] ?? 0
      if (head === 'parallel') {
        const i = w.findIndex(a => a === ':::' || a === '::::')
        w = w.slice(k, i < 0 ? undefined : i)
      } else w = w.slice(k)
      if (head === 'env' && !w.length) return { name: 'env', args: [], assigns, scripts, dumps: true }
    } else break
  }
  if (!w.length) return { name: '', args: [], assigns, scripts, dumps: false }
  const name = nameOf(w[0]!)
  const args = w.slice(1)
  if (SHELLS.has(name)) {
    const c = args.findIndex(a => /^-[A-Za-z]*c[A-Za-z]*$/.test(a))
    const script = c >= 0 ? args.slice(c + 1).find(a => !a.startsWith('-')) : undefined
    if (script) scripts.push(script)
  }
  const dumps = name === 'printenv' || (name === 'set' && !args.length) || (name === 'export' && !args.length) || (/^(?:export|declare|typeset)$/.test(name) && args.some(a => /^-[a-z]*[px][a-z]*$/.test(a)) && !args.some(a => a.includes('=')))
  return { name, args, assigns, scripts, dumps }
}

const shown = (host: string) => (/[a-z0-9]{16,}/.test(host) ? 'a host with a long token in its name' : host)
const SAY = (what: string, to: string) => `this sends ${what} to ${to}`

export function judge(line: string, list: readonly string[], depth = 0): string | undefined {
  if (depth > 4) return 'the line nests shells too deep for the guard to read'
  const vars = new Set<string>()
  const files = new Set<string>()
  let loaded = false // a secret file was sourced or exported earlier on the line, so any variable may hold a secret
  const tainted = (text: string): string | undefined => {
    for (const v of vars) if (new RegExp('\\$\\{?' + v + '(?![A-Za-z0-9_])').test(text)) return `the variable $${v}`
    const tokens = new Set(text.split(/[\s"'=@;|&()<>:]+/))
    for (const f of files) if (tokens.has(f)) return `a copy of a secret (${f})`
    return undefined
  }

  for (const raw of compounds(split(inline(line).replace(/\|&/g, '|'), ';&\n'))) {
    const text = tidy(raw)
    // Every command in the chunk: its pipe parts, what sits in ( ) and backticks, and what a wrapper hands to a shell.
    const queue: string[] = []
    for (const p of split(text, '|', true)) queue.push(...split(p, ';&\n', true))
    queue.push(...bodies(text).flatMap(b => split(b, ';&\n|', true)))
    let hosts: string[] = []
    const senders = new Set<string>()
    let opaque = false
    let dumps = false
    let gist = false
    let lastEcho: string | undefined
    for (let n = 0; n < queue.length && n < 200; n++) {
      const ws = words(queue[n]!.replace(/^\s*(?:function\s+)?[\w-]+\s*\(\)\s*\{?\s*/, '')) // a function header is no command
      if (!ws.length) continue
      const c = command(ws)
      for (const s of c.scripts) queue.push(...split(s, ';&\n|', true), ...bodies(s))
      if (c.dumps) dumps = true
      if (!c.name) continue
      const all = [...c.args, ...c.assigns]
      if (SHELLS.has(c.name) && !c.scripts.length && lastEcho) queue.push(...split(lastEcho, ';&\n|', true))
      lastEcho = /^(?:echo|printf)$/.test(c.name) ? (c.name === 'printf' && c.args[0]?.includes('%') ? c.args.slice(1) : c.args).join(' ') : undefined
      if (/^[$`]/.test(c.name) || /\$/.test(c.name)) {
        opaque = true
        hosts.push(...hostsOf(c.args))
      } else if (SENDERS.has(c.name) || (c.name === 'openssl' && c.args.includes('s_client'))) {
        senders.add(c.name)
        hosts.push(...hostsOf(c.args), ...redirectHosts(all), ...c.args.flatMap(a => (/^[A-Za-z]+:[^:\s]+:\d+$/.test(a) ? hostsOf([a.split(':')[1]!]) : [])))
        const o = c.args.findIndex(a => a === '-connect')
        if (o >= 0) hosts.push(...hostsOf([c.args[o + 1] ?? '']))
      } else if (c.name === 'gh' && c.args[0] === 'gist') gist = true
    }
    for (const m of text.matchAll(/\/dev\/(?:tcp|udp)\/([^/\s]+)/g)) {
      senders.add('dev-tcp')
      hosts.push(...hostsOf([m[1]!]))
    }
    const sender = senders.size > 0
    let what = (dumps ? 'the environment' : undefined) ?? secretIn(text, senders) ?? tainted(text)
    if (!what && loaded && /\$\{?[A-Za-z_]/.test(text)) what = 'variables loaded from a secret file'
    if (what && (sender || opaque || gist)) {
      if (gist) return SAY(what, 'a GitHub gist')
      hosts = [...new Set(hosts)]
      if (opaque && !sender && !hosts.length) {
        // A command named by a variable and no address on the line: nothing to hold it on.
      } else if (!hosts.length || hosts.includes('$')) return SAY(what, 'a host the guard cannot read')
      else {
        const bad = hosts.find(h => !trusted(h, list))
        if (bad) return `${SAY(what, shown(bad))}, which is not on your list`
      }
    }
    // What this chunk leaves behind for a later one: a variable that holds a secret, a file that has a copy of one.
    const secretish = (v: string) => secretIn(v) || tainted(v) || /\$\(\s*(?:env|printenv|set)\b/.test(v)
    for (const m of raw.matchAll(/(?:^|[\s;])(?:export\s+|declare\s+(?:-\w+\s+)?|local\s+)?([A-Za-z_]\w*)=/g)) {
      if (secretish(raw.slice(m.index! + m[0].length))) vars.add(m[1]!)
    }
    const read = /(?:^|[\s;|&(])read\s+(?:-\w+\s+)*([A-Za-z_]\w*)/.exec(raw)
    if (read && secretIn(raw)) vars.add(read[1]!)
    if ((/(?:^|[\s;|&(])(?:source|\.)\s+\S/.test(raw) || /\bexport\s+\$\(/.test(raw)) && secretIn(raw)) loaded = true
    if (what || dumps) {
      for (const m of raw.matchAll(/(?:>>?|\btee\s+(?:-a\s+)?)\s*("[^"]+"|'[^']+'|[^\s;|&<>()]+)/g)) {
        const f = m[1]!.replace(/^["']|["']$/g, '')
        if (!f.startsWith('/dev/') && !f.startsWith('&')) files.add(f)
      }
      const cp = /\b(?:cp|mv)\s+(?:-\S+\s+)*(?:\S+\s+)+?("[^"]+"|'[^']+'|[^\s;|&<>()]+)\s*(?:$|[;&|])/.exec(raw)
      if (cp) files.add(cp[1]!.replace(/^["']|["']$/g, ''))
      if (/\b(?:tar|zip|7z|gzip|bzip2|xz)\b/.test(raw)) for (const w of raw.split(/\s+/)) if (/\.(?:tgz|tar|zip|gz|7z|bz2|xz)$/.test(w)) files.add(w)
    }
  }
  return undefined
}

// A page fetch that carries a key in its address.
export function judgeUrl(url: string, list: readonly string[]): string | undefined {
  const u = url.trim()
  const what = KEYS.map(([re, kind]) => (re.test(decode(u)) ? kind : undefined)).find(Boolean)
  if (!what) return undefined
  const bad = hostsOf([u]).find(h => !trusted(h, list))
  return bad ? `${SAY(what, shown(bad))}, which is not on your list` : undefined
}

const TAIL = `Add it under "Hosts you trust" in this mod's settings, or ask the person to run it themselves.`
const hostList = (options: { trustedHosts?: unknown } | undefined) =>
  String(options?.trustedHosts ?? 'github.com, npmjs.org, pypi.org, pythonhosted.org, localhost, 127.0.0.1')
    .split(',')
    .map(clean)
    .filter(Boolean)

export const register: Register = (on, options) => {
  const hosts = hostList(options)

  on('tool.call', { tool: 'Bash' }, (_$, e, next) => {
    const why = typeof e.command === 'string' ? judge(e.command, hosts) : undefined
    return why ? { deny: `seal: ${why}. ${TAIL}` } : next(e)
  })
    // Fails closed, but only for a line that names something that sends: any other command goes on as if the mod were not here.
    .catch(($, e, next) =>
      !next.called && /\b(curl|wget|nc|ncat|netcat|scp|sftp|rsync|ssh|ftp|telnet|socat|openssl|http|https|xh|dig)\b/.test(String((e as { command?: unknown }).command ?? ''))
        ? { deny: `seal: could not read this line, so it waits. ${TAIL}` }
        : next(e),
    )

  on('tool.call', { tool: 'WebFetch' }, (_$, e, next) => {
    const why = typeof e.url === 'string' ? judgeUrl(e.url, hosts) : undefined
    return why ? { deny: `seal: ${why}. ${TAIL}` } : next(e)
  }).catch(($, e, next) => next(e))
}
