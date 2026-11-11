import type { Register } from 'claude-code'

// critter-latch stops a few deletes that cannot be taken back, before the Bash tool runs them: a recursive rm that reaches
// outside the folder the session was opened in, git reset --hard, git clean -f, and git checkout/restore over the whole tree.
//
// It reads how a command is SPELLED. It cannot see what a script, a Makefile, `find -delete` or an alias will do, and it
// does not read file contents. It is best effort and no substitute for a backup or for version control.
// It looks only at the command line and the name of the folder; it keeps nothing and sends nothing.

type Word = { text: string; unread: boolean }
type Parsed = { segments: Word[][]; inner: string[] }

const SPLIT = new Set([';', '&', '|', '\n', '(', ')'])

// Splits a line into commands and their words. A word is unread when it holds an expansion the shell will resolve
// later ($VAR, `...`, $(...), {a,b}); the bodies of $(...) and `...` come back in `inner`, to be judged as lines themselves.
export function parse(line: string): Parsed {
  const segments: Word[][] = []
  const inner: string[] = []
  let words: Word[] = []
  let text = ''
  let unread = false
  let has = false
  const endWord = () => {
    if (has) words.push({ text, unread })
    text = ''
    unread = false
    has = false
  }
  const endSegment = () => {
    endWord()
    if (words.length) segments.push(words)
    words = []
  }
  // From the opener at i, the index just past its closer, with the body between them.
  const balanced = (i: number, open: string, close: string): [number, string] => {
    let depth = 0
    for (let j = i; j < line.length; j++) {
      if (line[j] === '\\') j++
      else if (line[j] === open) depth++
      else if (line[j] === close && --depth === 0) return [j + 1, line.slice(i + 1, j)]
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
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh'])
const SUDO_VALUE = new Set(['-u', '-g', '-h', '-p', '-C', '-D', '-R', '-T', '-U'])
const XARGS_VALUE = new Set(['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a', '-i', '-l'])

// Where a command really starts: past assignments, sudo, env, command, time, nice and the like.
// `fed` says the command's arguments also come from another command (xargs), which the guard cannot read.
function unwrap(words: Word[]): { cmd: Word[]; fed: boolean } {
  let w = words
  let fed = false
  for (let guard = 0; guard < 12 && w.length; guard++) {
    const head = base(w[0]!.text)
    if (isAssign(w[0]!.text) || /^(!|then|do|else|elif|if|while|until)$/.test(w[0]!.text)) w = w.slice(1)
    else if (head === 'sudo' || head === 'doas') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += SUDO_VALUE.has(w[k]!.text) ? 2 : 1
      w = w.slice(k)
    } else if (head === 'env') {
      let k = 1
      while (k < w.length && (w[k]!.text.startsWith('-') || isAssign(w[k]!.text))) k += /^-[uCS]$/.test(w[k]!.text) ? 2 : 1
      w = w.slice(k)
    } else if (head === 'timeout') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += /^-[sk]$/.test(w[k]!.text) ? 2 : 1
      w = w.slice(k + 1)
    } else if (/^(command|builtin|exec|nohup|time|nice|ionice|stdbuf|setsid|caffeinate)$/.test(head)) {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += /^-[nc]$/.test(w[k]!.text) && head !== 'time' ? 2 : 1
      w = w.slice(k)
    } else if (head === 'xargs') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += XARGS_VALUE.has(w[k]!.text) ? 2 : 1
      fed = true
      w = w.slice(k)
    } else break
  }
  return { cmd: w, fed }
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

// ---- the rules --------------------------------------------------------------------------------------------------

type Where = { root: string | undefined; home: string | undefined; dir: string | undefined; dirWhy?: string }

function rm(args: Word[], where: Where, fed: boolean): string | undefined {
  let recursive = false
  const targets: Word[] = []
  let ended = false
  for (const a of args) {
    if (!ended && a.text === '--') ended = true
    else if (!ended && a.text.startsWith('--')) {
      if (a.text === '--recursive') recursive = true
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
    } else if (path.startsWith('~')) return 'rm -r has a target the guard cannot read (another user\'s home), so it waits'
    if (!path.startsWith('/')) {
      if (where.dir === undefined) return `rm -r has a target the guard cannot read: ${where.dirWhy ?? 'a cd earlier on the line moved it'}`
      path = where.dir + '/' + path
    }
    const p = normalize(path)
    const last = path.slice(path.lastIndexOf('/') + 1)
    // `rm -rf *` empties the folder just as `rm -rf .` removes it.
    const parent = normalize(path.slice(0, path.lastIndexOf('/') + 1) || '/')
    if ((last === '*' || last === '.*') && (parent === root || root.startsWith(parent === '/' ? '/' : parent + '/'))) return `rm -r would delete the folder you opened (${root}) and everything in it`
    if (p === root || root.startsWith(p === '/' ? '/' : p + '/')) return `rm -r would delete the folder you opened (${root}) or one above it`
    if (!inside(root, p)) return `rm -r reaches outside the folder you opened (${root})`
  }
  return undefined
}

const spells = (arg: string, long: string, min = 3) => arg.startsWith('--') && arg.length >= min && long.startsWith(arg)
const WHOLE = new Set(['.', './', ':/', '*'])

function git(args: Word[]): string | undefined {
  let k = 0
  while (k < args.length && args[k]!.text.startsWith('-')) {
    const a = args[k]!.text
    k += /^(-C|-c|--git-dir|--work-tree|--namespace|--exec-path|--super-prefix|--config-env)$/.test(a) ? 2 : 1
  }
  const sub = args[k]?.text
  const rest = args.slice(k + 1).map(w => w.text)
  const flags = rest.filter(a => a.startsWith('-') && a !== '--')
  const bundle = (ch: string) => flags.some(a => /^-[A-Za-z]+$/.test(a) && a.includes(ch))
  const afterDashes = rest.includes('--') ? rest.slice(rest.indexOf('--') + 1) : []
  const pathspecs = [...rest.filter(a => !a.startsWith('-')), ...afterDashes]
  if (sub === 'reset' && flags.some(a => spells(a, '--hard'))) return 'git reset --hard drops changes you have not committed'
  if (sub === 'clean') {
    const force = bundle('f') || flags.some(a => spells(a, '--force', 3))
    const dry = bundle('n') || flags.some(a => spells(a, '--dry-run', 3))
    if (force && !dry) return 'git clean -f removes files git does not track, for good'
  }
  if (sub === 'checkout') {
    if (bundle('f') || flags.some(a => spells(a, '--force', 3)) || pathspecs.some(a => WHOLE.has(a))) return 'git checkout throws away every uncommitted change in the tree'
  }
  if (sub === 'restore') {
    const staged = flags.some(a => spells(a, '--staged', 3)) || bundle('S')
    const worktree = flags.some(a => spells(a, '--worktree', 3)) || bundle('W')
    if (pathspecs.some(a => WHOLE.has(a)) && (!staged || worktree)) return 'git restore throws away every uncommitted change in the tree'
  }
  return undefined
}

function cd(args: Word[], where: Where): void {
  const target = args.find(a => !a.text.startsWith('-'))
  if (!target || target.unread || target.text === '-' || target.text.startsWith('~') || where.dir === undefined || where.root === undefined) {
    where.dir = undefined
    where.dirWhy = 'a cd earlier on the line moved it somewhere the guard cannot follow'
    return
  }
  const next = normalize(target.text.startsWith('/') ? target.text : where.dir + '/' + target.text)
  if (next === where.root || inside(where.root, next)) where.dir = next
  else {
    where.dir = undefined
    where.dirWhy = 'a cd earlier on the line moved it outside the folder'
  }
}

// Why this line should not run, or undefined. `root` is the folder the session was opened in.
export function judge(line: string, root: string | undefined, home: string | undefined, depth = 0): string | undefined {
  if (depth > 4) return 'the line nests shells too deep for the guard to read, so it waits'
  const { segments, inner } = parse(line)
  const where: Where = { root, home, dir: root }
  for (const words of segments) {
    const { cmd, fed } = unwrap(words)
    if (!cmd.length) continue
    const name = base(cmd[0]!.text)
    const args = cmd.slice(1)
    let why: string | undefined
    if (name === 'rm') why = rm(args, where, fed)
    else if (name === 'git') why = git(args)
    else if (name === 'cd' || name === 'pushd') cd(args, where)
    else if (name === 'eval') why = judge(args.map(a => a.text).join(' '), root, home, depth + 1)
    else if (SHELLS.has(name)) {
      const c = args.findIndex(a => /^-[A-Za-z]*c[A-Za-z]*$/.test(a.text))
      const script = c >= 0 ? args.slice(c + 1).find(a => !a.text.startsWith('-')) : undefined
      if (script) why = script.unread ? 'a shell is given a script the guard cannot read, so it waits' : judge(script.text, root, home, depth + 1)
    }
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
      !next.called && /\b(rm|git|xargs)\b/.test(String((e as { command?: unknown }).command ?? ''))
        ? { deny: `latch: could not read this line, so it waits. ${ASK}` }
        : next(e),
    )
}
