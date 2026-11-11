import type { Register } from 'claude-code'

// critter-latch stops a few deletes that cannot be taken back, before the Bash tool runs them: a recursive rm that reaches
// outside the folder the session was opened in, git reset --hard, git clean -f, and git checkout/restore over the whole tree.
//
// It reads how a command is SPELLED. It cannot see what a script, a Makefile, an alias or `find -delete` will do, and it
// does not read file contents. It is best effort and no substitute for a backup or for version control.
// It looks only at the command line and the name of the folder; it keeps nothing and sends nothing.

type Word = { text: string; unread: boolean }
type Segment = { words: Word[]; sep: string } // sep: the separator characters just before it (&&, ;, |, ( ...)
type Parsed = { segments: Segment[]; inner: string[] }
type Doc = { body: string; quoted: boolean; owner: string } // a heredoc: its text, whether its delimiter was quoted, the line that opened it

const SPLIT = new Set([';', '&', '|', '\n', '(', ')'])

// The heredoc operators on a line that the shell would really read: not inside a quote, not in a comment, not <<<.
function markers(l: string): { id: string; dash: boolean; quoted: boolean }[] {
  const out: { id: string; dash: boolean; quoted: boolean }[] = []
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
      if (m) out.push({ id: m[3]!, dash: m[1] === '-', quoted: m[2] !== '' || /^-?\s*\\/.test(l.slice(i + 2)) })
      i += 1
    }
  }
  return out
}

// A line without its line continuations, and without the bodies of its heredocs, which come back apart: they are text,
// unless a shell reads them as a script or the delimiter is unquoted, which lets $( ) and backticks in them run.
export function prepare(line: string): { text: string; docs: Doc[] } {
  const lines = line.replace(/\\\r?\n/g, '').split('\n')
  const out: string[] = []
  const docs: Doc[] = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!
    out.push(l)
    for (const w of markers(l)) {
      const body: string[] = []
      while (i + 1 < lines.length) {
        const b = lines[++i]!
        if ((w.dash ? b.trim() : b) === w.id) break
        body.push(b)
      }
      docs.push({ body: body.join('\n'), quoted: w.quoted, owner: l })
    }
  }
  return { text: out.join('\n'), docs }
}

// The $( ) and backtick spans in a text, whatever the quotes around them.
function substitutions(text: string): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      out.push(text.slice(i + 1, end < 0 ? text.length : end))
      if (end < 0) break
      i = end
    } else if (text[i] === '$' && text[i + 1] === '(') {
      let depth = 0
      let j = i + 1
      for (; j < text.length; j++) {
        if (text[j] === '(') depth++
        else if (text[j] === ')' && --depth === 0) break
      }
      out.push(text.slice(i + 2, j))
      i = j
    }
  }
  return out
}

