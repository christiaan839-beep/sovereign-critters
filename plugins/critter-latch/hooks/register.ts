import type { Register } from 'claude-code'

// critter-latch stops a few deletes that cannot be taken back, before the Bash tool runs them: a recursive rm that reaches
// outside the folder the session was opened in, git reset --hard, git clean -f, and git checkout/switch/restore over the whole tree.
//
// It reads how a command is SPELLED. It cannot see what a script, a Makefile, an alias defined elsewhere or `find -delete` will
// do, and it does not read file contents. It is best effort and no substitute for a backup or for version control.
// It looks only at the command line and the name of the folder; it keeps nothing and sends nothing.

type Word = { text: string; unread: boolean }
type Segment = { words: Word[]; sep: string } // sep: the separator characters just before it (&&, ;, |, ( ...)
type Parsed = { segments: Segment[]; inner: string[] }
type Doc = { body: string; quoted: boolean; owner: string } // a heredoc: its text, whether its delimiter was quoted, the line that opened it

const SPLIT = new Set([';', '&', '|', '\n', '(', ')'])

// A heredoc delimiter is a whole shell word: quotes and backslashes in it are removed and make the body literal.
function readWord(s: string): { word: string; quoted: boolean; len: number } | undefined {
  let i = 0
  let word = ''
  let quoted = false
  while (i < s.length && !/[\s;|&<>()]/.test(s[i]!)) {
    const c = s[i]!
    if (c === '\\') {
      quoted = true
      word += s[i + 1] ?? ''
      i += 2
    } else if (c === "'" || c === '"') {
      quoted = true
      const e = s.indexOf(c, i + 1)
      word += s.slice(i + 1, e < 0 ? s.length : e)
      i = e < 0 ? s.length : e + 1
    } else {
      word += c
      i++
    }
  }
  return word ? { word, quoted, len: i } : undefined
}

// From an opener at i ($[ or ${), the index of the bracket that closes it, quotes skipped.
function closer(l: string, i: number, open: string, close: string): number {
  let depth = 0
  for (let j = i; j < l.length; j++) {
    if (l[j] === '\\') j++
    else if (l[j] === "'" || l[j] === '"') j = endQuote(l, j)
    else if (l[j] === open) depth++
    else if (l[j] === close && --depth === 0) return j
  }
  return l.length
}
// From a quote at i (', " or the ' of $'), the index of the quote that ends it: a backslash escapes in " and in $'.
function endQuote(l: string, i: number): number {
  const q = l[i]!
  const escapes = q === '"' || l[i - 1] === '$'
  for (let j = i + 1; j < l.length; j++) {
    if (escapes && l[j] === '\\') j++
    else if (l[j] === q) return j
  }
  return l.length
}

// The heredoc operators on a line that the shell would really read: not inside a quote, a $[ ] or a ${ }, not in a comment,
// not <<<, not an arithmetic shift.
function markers(l: string): { id: string; dash: boolean; quoted: boolean }[] {
  const out: { id: string; dash: boolean; quoted: boolean }[] = []
  for (let i = 0; i < l.length; i++) {
    const c = l[i]!
    if (c === '\\') i++
    else if (c === "'" || c === '"') i = endQuote(l, i)
    else if (c === '$' && (l[i + 1] === '[' || l[i + 1] === '{')) i = closer(l, i + 1, l[i + 1]!, l[i + 1] === '[' ? ']' : '}')
    else if (c === '#' && (i === 0 || /\s/.test(l[i - 1]!))) break
    else if (c === '<' && l[i + 1] === '<' && l[i + 2] !== '<' && l[i - 1] !== '<') {
      const before = l.slice(0, i)
      if ((before.match(/\(\(/g) ?? []).length > (before.match(/\)\)/g) ?? []).length) continue // $((1<<n))
      let k = i + 2
      const dash = l[k] === '-'
      if (dash) k++
      while (l[k] === ' ' || l[k] === '\t') k++
      const rw = readWord(l.slice(k))
      if (rw) {
        out.push({ id: rw.word, dash, quoted: rw.quoted })
        i = k + rw.len - 1
      } else i = k
    }
  }
  return out
}