// Splits a line into commands and their words. A word is unread when it holds an expansion the shell will resolve
// later ($VAR, `...`, $(...), {a,b}); the bodies of $(...) and `...` come back in `inner`, to be judged as lines themselves.
export function parse(line: string): Parsed {
  const segments: Segment[] = []
  const inner: string[] = []
  let words: Word[] = []
  let text = ''
  let unread = false
  let has = false
  let seps = ''
  const endWord = () => {
    if (has) words.push({ text, unread })
    text = ''
    unread = false
    has = false
  }
  const endSegment = () => {
    endWord()
    if (words.length) {
      segments.push({ words, sep: seps })
      seps = ''
    }
    words = []
  }
  // From the opener at i, the index just past its closer, with the body between them. Quotes inside are skipped.
  const balanced = (i: number, open: string, close: string): [number, string] => {
    let depth = 0
    let q = ''
    for (let j = i; j < line.length; j++) {
      const ch = line[j]!
      if (ch === '\\') j++
      else if (q) {
        if (ch === q) q = ''
      } else if (ch === "'" || ch === '"') q = ch
      else if (ch === open) depth++
      else if (ch === close && --depth === 0) return [j + 1, line.slice(i + 1, j)]
    }
    return [line.length, line.slice(i + 1)]
  }
  let quote: '' | "'" | '"' = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (quote === "'") {
      if (c === "'") quote = ''
      else text += c
      continue
    }
    if (c === '\\' && i + 1 < line.length) {
      text += line[++i]!
      has = true
      continue
    }
    if (c === '$' && line[i + 1] === "'" && quote === '') {
      // $'...': escapes inside, and \' does not end it
      i += 2
      for (; i < line.length && line[i] !== "'"; i++) text += line[i] === '\\' ? (line[++i] ?? '') : line[i]!
      has = true
      continue
    }
    if (c === '$' && line[i + 1] === '(') {
      const [end, body] = balanced(i + 1, '(', ')')
      inner.push(body)
      unread = has = true
      i = end - 1
      continue
    }
    if (c === '`') {
      const end = line.indexOf('`', i + 1)
      inner.push(line.slice(i + 1, end < 0 ? line.length : end))
      unread = has = true
      i = end < 0 ? line.length : end
      continue
    }
    if (c === '$') {
      unread = has = true
      text += c
      continue
    }
    if (quote === '"') {
      if (c === '"') quote = ''
      else text += c
      continue
    }
    if (c === "'" || c === '"') {
      quote = c
      has = true
      continue
    }
    if (c === '#' && !has) {
      while (i < line.length && line[i] !== '\n') i++
      i--
      continue
    }
    if (SPLIT.has(c)) {
      endSegment()
      seps += c
      continue
    }
    if (c === ' ' || c === '\t') {
      endWord()
      continue
    }
    if (c === '{' || c === '}') {
      // A lone brace is a group; one inside a word is a brace expansion, which the shell resolves later.
      if (!has && (line[i + 1] === ' ' || line[i + 1] === undefined || c === '}')) continue
      unread = true
    }
    text += c
    has = true
  }
  endSegment()
  return { segments, inner }
}

const base = (w: string) => w.slice(w.lastIndexOf('/') + 1)
const isAssign = (w: string) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w)
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'su'])
const SUDO_VALUE = new Set(['-u', '-g', '-h', '-p', '-C', '-D', '-R', '-T', '-U'])
const XARGS_VALUE = new Set(['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a', '-i', '-l', '-J', '-S'])
const XARGS_LONG = new Set(['--max-args', '--max-procs', '--max-lines', '--max-chars', '--delimiter', '--arg-file', '--eof', '--process-slot-var'])
// Wrappers that run what follows their own options: the option letters that take a value, and how many positional words come first.
const WRAP: Record<string, { value: RegExp; skip: number }> = {
  command: { value: /^$/, skip: 0 }, builtin: { value: /^$/, skip: 0 }, exec: { value: /^-a$/, skip: 0 }, nohup: { value: /^$/, skip: 0 },
  time: { value: /^$/, skip: 0 }, nice: { value: /^-n$/, skip: 0 }, ionice: { value: /^-[cnp]$/, skip: 0 }, stdbuf: { value: /^$/, skip: 0 },
  setsid: { value: /^$/, skip: 0 }, caffeinate: { value: /^-[tuw]$/, skip: 0 }, busybox: { value: /^$/, skip: 0 }, arch: { value: /^$/, skip: 0 },
  noglob: { value: /^$/, skip: 0 }, nocorrect: { value: /^$/, skip: 0 }, coproc: { value: /^$/, skip: 0 },
  repeat: { value: /^$/, skip: 1 }, flock: { value: /^-[wE]$/, skip: 1 }, timeout: { value: /^-[sk]$/, skip: 1 },
}

// A redirect among the words is no argument: `> /dev/null`, `2>&1`, `>>log`, `<file`, `&>out`.
function noRedirects(words: Word[]): Word[] {
  const out: Word[] = []
  for (let i = 0; i < words.length; i++) {
    const m = /^\d*(?:>>?\|?|<<?<?|&>>?|>&)(.*)$/.exec(words[i]!.text)
    if (!m) out.push(words[i]!)
    else if (m[1] === '') i++ // the operator stands alone: its target is the next word
  }
  return out
}

type Unwrapped = {
  cmd: Word[] // the command itself
  fed: boolean // its arguments also come from another command (xargs, find -exec, parallel), which the guard cannot read
  extra: Word[][] // more commands it runs (every -exec of a find)
  scripts: string[] // scripts it is handed (env -S)
}

// Where a command really starts: past assignments, keywords, sudo, env, command, time, nice, busybox and the like.
function unwrap(words: Word[]): Unwrapped {
  let w = words
  let fed = false
  const extra: Word[][] = []
  const scripts: string[] = []
  for (let guard = 0; guard < 12 && w.length; guard++) {
    const head = base(w[0]!.text)
    if (isAssign(w[0]!.text) || /^(!|then|do|else|elif|if|while|until)$/.test(w[0]!.text)) {
      w = w.slice(1)
      continue
    }
    if (w[0]!.unread) break
    if (head === 'sudo' || head === 'doas') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-') && w[k]!.text !== '--') k += SUDO_VALUE.has(w[k]!.text) ? 2 : 1
      w = w.slice(k + (w[k]?.text === '--' ? 1 : 0))
    } else if (head === 'env') {
      let k = 1
      while (k < w.length && (w[k]!.text.startsWith('-') || isAssign(w[k]!.text))) {
        if (w[k]!.text === '-S') {
          scripts.push(w[k + 1]?.text ?? '')
          return { cmd: [], fed, extra, scripts }
        }
        k += /^-[uC]$/.test(w[k]!.text) ? 2 : 1
      }
      w = w.slice(k)
    } else if (head in WRAP) {
      const { value, skip } = WRAP[head]!
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += value.test(w[k]!.text) && head !== 'time' ? 2 : 1
      w = w.slice(k + skip)
    } else if (head === 'xargs') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += XARGS_VALUE.has(w[k]!.text) || XARGS_LONG.has(w[k]!.text) ? 2 : 1
      fed = true
      w = w.slice(k)
    } else if (head === 'parallel') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += /^-[jNnaS]$/.test(w[k]!.text) ? 2 : 1
      const end = w.findIndex(a => a.text === ':::' || a.text === '::::')
      fed = true
      w = w.slice(k, end < 0 ? undefined : end)
    } else if (head === 'find') {
      // every -exec, -execdir and -ok runs a command on files the guard cannot name
      for (let i = 0; i < w.length; i++) {
        if (!/^-(?:exec|execdir|ok|okdir)$/.test(w[i]!.text)) continue
        const rest = w.slice(i + 1)
        const end = rest.findIndex(a => a.text === ';' || a.text === '+')
        extra.push(end < 0 ? rest : rest.slice(0, end))
      }
      return { cmd: [], fed, extra, scripts }
    } else break
  }
  return { cmd: w, fed, extra, scripts }
}

// ---- paths ------------------------------------------------------------------------------------------------------

function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return '/' + out.join('/')
}

const inside = (root: string, p: string) => p.startsWith(root === '/' ? '/' : root + '/') && p !== root
const within = (root: string, p: string) => p === root || inside(root, p)

// ---- the rules --------------------------------------------------------------------------------------------------

// The folders a command may be running in: `dirs` for the chain it is in, `all` for any way the line could have gone.
// undefined stands for a folder the guard cannot follow. `requireForce` is git's clean.requireForce as the line has set it.
type Where = {
  root: string | undefined
  home: string | undefined
  dirs: Set<string | undefined>
  all: Set<string | undefined>
  pending?: Set<string | undefined>
  requireForce: boolean
}

const spells = (arg: string, long: string, min = 3) => arg.startsWith('--') && arg.length >= min && long.startsWith(arg)
const EMPTIES = new Set(['*', '**', '.*'])