// A line without its line continuations, and without the bodies of its heredocs, which come back apart: they are text,
// unless a shell reads them as a script or the delimiter is unquoted, which lets $( ) and backticks in them run.
// A heredoc that never ends hides nothing: its lines stay commands.
export function prepare(line: string): { text: string; docs: Doc[] } {
  const lines = line.split('\n')
  const out: string[] = []
  const docs: Doc[] = []
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]!
    for (let m = /\\+$/.exec(l); m && m[0].length % 2 === 1 && i + 1 < lines.length; m = /\\+$/.exec(l)) l = l.slice(0, -1) + lines[++i]!
    out.push(l)
    for (const w of markers(l)) {
      const body: string[] = []
      let j = i
      let found = false
      while (j + 1 < lines.length) {
        const b = lines[++j]!
        if ((w.dash ? b.trim() : b) === w.id) {
          found = true
          break
        }
        body.push(b)
      }
      if (found) {
        i = j
        docs.push({ body: body.join('\n'), quoted: w.quoted, owner: l })
      }
    }
  }
  return { text: out.join('\n'), docs }
}

// Redirect operators written without spaces (sh<<EOF, sh<<<'x') get their spaces back, so the command is a word of its own.
const spaced = (s: string) => s.replace(/(?<=[^\s<])(<<)(?!<)/g, ' $1').replace(/(?<=\S)(<<<)/g, ' $1').replace(/(<<<)(?=\S)/g, '$1 ')

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
      text += line.slice(i, end)
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
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'su', 'mksh', 'oksh', 'ash', 'yash', 'posh', 'rbash', 'csh', 'tcsh'])
// A file a shell reads its script from that is really its standard input (source /dev/stdin <<< '…').
const STDIN = /^(?:\/dev\/stdin|\/dev\/fd\/0|\/proc\/self\/fd\/0|-)$/
const XARGS_VALUE = new Set(['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a', '-i', '-l', '-J', '-S'])
const XARGS_LONG = new Set(['--max-args', '--max-procs', '--max-lines', '--max-chars', '--delimiter', '--arg-file', '--eof', '--process-slot-var'])
// Wrappers that run what follows their own options: the options that take a value, how many positional words come first,
// and the option whose value is itself a script.
const WRAP: Record<string, { value: RegExp; skip: number; script?: RegExp }> = {
  sudo: { value: /^(?:-[ughpCDRTU]|--(?:user|group|host|prompt|chdir|chroot|close-from|role|type|other-user|command-timeout))$/, skip: 0 },
  doas: { value: /^-[uC]$/, skip: 0 },
  env: { value: /^(?:-[uC]|--(?:unset|chdir|argv0))$/, skip: 0, script: /^(?:-[A-Za-z]*S|--split-string)$/ },
  timeout: { value: /^(?:-[sk]|--(?:signal|kill-after))$/, skip: 1 },
  nice: { value: /^(?:-n|--adjustment)$/, skip: 0 }, ionice: { value: /^(?:-[cnp]|--(?:class|classdata|pid))$/, skip: 0 },
  flock: { value: /^(?:-[wE]|--(?:timeout|conflict-exit-code))$/, skip: 1, script: /^(?:-c|--command)$/ },
  watch: { value: /^(?:-n|--interval)$/, skip: 0 }, taskset: { value: /^-[cp]$/, skip: 1 }, chroot: { value: /^$/, skip: 1 },
  script: { value: /^$/, skip: 0, script: /^-[A-Za-z]*c$/ },
  command: { value: /^$/, skip: 0 }, builtin: { value: /^$/, skip: 0 }, exec: { value: /^-a$/, skip: 0 }, nohup: { value: /^$/, skip: 0 },
  time: { value: /^$/, skip: 0 }, stdbuf: { value: /^$/, skip: 0 }, setsid: { value: /^$/, skip: 0 }, caffeinate: { value: /^-[tuw]$/, skip: 0 },
  busybox: { value: /^$/, skip: 0 }, arch: { value: /^$/, skip: 0 }, noglob: { value: /^$/, skip: 0 }, nocorrect: { value: /^$/, skip: 0 },
  coproc: { value: /^$/, skip: 0 }, fakeroot: { value: /^$/, skip: 0 }, unshare: { value: /^$/, skip: 0 }, npx: { value: /^$/, skip: 0 },
  strace: { value: /^-[eoPsEp]$/, skip: 0 }, 'xvfb-run': { value: /^-[ans]$/, skip: 0 }, uv: { value: /^$/, skip: 1 },
  repeat: { value: /^$/, skip: 1 },
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
  roots?: Word[] // where a find that feeds it looks
  extra: Word[][] // more commands it runs (every -exec of a find)
  scripts: string[] // scripts it is handed (env -S, flock -c, script -c, parallel's command, watch's command)
  chdir?: Word // the folder a wrapper runs it in (env -C, sudo -D, chroot)
}