function rm(args: Word[], where: Where, fed: boolean): string | undefined {
  let recursive = false
  const targets: Word[] = []
  let ended = false
  for (const a of args) {
    if (!ended && a.text === '--') ended = true
    else if (!ended && a.unread && a.text.startsWith('-')) recursive = true // an option made of an expansion could be -r
    else if (!ended && a.text.startsWith('--')) {
      if (spells(a.text, '--recursive', 3)) recursive = true
      if (a.text === '--no-preserve-root') return 'rm --no-preserve-root removes the root of the disk'
    } else if (!ended && /^-[A-Za-z]+$/.test(a.text)) {
      if (/[rR]/.test(a.text)) recursive = true
    } else targets.push(a)
  }
  if (!recursive) return undefined
  if (fed) return 'rm -r has a target the guard cannot read: it comes from another command'
  if (where.root === undefined) return 'could not tell which folder this is, so the delete waits'
  const { root, home } = where
  for (const t of targets) {
    if (t.unread) return 'rm -r has a target the guard cannot read ($, a backtick or a brace in it), so it waits'
    let path = t.text
    if (path === '~' || path.startsWith('~/')) {
      if (!home) return 'rm -r has a target the guard cannot read (~ with no home folder known), so it waits'
      path = home + path.slice(1)
    } else if (path.startsWith('~')) return "rm -r has a target the guard cannot read (another user's home), so it waits"
    for (const dir of path.startsWith('/') ? [root] : where.dirs) {
      if (dir === undefined) return 'rm -r has a target the guard cannot read: a cd, popd, eval or source earlier on the line moved it somewhere the guard cannot follow'
      const full = (path.startsWith('/') ? path : dir + '/' + path).replace(/\/+$/, '') || '/'
      const p = normalize(full)
      const last = full.slice(full.lastIndexOf('/') + 1)
      const parent = normalize(full.slice(0, full.lastIndexOf('/') + 1) || '/')
      // `rm -rf *` empties the folder just as `rm -rf .` removes it.
      if (EMPTIES.has(last) && (parent === root || root.startsWith(parent === '/' ? '/' : parent + '/'))) return `rm -r would delete the folder you opened (${root}) and everything in it`
      if (p === root || root.startsWith(p === '/' ? '/' : p + '/')) return `rm -r would delete the folder you opened (${root}) or one above it`
      if (!inside(root, p)) return `rm -r reaches outside the folder you opened (${root})`
    }
  }
  return undefined
}

const GIT_VALUE = /^(-C|-c|--git-dir|--work-tree|--namespace|--exec-path|--super-prefix|--config-env|--attr-source)$/

// The single-letter flags of a git command, as git reads them: a bundle ends at `e`, which takes the rest as its value.
function letters(flags: string[]): Set<string> {
  const out = new Set<string>()
  for (const a of flags) {
    if (!/^-[A-Za-z]/.test(a)) continue
    for (const ch of a.slice(1)) {
      out.add(ch)
      if (ch === 'e') break
    }
  }
  return out
}

// A path that names the whole tree: ., ./, ./., .//, ./*, *, **, .., sub/.., :/, :(top), $PWD.
function wholeTree(p: string): boolean {
  if (p === ':/' || p === '$PWD' || p === '${PWD}') return true
  if (/^:\((?:top|glob|literal|icase)(?:,[a-z]+)*\)$/.test(p)) return true
  const stack: string[] = []
  for (const s of p.split('/')) {
    if (s === '' || s === '.') continue
    if (s === '..' && stack.length && stack[stack.length - 1] !== '..') stack.pop()
    else stack.push(s)
  }
  return stack.length === 0 || stack.every(s => s === '..') || (stack.length === 1 && (stack[0] === '*' || stack[0] === '**'))
}