// The letter that moves a wrapper's command to another folder, the other letters that take a value, and how its long option is
// spelled at its shortest (getopt takes any unique prefix).
const CHDIR: Record<string, { letter: string; values: string; long: RegExp }> = {
  env: { letter: 'C', values: 'uCS', long: /^--c(?:h(?:d(?:ir?)?)?)?(?:=|$)/ },
  sudo: { letter: 'D', values: 'ughpCDRTU', long: /^--chd(?:ir?)?(?:=|$)/ },
}
// find's options that come before the folders it looks in: -H -L -P (and BSD's -E -X -d -s -x), -O3, -D with a value, and BSD's
// -f, whose value is a folder.
const FIND_LEADING = /^-(?:[HLPEXdsx]+|O\d*)$/

// Where a command really starts: past assignments, keywords, sudo, env, command, time, nice, busybox and the like.
function unwrap(words: Word[]): Unwrapped {
  let w = words
  let fed = false
  const extra: Word[][] = []
  const scripts: string[] = []
  let roots: Word[] | undefined
  let chdir: Word | undefined
  for (let guard = 0; guard < 12 && w.length; guard++) {
    // zsh's =name runs the program name stands for
    if (/^=[A-Za-z]/.test(w[0]!.text)) w = [{ ...w[0]!, text: w[0]!.text.slice(1) }, ...w.slice(1)]
    const head = base(w[0]!.text)
    if (isAssign(w[0]!.text) || /^(!|then|do|else|elif|if|while|until)$/.test(w[0]!.text)) {
      w = w.slice(1)
      continue
    }
    if (w[0]!.unread) break
    if (head === 'function') w = w.slice(2)
    else if (head in WRAP) {
      const { value, skip, script } = WRAP[head]!
      const moves = CHDIR[head]
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-') && w[k]!.text !== '--') {
        const a = w[k]!.text
        const long = /^--split-string=(.*)$/.exec(a)
        if (head === 'env' && long) {
          scripts.push(long[1]!)
          return { cmd: [], fed, extra, scripts }
        }
        if (script?.test(a)) {
          scripts.push(w[k + 1]?.text ?? '')
          return { cmd: [], fed, extra, scripts }
        }
        if (moves && moves.long.test(a)) {
          // --chdir DIR, --chdir=DIR
          const eq = a.indexOf('=')
          chdir = eq < 0 ? w[k + 1] : { text: a.slice(eq + 1), unread: w[k]!.unread }
          k += eq < 0 ? 2 : 1
          continue
        }
        if (moves && /^-[A-Za-z]/.test(a)) {
          // a bundle: the first letter that takes a value takes the rest of the word, or the next word
          const at = [...a.slice(1)].findIndex(l => moves.values.includes(l))
          if (at >= 0) {
            const rest = a.slice(at + 2)
            if (a[at + 1] === moves.letter) chdir = rest ? { text: rest, unread: w[k]!.unread } : w[k + 1]
            k += rest ? 1 : 2
            continue
          }
        }
        k += value.test(a) && head !== 'time' ? 2 : 1
      }
      if (head === 'env') while (k < w.length && isAssign(w[k]!.text)) k++
      if (w[k]?.text === '--') k++
      if (head === 'chroot' && w[k]) chdir = w[k] // the command starts in the new root
      if (head === 'watch') {
        // watch hands its words to sh -c as one script
        scripts.push(w.slice(k).map(a => a.text).join(' '))
        return { cmd: [], fed, extra, scripts, chdir }
      }
      w = w.slice(k + skip)
    } else if (head === 'xargs') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += XARGS_VALUE.has(w[k]!.text) || XARGS_LONG.has(w[k]!.text) ? 2 : 1
      fed = true
      w = w.slice(k)
    } else if (head === 'parallel') {
      let k = 1
      while (k < w.length && w[k]!.text.startsWith('-')) k += /^(?:-[jNnaS]|--(?:jobs|max-args|arg-file|sshlogin))$/.test(w[k]!.text) ? 2 : 1
      const end = w.findIndex(a => a.text === ':::' || a.text === '::::')
      fed = true
      const rest = w.slice(k, end < 0 ? undefined : end)
      if (rest.length === 1 && /\s/.test(rest[0]!.text)) {
        scripts.push(rest[0]!.text)
        return { cmd: [], fed, extra, scripts }
      }
      w = rest
    } else if (head === 'find') {
      // every -exec, -execdir and -ok runs a command on files the guard cannot name, but it knows where find looks
      let start = w.slice(1)
      const found: Word[] = []
      for (;;) {
        const a = start[0]?.text ?? ''
        if (a === '--') start = start.slice(1)
        else if (a === '-D') start = start.slice(2)
        else if (a === '-f' && start[1]) {
          found.push(start[1]) // BSD find -f DIR looks in DIR
          start = start.slice(2)
        } else if (FIND_LEADING.test(a)) start = start.slice(1)
        else break
        if (a === '--') break
      }
      const stop = start.findIndex(a => a.text.startsWith('-') || a.text === '(' || a.text === '!')
      roots = [...found, ...(stop < 0 ? start : start.slice(0, stop))]
      for (let i = 0; i < w.length; i++) {
        if (!/^-(?:exec|execdir|ok|okdir)$/.test(w[i]!.text)) continue
        const rest = w.slice(i + 1)
        const end = rest.findIndex(a => a.text === ';' || a.text === '+')
        extra.push(end < 0 ? rest : rest.slice(0, end))
      }
      return { cmd: w.slice(0, 0), fed, roots: roots.length ? roots : [{ text: '.', unread: false }], extra, scripts, chdir }
    } else break
  }
  return { cmd: w, fed, roots, extra, scripts, chdir }
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
  gitAliases: Map<string, string>
  shellAliases: Map<string, string>
}