// `again` judges a command string that git runs (submodule foreach, rebase -x, bisect run).
function git(args: Word[], where: Where, again: (script: string) => string | undefined): string | undefined {
  let k = 0
  while (k < args.length && args[k]!.text.startsWith('-')) {
    const a = args[k]!.text
    const v = args[k + 1]?.text ?? ''
    if (a === '-c' && /^clean\.requireforce=(?:false|no|off|0)$/i.test(v)) where.requireForce = false
    if (a === '-c' && /^alias\.[^=]+=!/i.test(v)) return 'git is given an alias that runs a shell command, so it waits'
    k += GIT_VALUE.test(a) ? 2 : 1
  }
  const sub = args[k]?.text
  const rest = args.slice(k + 1).map(w => w.text)
  const dd = rest.indexOf('--')
  const beforeDashes = dd < 0 ? rest : rest.slice(0, dd) // after -- nothing is a flag
  const flags = beforeDashes.filter(a => a.startsWith('-'))
  const bundle = letters(flags)
  const pathspecs = [...beforeDashes.filter(a => !a.startsWith('-')), ...(dd < 0 ? [] : rest.slice(dd + 1))]
  const patch = bundle.has('p') || flags.some(a => spells(a, '--patch', 3))
  if (sub === 'reset' && flags.some(a => spells(a, '--hard'))) return 'git reset --hard drops changes you have not committed'
  if (sub === 'clean') {
    const force = bundle.has('f') || flags.some(a => spells(a, '--force', 3)) || !where.requireForce
    const dry = bundle.has('n') || flags.some(a => spells(a, '--dry-run', 3))
    const asks = bundle.has('i') || flags.some(a => spells(a, '--interactive', 3))
    if (force && !dry && !asks) return 'git clean -f removes files git does not track, for good'
  }
  if (sub === 'checkout' && !patch) {
    if (bundle.has('f') || flags.some(a => spells(a, '--force', 3)) || pathspecs.some(wholeTree)) return 'git checkout throws away every uncommitted change in the tree'
  }
  if (sub === 'switch' && (bundle.has('f') || flags.some(x => spells(x, '--force', 3) || spells(x, '--discard-changes', 3)))) return 'git switch throws away every uncommitted change in the tree'
  const fromFile = flags.some(x => x.startsWith('--pathspec-from-file'))
  if ((sub === 'checkout' || sub === 'restore') && !patch && fromFile && !(sub === 'restore' && (bundle.has('S') || flags.some(x => spells(x, '--staged', 3))) && !bundle.has('W') && !flags.some(x => spells(x, '--worktree', 3)))) {
    return `git ${sub} --pathspec-from-file reads its paths from a file the guard cannot read, so it waits`
  }
  if (sub === 'restore' && !patch) {
    const staged = flags.some(a => spells(a, '--staged', 3)) || bundle.has('S')
    const worktree = flags.some(a => spells(a, '--worktree', 3)) || bundle.has('W')
    if (pathspecs.some(wholeTree) && (!staged || worktree)) return 'git restore throws away every uncommitted change in the tree'
  }
  if (sub === 'config') {
    const i = rest.findIndex(a => /^alias\./i.test(a))
    if (i >= 0 && (rest[i + 1] ?? '').startsWith('!')) return 'git config here defines an alias that runs a shell command, so it waits'
    const j = rest.findIndex(a => /^clean\.requireforce$/i.test(a))
    if (j >= 0 && /^(?:false|no|off|0)$/i.test(rest[j + 1] ?? '')) where.requireForce = false
  }
  // Commands git runs for you.
  if (sub === 'submodule') {
    const f = rest.indexOf('foreach')
    if (f >= 0) return again(rest.slice(f + 1).filter(a => a !== '--recursive').join(' '))
  }
  if (sub === 'rebase') {
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '-x' || rest[i] === '--exec') return again(rest[i + 1] ?? '')
      if (rest[i]!.startsWith('--exec=')) return again(rest[i]!.slice(7))
      if (/^-x./.test(rest[i]!)) return again(rest[i]!.slice(2))
    }
  }
  if (sub === 'bisect' && rest[0] === 'run') return again(rest.slice(1).join(' '))
  return undefined
}

// cd and pushd: where the command after it may run. Only a command chained with && after it is sure the cd worked.
function cd(args: Word[], where: Where): void {
  const target = args.find(a => !a.text.startsWith('-'))
  const ok = new Set<string | undefined>()
  for (const d of where.dirs) {
    if (!target || target.unread || target.text === '-' || target.text.startsWith('~') || d === undefined || where.root === undefined) ok.add(undefined)
    else {
      const next = normalize(target.text.startsWith('/') ? target.text : d + '/' + target.text)
      ok.add(within(where.root, next) ? next : undefined)
    }
  }
  for (const d of ok) where.all.add(d)
  where.pending = ok
}

// Why this line should not run, or undefined. `root` is the folder the session was opened in.
export function judge(line: string, root: string | undefined, home: string | undefined, depth = 0): string | undefined {
  if (depth > 4) return 'the line nests shells too deep for the guard to read, so it waits'
  const { text, docs } = prepare(line)
  const { segments, inner } = parse(text)
  const again = (script: string) => judge(script, root, home, depth + 1)
  const first = new Set<string | undefined>([root])
  const where: Where = { root, home, dirs: new Set(first), all: new Set(first), requireForce: true }
  let previous: { name: string; args: Word[] } | undefined
  for (const { words: raw, sep } of segments) {
    // A new chain (after ;, a newline, |, || or a bracket) may run in any folder the line could have reached.
    if (sep === '&&' && where.pending) where.dirs = where.pending
    else if (sep !== '&&') where.dirs = new Set(where.all)
    where.pending = undefined
    const herestring = raw.findIndex(w => w.text === '<<<')
    const procSub = raw.some(w => w.text === '<')
    const u = unwrap(noRedirects(raw))
    for (const s of u.scripts) {
      const why = again(s)
      if (why) return why
    }
    const runs = [{ cmd: u.cmd, fed: u.fed }, ...u.extra.map(x => ({ cmd: unwrap(x).cmd, fed: true }))]
    for (const { cmd, fed } of runs) {
      if (!cmd.length) continue
      if (cmd[0]!.unread) {
        // A command named by a variable: the guard cannot tell what runs, but options that delete give it away.
        if (cmd.slice(1).some(a => /^-[A-Za-z]*[rR]/.test(a.text) || a.text === '--recursive' || a.text === '--hard')) return 'a command named by a variable is given options that delete, so it waits'
        continue
      }
      const name = base(cmd[0]!.text)
      const args = cmd.slice(1)
      let why: string | undefined
      if (name === 'rm') why = rm(args, where, fed)
      else if (name === 'git') why = git(args, where, again)
      else if (name === 'cd' || name === 'pushd') cd(args, where)
      else if (name === 'popd') {
        where.all.add(undefined)
        where.pending = new Set([undefined])
      } else if (name === 'eval') {
        // Whatever it runs may move the shell, so later relative targets are not trusted.
        where.all.add(undefined)
        why = args.some(a => a.unread) ? 'eval is given something the guard cannot read, so it waits' : again(args.map(a => a.text).join(' '))
      } else if (name === 'source' || name === '.') {
        where.all.add(undefined)
        if (procSub || args.some(a => a.unread)) why = `${name} is given something the guard cannot read, so it waits`
      } else if (SHELLS.has(name)) {
        const c = args.findIndex(a => /^-[A-Za-z]*c[A-Za-z]*$/.test(a.text))
        const script = c >= 0 ? args.slice(c + 1).find(a => !a.text.startsWith('-')) : undefined
        const stdin = herestring >= 0 ? raw[herestring + 1] : undefined
        let piped: Word | undefined
        if (c < 0 && sep.endsWith('|') && !sep.endsWith('||') && previous && /^(echo|printf)$/.test(previous.name)) {
          // printf's first word is a format when it has a % in it
          const words = previous.name === 'printf' && previous.args[0]?.text.includes('%') ? previous.args.slice(1) : previous.args
          piped = { text: words.map(a => a.text).join(' '), unread: words.some(a => a.unread) }
        }
        for (const s of [script, stdin, piped]) {
          if (s && !why) why = s.unread ? 'a shell is given a script the guard cannot read, so it waits' : again(s.text)
        }
      }
      if (why) return why
      previous = { name, args }
    }
  }
  // A heredoc is text, unless a shell reads it as a script; an unquoted one also runs the $( ) and backticks in it.
  for (const d of docs) {
    const shell = parse(d.owner).segments.some(s => {
      const { cmd } = unwrap(noRedirects(s.words))
      return cmd.length > 0 && SHELLS.has(base(cmd[0]!.text))
    })
    const why = shell ? again(d.body) : d.quoted ? undefined : substitutions(d.body).map(again).find(Boolean)
    if (why) return why
  }
  for (const body of inner) {
    const why = judge(body, root, home, depth + 1)
    if (why) return why
  }
  return undefined
}

const ASK = 'Ask the person to run it themselves if they meant it.'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const command = typeof e.command === 'string' ? e.command : ''
    if (command) {
      const root = await $.session.cwd().catch(() => undefined)
      const home = await $.env.get('HOME').catch(() => undefined)
      const why = judge(command, root, home)
      if (why) return { deny: `latch: ${why}. ${ASK}` }
    }
    return next(e)
  })
    // Fails closed, but only for a line that mentions what it guards: any other command goes on as if the mod were not here.
    .catch(($, e, next) =>
      !next.called && /\b(rm|git|xargs|find)\b/.test(String((e as { command?: unknown }).command ?? ''))
        ? { deny: `latch: could not read this line, so it waits. ${ASK}` }
        : next(e),
    )
}