const spells = (arg: string, long: string, min = 3) => arg.startsWith('--') && arg.length >= min && long.startsWith(arg)
const EMPTIES = new Set(['*', '**', '.*'])
// Whether a bracket expression ([.a], [!a], [^a], [[:punct:]], [!-/]) can match a dot.
function bracketDot(body: string): boolean {
  const neg = body.startsWith('!') || body.startsWith('^')
  const set = neg ? body.slice(1) : body
  const ranges = [...set.matchAll(/(.)-(.)/g)].some(m => m[1]!.charCodeAt(0) <= 46 && 46 <= m[2]!.charCodeAt(0))
  const has = set.includes('.') || /\[:(?:punct|print|graph):\]/.test(set) || ranges
  return neg ? !has : has
}

// A wildcard segment that could stand for .. (a leading * does not match dot entries, so it cannot). bash before 5.2 lets a
// pattern that starts with a dot match . and .. alike.
function mayBeParent(seg: string): boolean {
  if (!/[*?[]/.test(seg) || seg.startsWith('*')) return false
  let re = ''
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i]!
    if (c === '*') re += '.*'
    else if (c === '?') re += '.'
    else if (c === '[') {
      // a ] right after [ or [! is a member, and a POSIX class ([:punct:]) holds its own ]
      let end = seg.indexOf(']', /[!^]/.test(seg[i + 1] ?? '') ? i + 3 : i + 2)
      while (end >= 0 && /\[:\w*:?$/.test(seg.slice(i + 1, end))) end = seg.indexOf(']', end + 1)
      if (end < 0) re += '\\['
      else {
        re += bracketDot(seg.slice(i + 1, end)) ? '\\.' : '[^.]'
        i = end
      }
    } else re += c.replace(/[.+^${}()|\\]/g, '\\$&')
  }
  try {
    return new RegExp('^' + re + '$').test('..')
  } catch {
    return true
  }
}

function rm(args: Word[], where: Where, fed: boolean, roots: Word[] | undefined): string | undefined {
  let recursive = false
  const targets: Word[] = []
  let ended = false
  for (const a of args) {
    if (!ended && a.text === '--') ended = true
    else if (!ended && a.unread && a.text.startsWith('-')) {
      // an option made of an expansion could be -r, and could split into targets too (-rf${IFS}../x)
      recursive = true
      targets.push(a)
    }
    else if (!ended && a.text.startsWith('--')) {
      if (spells(a.text, '--recursive', 3)) recursive = true
      if (a.text === '--no-preserve-root') return 'rm --no-preserve-root removes the root of the disk'
    } else if (!ended && /^-[A-Za-z]+$/.test(a.text)) {
      if (/[rR]/.test(a.text)) recursive = true
    } else targets.push(a)
  }
  if (!recursive) return undefined
  if (where.root === undefined) return 'could not tell which folder this is, so the delete waits'
  const { root, home } = where
  if (fed) {
    // What find or git ls-files names is inside where they look; anything else that feeds rm is unreadable.
    const read = roots !== undefined && roots.every(r => !r.unread && !r.text.startsWith('~')) && [...where.dirs].every(d => d !== undefined)
    if (!read) return 'rm -r has a target the guard cannot read: it comes from another command'
    if (!roots!.every(({ text: r }) => [...where.dirs].every(d => within(root, normalize(r.startsWith('/') ? r : d + '/' + r))))) return `rm -r reaches outside the folder you opened (${root})`
  }
  for (const t of targets) {
    if (fed && /^(?:\{\}|\{\.\}|%|\{\})$/.test(t.text)) continue // the placeholder for what find or xargs hands over
    if (t.unread) return 'rm -r has a target the guard cannot read ($, a backtick or a brace in it), so it waits'
    let path = t.text
    if (path === '~' || path.startsWith('~/')) {
      if (!home) return 'rm -r has a target the guard cannot read (~ with no home folder known), so it waits'
      path = home + path.slice(1)
    } else if (path.startsWith('~')) return "rm -r has a target the guard cannot read (another user's home), so it waits"
    if (path.split('/').some(mayBeParent)) return 'rm -r has a wildcard that could stand for .. , so it waits'
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

// Whether a git option is on once git has read every flag, in order: the last of -x, --long and --no-long (or a prefix of
// either) wins. `stops` are the letters that take the rest of a bundle as their value (-e for clean, -s for restore).
function on(flags: string[], letter: string, long: string, stops: string): boolean {
  let v = false
  for (const a of flags) {
    if (a.startsWith('--no-')) {
      if (spells('--' + a.slice(5), long, 3)) v = false
    } else if (a.startsWith('--')) {
      if (spells(a, long, 3)) v = true
    } else if (/^-[A-Za-z]/.test(a)) {
      for (const ch of a.slice(1)) {
        if (ch === letter) v = true
        if (stops.includes(ch)) break
      }
    }
  }
  return v
}

// Pathspec magic that leaves out what it names (:!x, :^x, :(exclude)x): a list made only of these means everything else.
const excludes = (p: string) => /^:(?:[!^]|\([^)]*\bexclude\b[^)]*\))/.test(p)
// What a shell expands to the folder it is in: $PWD, ~+, $(pwd), `pwd`, $(git rev-parse --show-toplevel).
const HERE = /^(?:\$PWD|\$\{PWD\}|~\+|\$\(\s*pwd\s*\)|`\s*pwd\s*`|\$\(\s*git\s+rev-parse\s+--show-toplevel\s*\))(?=\/|$)/

// A path that names the whole tree: ., ./, ./., .//, ./*, *, **, ?*, .., sub/.., :/, :(top), :/*, :(glob)**, $PWD, ~+, or the
// folder itself.
function wholeTree(p00: string, root: string | undefined): boolean {
  const p0 = p00.replace(HERE, '.')
  let p = p0
  const magic = /^:(?:\([^)]*\)|\/)/.exec(p)
  if (magic) p = p.slice(magic[0].length) // :/ and :(top) say "from the top of the repository"
  if (p0.startsWith('/') && root !== undefined) {
    const n = normalize(p0)
    return n === root || root.startsWith(n === '/' ? '/' : n + '/')
  }
  const stack: string[] = []
  for (const s of p.split('/')) {
    if (s === '' || s === '.') continue
    if (s === '..' && stack.length && stack[stack.length - 1] !== '..') stack.pop()
    else stack.push(s)
  }
  // a wildcard of only * and ? with a * in it matches every path (git's * crosses /)
  return stack.length === 0 || stack.every(s => s === '..') || (stack.length === 1 && /^[*?]*\*[*?]*$/.test(stack[0]!))
}

// `again` judges a command string that git runs (submodule foreach, rebase -x, bisect run).
function git(args: Word[], where: Where, again: (script: string) => string | undefined, depth = 0): string | undefined {
  let k = 0
  while (k < args.length && args[k]!.text.startsWith('-')) {
    const a = args[k]!.text
    const v = args[k + 1]?.text ?? ''
    const attached = /^-calias\.(.+)$/.exec(a)
    const def = attached ? attached[1]! : a === '-c' ? v.replace(/^alias\./, 'alias.') : undefined
    // an empty value is false to git; --config-env takes the value from a variable the guard cannot read
    if (a === '-c' && /^clean\.requireforce=(?:false|no|off|0)?$/i.test(v)) where.requireForce = false
    if (/^--config-env(?:=|$)/.test(a) && /clean\.requireforce/i.test(a + v)) where.requireForce = false
    if (def && (attached || /^alias\./i.test(v))) {
      const m = /^(?:alias\.)?([^=]+)=(.*)$/s.exec(attached ? def : v)
      if (m) {
        if (m[2]!.startsWith('!')) return 'git is given an alias that runs a shell command, so it waits'
        where.gitAliases.set(m[1]!, m[2]!)
      }
    }
    k += GIT_VALUE.test(a) ? 2 : 1
  }
  const sub = args[k]?.text
  const rest = args.slice(k + 1).map(w => w.text)
  if (sub !== undefined && where.gitAliases.has(sub) && depth < 4) {
    const spelled = where.gitAliases.get(sub)!.trim().split(/\s+/).map(text => ({ text, unread: false }))
    return git([...spelled, ...args.slice(k + 1)], where, again, depth + 1)
  }
  const dd = rest.indexOf('--')
  const beforeDashes = dd < 0 ? rest : rest.slice(0, dd) // after -- nothing is a flag
  const flags = beforeDashes.filter(a => a.startsWith('-'))
  // the letters of each command that take the rest of a bundle as their value
  const stops = sub === 'clean' ? 'e' : sub === 'restore' ? 's' : sub === 'checkout' ? 'bB' : sub === 'switch' ? 'cC' : ''
  const has = (letter: string, long: string) => on(flags, letter, long, stops)
  const pathspecs = [...beforeDashes.filter(a => !a.startsWith('-')), ...(dd < 0 ? [] : rest.slice(dd + 1))]
  const patch = has('p', '--patch')
  const whole = (p: string) => wholeTree(p, where.root)
  const paths = dd < 0 ? pathspecs : rest.slice(dd + 1) // after --, without checkout's tree-ish before it
  const wholeList = pathspecs.some(whole) || (paths.length > 0 && paths.every(excludes))
  if (sub === 'reset' && flags.some(a => spells(a, '--hard'))) return 'git reset --hard drops changes you have not committed'
  if (sub === 'clean') {
    const force = has('f', '--force') || !where.requireForce
    const dry = has('n', '--dry-run')
    const asks = has('i', '--interactive')
    if (force && !dry && !asks) return 'git clean -f removes files git does not track, for good'
  }
  if (sub === 'checkout' && !patch) {
    if (has('f', '--force') || wholeList) return 'git checkout throws away every uncommitted change in the tree'
  }
  if (sub === 'switch' && (has('f', '--force') || has('', '--discard-changes'))) return 'git switch throws away every uncommitted change in the tree'
  const fromFile = flags.some(x => x.startsWith('--pathspec-from-file'))
  const staged = has('S', '--staged')
  const worktree = has('W', '--worktree')
  if ((sub === 'checkout' || sub === 'restore') && !patch && fromFile && !(sub === 'restore' && staged && !worktree)) {
    return `git ${sub} --pathspec-from-file reads its paths from a file the guard cannot read, so it waits`
  }
  if (sub === 'restore' && !patch) {
    if (wholeList && (!staged || worktree)) return 'git restore throws away every uncommitted change in the tree'
  }
  if (sub === 'config') {
    const i = rest.findIndex(a => /^alias\./i.test(a))
    if (i >= 0) {
      const value = rest[i + 1] ?? ''
      if (value.startsWith('!')) return 'git config here defines an alias that runs a shell command, so it waits'
      where.gitAliases.set(rest[i]!.slice(6), value)
    }
    const j = rest.findIndex(a => /^clean\.requireforce$/i.test(a))
    if (j >= 0 && rest[j + 1] !== undefined && /^(?:false|no|off|0)?$/i.test(rest[j + 1]!)) where.requireForce = false
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
// A line with many cds is not followed further than a handful of folders: past that, no folder is trusted.
// zsh's `cd old new` swaps a part of the folder's path, and `cd +1` takes a folder from the stack: neither is followed.
function cd(args: Word[], where: Where): void {
  const named = args.filter(a => !a.text.startsWith('-'))
  const target = named.length === 1 ? named[0] : undefined
  const ok = new Set<string | undefined>()
  for (const d of where.dirs) {
    if (!target || target.unread || target.text.startsWith('+') || target.text.startsWith('~') || d === undefined || where.root === undefined) ok.add(undefined)
    else {
      const next = normalize(target.text.startsWith('/') ? target.text : d + '/' + target.text)
      ok.add(next) // a folder outside is still a folder the guard read: what is deleted from there reaches outside
    }
  }
  for (const d of ok) where.all.add(d)
  if (where.all.size > 12 || ok.size > 12) {
    where.all = new Set([undefined])
    where.dirs = new Set([undefined])
    where.pending = new Set([undefined])
    return
  }
  where.pending = ok
}

// An eval of what one of these well-known tools prints sets up a shell, and is not held.
const EVAL_SAFE = /^\$\(\s*(?:ssh-agent|direnv|pyenv|rbenv|nodenv|jenv|opam|fnm|mise|asdf|brew|conda|starship|zoxide|thefuck|pipenv|dircolors|keychain|register-python-argcomplete)\b/

const argWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).map(text => ({ text, unread: false }))

// printf's format with its %s filled in, and \n spelled out.
function printed(args: Word[]): { text: string; unread: boolean } {
  const [format, ...rest] = args
  if (!format) return { text: '', unread: false }
  const text = format.text.replace(/%[sbd]/g, () => rest.shift()?.text ?? '').replace(/\\n/g, '\n') + (rest.length ? ' ' + rest.map(a => a.text).join(' ') : '')
  return { text, unread: format.unread || args.some(a => a.unread) }
}

// Why this line should not run, or undefined. `root` is the folder the session was opened in.
export function judge(line: string, root: string | undefined, home: string | undefined, depth = 0): string | undefined {
  if (depth > 4) return 'the line nests shells too deep for the guard to read, so it waits'
  const { text, docs } = prepare(line)
  const { segments, inner } = parse(spaced(text))
  const again = (script: string) => judge(script, root, home, depth + 1)
  // bash <(echo …) runs what the substitution prints, as echo … | bash does.
  for (const m of text.matchAll(/(?:^|[\s;&|(])(?:\S*\/)?(?:bash|sh|zsh|dash|ksh|mksh|oksh|ash|yash|posh|fish|csh|tcsh|source|\.)\s+(?:-\S+\s+)*<\(/g)) {
    const open = m.index! + m[0].length - 1
    const why = again(`${text.slice(open + 1, closer(text, open, '(', ')'))} | sh`)
    if (why) return why
  }
  const first = new Set<string | undefined>([root])
  const where: Where = { root, home, dirs: new Set(first), all: new Set(first), requireForce: true, gitAliases: new Map(), shellAliases: new Map() }
  let feed: { text: string; unread: boolean } | undefined // what the command before a pipe printed
  let previous: { name: string; args: Word[]; roots?: Word[] } | undefined
  for (const { words: raw, sep } of segments) {
    // A new chain (after ;, a newline, |, || or a bracket) may run in any folder the line could have reached.
    if (sep === '&&' && where.pending) where.dirs = where.pending
    else if (sep !== '&&') where.dirs = new Set(where.all)
    where.pending = undefined
    const herestring = raw.findIndex(w => w.text === '<<<')
    const procSub = raw.some(w => w.text === '<')
    const piped = /(?:^|[^|])\|(?:[^|]|$)/.test(sep)
    // git settings in the environment can turn clean.requireForce off
    if (raw.some(w => /^GIT_CONFIG_\w*=.*clean\.requireforce/i.test(w.text))) where.requireForce = false
    const u = unwrap(noRedirects(raw))
    // A wrapper that runs the command in another folder (env -C, sudo -D, chroot) moves what it deletes.
    const t = u.chdir
    const here: Where = t
      ? { ...where, dirs: new Set([...where.dirs].map(d => (t.unread || t.text.startsWith('~') || d === undefined ? undefined : normalize(t.text.startsWith('/') ? t.text : d + '/' + t.text)))) }
      : where
    for (const s of u.scripts) {
      const why = again(s)
      if (why) return why
    }
    const runs = [{ cmd: u.cmd, fed: u.fed, roots: u.roots }, ...u.extra.map(x => ({ cmd: unwrap(x).cmd, fed: true, roots: u.roots }))]
    let next: typeof feed
    for (let { cmd, fed, roots } of runs) {
      if (!cmd.length) continue
      // An alias defined earlier on the line is what it stands for.
      const aliased = where.shellAliases.get(base(cmd[0]!.text))
      if (aliased !== undefined && !cmd[0]!.unread) cmd = [...argWords(aliased), ...cmd.slice(1)]
      if (cmd[0]!.unread) {
        // A command named by a variable: the guard cannot tell what runs, but options that delete give it away, and so does
        // rm or git split from its words by $IFS.
        if (/(?:^|\/)(?:rm|git)(?:\$\{?IFS|$)/.test(cmd[0]!.text)) return 'a command named by an expansion spells rm or git, so it waits'
        if (cmd.slice(1).some(a => /^-[A-Za-z]*[rR]/.test(a.text) || a.text === '--recursive' || a.text === '--hard')) return 'a command named by a variable is given options that delete, so it waits'
        continue
      }
      const name = base(cmd[0]!.text)
      const args = cmd.slice(1)
      let why: string | undefined
      if (fed && !roots && piped && previous) {
        // xargs after git ls-files, or after a find that looks only inside the folder
        // (not with --format, which can print any path)
        if (previous.name === 'git' && previous.args[0]?.text === 'ls-files' && previous.args.slice(1).every(a => a.text.startsWith('-') && !a.text.startsWith('--fo') && !a.text.includes('%'))) roots = [{ text: '.', unread: false }]
        else if (previous.name === 'find' && previous.roots) roots = previous.roots
      }
      const program = /^git-(reset|clean|checkout|switch|restore)$/.exec(name) // git-reset by its path is git reset
      if (name === 'rm') why = rm(args, here, fed, roots)
      else if (name === 'git') why = git(args, where, again)
      else if (program) why = git([{ text: program[1]!, unread: false }, ...args], where, again)
      else if (name === 'cd' || name === 'pushd' || name === 'chdir') cd(args, where)
      else if (name === 'popd') {
        where.all.add(undefined)
        where.pending = new Set([undefined])
      } else if (name === 'alias') {
        for (const a of args) {
          const m = /^([^=]+)=(.*)$/s.exec(a.text)
          if (m) where.shellAliases.set(m[1]!, m[2]!)
        }
      } else if (name === 'trap') {
        const script = args.find(a => !a.text.startsWith('-'))
        if (script) why = script.unread ? 'trap is given something the guard cannot read, so it waits' : again(script.text)
      } else if (name === 'eval') {
        const unread = args.filter(a => a.unread)
        if (unread.length && unread.every(a => EVAL_SAFE.test(a.text))) {
          // a setup eval: nothing to read
        } else {
          // Whatever it runs may move the shell, so later relative targets are not trusted.
          where.all.add(undefined)
          why = unread.length ? 'eval is given something the guard cannot read, so it waits' : again(args.map(a => a.text).join(' '))
        }
      } else if ((name === 'source' || name === '.') && !STDIN.test(args.find(a => !a.text.startsWith('-'))?.text ?? '')) {
        where.all.add(undefined)
        if (procSub || args.some(a => a.unread)) why = `${name} is given something the guard cannot read, so it waits`
      } else if (SHELLS.has(name) || name === 'source' || name === '.') {
        // a shell, or source /dev/stdin, which reads its script from standard input
        if (!SHELLS.has(name)) where.all.add(undefined)
        const c = args.findIndex(a => /^-[A-Za-z]*c[A-Za-z]*$/.test(a.text))
        const script = c >= 0 ? args.slice(c + 1).find(a => !a.text.startsWith('-')) : undefined
        const stdin = herestring >= 0 ? raw[herestring + 1] : undefined
        for (const s of [script, stdin, c < 0 && piped ? feed : undefined]) {
          if (s && !why) why = s.unread ? 'a shell is given a script the guard cannot read, so it waits' : again(s.text)
        }
      }
      if (why) return why
      previous = { name, args, roots: u.roots }
      // what this command prints, for a shell further down the pipe
      if (name === 'echo') {
        const words = args.filter(a => !/^-[neE]+$/.test(a.text))
        next = { text: words.map(a => a.text).join(' '), unread: words.some(a => a.unread) }
      } else if (name === 'printf') next = printed(args)
      else if ((name === 'cat' || name === 'tee') && piped) next = feed
    }
    feed = next
  }
  // A heredoc is text, unless a shell reads it as a script; an unquoted one also runs the $( ) and backticks in it.
  for (const d of docs) {
    const shell = parse(spaced(d.owner)).segments.some(s => {
      const { cmd } = unwrap(noRedirects(s.words))
      const name = cmd.length ? base(cmd[0]!.text) : ''
      return SHELLS.has(name) || ((name === 'source' || name === '.') && STDIN.test(cmd[1]?.text ?? ''))
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

// A line the guard could not read ("cannot read", "so it waits") is put to the person with an ask: a false alarm then costs
// one click. A line it read and stopped is refused outright.
export const unsure = (why: string) => /cannot read|so it waits|too deep|could not tell which folder|could not read this line/.test(why)

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const command = typeof e.command === 'string' ? e.command : ''
    if (command) {
      const root = await $.session.cwd().catch(() => undefined)
      const home = await $.env.get('HOME').catch(() => undefined)
      const reason = judge(command, root, home)
      if (reason && !unsure(reason)) return { deny: `latch: ${reason}. ${ASK}` }
    }
    return next(e)
  })
    // Fails closed, but only for a line that mentions what it guards: any other command goes on as if the mod were not here.
    .catch(($, e, next) =>
      !next.called && /\b(rm|git|xargs|find)\b/.test(String((e as { command?: unknown }).command ?? ''))
        ? { deny: `latch: could not read this line, so it waits. ${ASK}` }
        : next(e),
    )

  // The permission check asks about what the guard could not read.
  // The names checked and onward are this hook's alone: the plugin directory reads a permission hook only when no
  // variable in the file is spelled like one of its parameters.
  on('tool.check', { tool: 'Bash' }, async ($, checked, onward) => {
    const command = (checked.input as { command?: unknown } | undefined)?.command
    if (typeof command === 'string' && command) {
      const root = await $.session.cwd().catch(() => undefined)
      const home = await $.env.get('HOME').catch(() => undefined)
      const reason = judge(command, root, home)
      if (reason && unsure(reason)) return { decision: 'ask' as const, reason: `latch: ${reason}.` }
    }
    return onward(checked)
  }).catch(($, checked, onward) => onward(checked))
}
