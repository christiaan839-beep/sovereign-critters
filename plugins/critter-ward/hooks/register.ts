import type { Register } from 'claude-code'

// guard stops a force push, and a push to main or master, before the Bash tool runs it.
//
// What it covers, plainly: a Bash hook sees how a command is spelled, not what it will do. The guard reads the
// common spellings of a command line (quotes; ; & | && || and newlines; ( ), $( ), ` `, heredocs and arithmetic;
// a cd, where the shell surely keeps it; VAR= words; wrappers such as env, timeout and sudo; bash -c and eval),
// finds every git push in it, and asks git where each one goes: the branch checked out, the push settings, a
// branch that is another name for one. git is asked before the line runs, so what an earlier git command on the
// line changes (a checkout, a git config), or a later one in the same loop, the guard takes from the line. What
// it cannot read ahead (an expansion, a brace or a glob, a cd it cannot be sure of, a command such as flock or
// watch that runs git push) it refuses, as it refuses a push whose line sets PATH, GIT_EXEC_PATH or an LD_ or
// DYLD_ variable, which change the program that runs or what it loads. The git the guard asks runs before the
// person has approved the line, so it is handed only the variables on the line that locate the repository and
// its settings (GIT_DIR, GIT_WORK_TREE, GIT_COMMON_DIR, GIT_CONFIG_GLOBAL, GIT_CONFIG_SYSTEM, GIT_CONFIG_NOSYSTEM,
// GIT_CONFIG_COUNT with its KEY and VALUE pairs, HOME, XDG_CONFIG_HOME), never the rest, and runs with trace2
// off, so a settings file the line names cannot send git's trace to a file. If the check cannot finish (git
// fails or times out, or the line cannot be read), the command waits. Outside it: a push made by a script or
// another program (make, an npm script, gh, an MCP tool), a command built while the line runs (eval or sh -c of
// an expansion, a variable run as a command), a git alias in a config file, and what the server does with a
// push. It is best effort, and no substitute for branch protection on the server.

const PROTECTED = new Set(['main', 'master'])

// 1. A small shell-word splitter that honours quotes.

// One simple command: its words with quotes removed, the scripts nested in it ($( ), ` `, ${ } and arithmetic),
// and what a heredoc or here-string gives it on standard input. An expansion stays in its word ($NAME as
// written, a $( ) as $(…)), and a word the shell would expand as a brace or a glob is marked, so the judgement
// can see a word it cannot read ahead.
export type Command = { words: string[]; nested: Part[][]; stdin: string[] }
// What joins commands: ; (or a newline), &, |, && and ||; ( and ) mark a subshell.
export type Part = Command | ';' | '&' | '|' | '&&' | '||' | '(' | ')'
type Heredoc = { to: Command; tag: string; tabs: boolean; expands: boolean }
const WILD = '\u0001' // ends a word the shell expands as a brace ({a,b}) or a glob (*, ? or [ ])

// Splits a command line into commands and what joins them, and drops comments and redirections. With `text` it
// reads a heredoc's body (or arithmetic) instead, where only $( ), ` ` and ${ } act.
export function split(s: string, text = false): Part[] {
  let i = 0
  // From an opening quote at j, the index of the quote that closes it.
  const closing = (j: number) => {
    const q = s[j]
    for (j++; j < s.length && s[j] !== q; j++) if (q === '"' && s[j] === '\\') j++
    return j
  }
  // From just inside a bracket, the index of the `close` that ends it (nested pairs and quotes skipped), or -1.
  const matching = (j: number, open: string, close: string) => {
    for (let depth = 0; j < s.length; j++) {
      if (s[j] === '\\') j++
      else if (s[j] === "'" || s[j] === '"') j = closing(j)
      else if (s[j] === open) depth++
      else if (s[j] === close && depth-- === 0) return j
    }
    return -1
  }
  // Reads commands up to `close`, the ) that ends a $( ), or to the end. As text, it reads all of s as one
  // double-quoted word and keeps only the scripts nested in it.
  const script = (close?: string, asText = false): Part[] => {
    const parts: Part[] = []
    const heredocs: Heredoc[] = []
    let cmd: Command = { words: [], nested: [], stdin: [] }
    let word: string | undefined
    let wild = false // the word holds a brace or a glob character outside quotes
    let into: 'words' | 'stdin' | 'nowhere' = 'words' // where a redirection sends the next word
    let depth = 0
    const add = (t: string) => (word = (word ?? '') + t)
    const end = () => {
      if (word === undefined) return
      if (wild && !/^(\{|\}|\[\[?|\]\]?)$/.test(word)) word += WILD // { } [ [[ alone are words of the shell
      if (into !== 'nowhere') cmd[into].push(word)
      into = 'words'
      word = undefined
      wild = false
    }
    const next = () => {
      end()
      if (cmd.words.length || cmd.nested.length) parts.push(cmd)
      cmd = { words: [], nested: [], stdin: [] }
      into = 'words'
    }
    const op = (o: Part) => {
      next()
      parts.push(o)
    }
    // $( ), ` `, ${ }, $(( )) and $[ ] expand when the line runs: keep the scripts in them, and mark the word.
    const expansion = () => {
      let e = -1
      if (s[i] === '`') {
        // Inside ` `, \` \$ \\ and \" stand for themselves, so a ` ` nested in it is a script of its own.
        let body = ''
        for (e = i + 1; e < s.length && s[e] !== '`'; e++)
          body += s[e] === '\\' && /[$`\\"]/.test(s.charAt(e + 1)) ? s.charAt(++e) : s.charAt(e)
        cmd.nested.push(split(body))
      } else if (s.startsWith('$((', i) && (e = matching(i + 3, '(', ')')) > 0 && s[e + 1] === ')') {
        cmd.nested.push(split(s.slice(i + 3, e++), true))
      } else if (s.startsWith('$[', i) && (e = matching(i + 2, '[', ']')) > 0) cmd.nested.push(split(s.slice(i + 2, e), true))
      else if (s.startsWith('${', i) && (e = matching(i + 2, '{', '}')) > 0) cmd.nested.push(split(s.slice(i + 2, e), true))
      else if (s.startsWith('$(', i)) {
        i += 2
        cmd.nested.push(script(')'))
        e = i
      } else return false
      i = e
      add('$(…)')
      return true
    }
    // Inside double quotes only the expansions act, and \ before $ ` " \ or a newline.
    const quoted = (stop?: string) => {
      add('')
      for (; i < s.length && s[i] !== stop; i++) {
        if (s[i] === '\\' && /[$`"\\\n]/.test(s.charAt(i + 1))) {
          i++
          if (s[i] !== '\n') add(s.charAt(i))
        } else if (!expansion()) add(s.charAt(i))
      }
    }
    // A number before a redirection (2>) is its fd, and the word after it a file: both dropped. A
    // here-string's word is the command's input.
    const redirect = () => {
      if (word !== undefined && /^\d+$/.test(word)) word = undefined
      end()
      if (s.startsWith('<<<', i)) {
        i += 2
        into = 'stdin'
      } else if (s.startsWith('<<', i)) heredoc()
      else {
        while (/[<>&|]/.test(s.charAt(i + 1))) i++
        into = 'nowhere'
      }
    }
    // << starts a heredoc, its body on the lines after this one. A quoted tag keeps the body's $( ) from running.
    const heredoc = () => {
      i += 2
      const tabs = s[i] === '-'
      if (tabs) i++
      while (s[i] === ' ' || s[i] === '\t') i++
      let tag = ''
      let expands = true
      for (; i < s.length && !/[\s;&|<>()]/.test(s.charAt(i)); i++) {
        if (s[i] === "'" || s[i] === '"') {
          const j = closing(i)
          tag += s.slice(i + 1, j)
          i = j
          expands = false
        } else if (s[i] === '\\') {
          tag += s.charAt(++i)
          expands = false
        } else tag += s.charAt(i)
      }
      i-- // the loop steps onto what follows the tag
      heredocs.push({ to: cmd, tag, tabs, expands })
    }
    // A heredoc's body: the lines up to the one that is its tag. One that never closes may not be a heredoc at
    // all (a << the shell reads as a shift), so its lines are read as commands too.
    const body = ({ to, tag, tabs, expands }: Heredoc) => {
      let from = i + 1
      let eol = s.length
      let closed = false
      while (from < s.length && !closed) {
        eol = s.indexOf('\n', from) < 0 ? s.length : s.indexOf('\n', from)
        closed = (tabs ? s.slice(from, eol).replace(/^\t+/, '') : s.slice(from, eol)) === tag
        if (!closed) from = eol + 1
      }
      const text = s.slice(i + 1, from)
      i = closed ? eol : s.length
      to.stdin.push(text)
      if (expands) to.nested.push(split(text, true))
      if (!closed) to.nested.push(split(text))
    }
    // ( opens a subshell, unless it belongs to a word: an array (a=( )), a glob (@( ) and its kin) or
    // arithmetic (( )).
    const paren = () => {
      const e = matching(i + 1, '(', ')')
      const a = s[i + 1] === '(' ? matching(i + 2, '(', ')') : -1
      if (word !== undefined && e > 0 && /^[A-Za-z_]\w*(\[[^\]]*\])?\+?=$/.test(word)) {
        cmd.nested.push(split(s.slice(i + 1, e), true))
        add('(…)')
        i = e
      } else if (word !== undefined && e > 0 && /[@+*?!]$/.test(word) && word !== '!') {
        add(s.slice(i, e + 1))
        wild = true
        i = e
      } else if (word === undefined && a > 0 && s[a + 1] === ')') {
        cmd.nested.push(split(s.slice(i + 2, a), true))
        add('((…))')
        i = a + 1
      } else {
        op('(')
        depth++
      }
    }

    if (asText) {
      quoted()
      word = undefined
      next()
      return parts
    }
    for (; i < s.length; i++) {
      const c = s.charAt(i)
      if (c === close && depth === 0) break
      if (c === '\\') {
        if (s[i + 1] === '\n') i++ // a line continuation
        else add(s.charAt(++i)) // a character taken as it is
      } else if (c === "'") {
        const j = closing(i)
        add(s.slice(i + 1, j))
        i = j
      } else if (c === '"') {
        i++
        quoted('"')
      } else if (c === '$' && s[i + 1] === "'") {
        // $'…' quotes with \ escapes the guard does not decode; the $ it keeps marks the word unread.
        let j = i + 2
        for (; j < s.length && s[j] !== "'"; j++) if (s[j] === '\\') j++
        add(`$${s.slice(i + 2, j)}`)
        i = j
      } else if (c === '#' && word === undefined) {
        while (i + 1 < s.length && s[i + 1] !== '\n') i++ // a comment
      } else if (c === ' ' || c === '\t') end()
      else if (c === '\n') {
        // A newline ends a command, unless the line ended on && || or |, which carry on to the next line.
        const last = parts[parts.length - 1]
        if (word !== undefined || cmd.words.length || cmd.nested.length || !(last === '&&' || last === '||' || last === '|')) op(';')
        heredocs.splice(0).forEach(body)
      } else if (c === '<' || c === '>' || s.startsWith('&>', i)) redirect()
      else if (c === ';') {
        while (s[i + 1] === ';' || s[i + 1] === '&') i++ // ;; ;& and ;;& end a case branch
        op(';')
      } else if (s.startsWith('&&', i) || s.startsWith('||', i)) {
        op(c === '&' ? '&&' : '||')
        i++
      } else if (c === '&') op('&')
      else if (c === '|') {
        if (s[i + 1] === '&') i++ // |& pipes standard error too
        op('|')
      } else if (c === '(') paren()
      else if (c === ')') {
        op(')')
        depth--
      } else if (!expansion()) {
        add(c)
        wild ||= /[{*?[]/.test(c)
      }
    }
    next()
    return parts
  }
  return script(undefined, text)
}

// 2. A reader for wrappers: the command a simple command really runs.

// Reserved words that come before a command.
const RESERVED = new Set(['!', '{', 'if', 'then', 'else', 'elif', 'while', 'until', 'do'])
// Wrappers that run the command after their own options: the letters and long names of the options that take a
// value, and how many words they take before the command (timeout's duration).
type Wrapper = { values?: string; long?: string[]; before?: number }
const WRAPPERS = new Map<string, Wrapper>([
  ['env', { values: 'uCSa', long: ['unset', 'chdir', 'split-string', 'argv0'] }],
  [
    'sudo',
    { values: 'CDgprtTRUu', long: ['chdir', 'chroot', 'close-from', 'command-timeout', 'group', 'host', 'other-user', 'prompt', 'role', 'type', 'user'] },
  ],
  ['doas', { values: 'uCa' }],
  ['nice', { values: 'n', long: ['adjustment'] }],
  ['ionice', { values: 'cnpPu', long: ['class', 'classdata', 'pid', 'pgid', 'uid'] }],
  ['timeout', { values: 'sk', long: ['signal', 'kill-after'], before: 1 }],
  ['stdbuf', { values: 'ioe', long: ['input', 'output', 'error'] }],
  ['time', { values: 'fo', long: ['format', 'output'] }],
  ['xargs', { values: 'aEILnPsd', long: ['arg-file', 'delimiter', 'max-args', 'max-chars', 'max-procs', 'process-slot-var'] }],
  ['exec', { values: 'a' }],
  ...['nohup', 'setsid', 'command', 'builtin', 'busybox', 'coproc'].map(w => [w, {}] as [string, Wrapper]),
])
const ASSIGNMENT = /^([A-Za-z_]\w*)(\+?)=(.*)$/s
// A VAR=value word as the variable it sets and its value. VAR+=more appends to the value VAR holds when the line
// runs, which the guard cannot read ahead, so the value it records starts with $VAR.
const assigns = (w: string): [string, string] | undefined => {
  const m = ASSIGNMENT.exec(w)
  return m ? [m[1]!, m[2] ? `$${m[1]}${m[3]}` : m[3]!] : undefined
}

const base = (w: string) => w.slice(w.lastIndexOf('/') + 1) // /usr/bin/git is git
const unread = (w: string) => /[$`\u0001]|^~/.test(w) // a word the shell expands, so the guard cannot read it ahead
const quote = (w: string) => `'${w.replace(/'/g, "'\\''")}'`
// A directory `to` reached from `here` (undefined when the guard cannot tell where `here` is).
const join = (here: string | undefined, to: string) => (to.startsWith('/') ? to : here === undefined ? undefined : here === '.' ? to : `${here}/${to}`)

// The command past its VAR= words, reserved words and wrappers: its words from its name on, the VAR= words it
// runs with, the directory a wrapper moves it to (env -C, sudo -D; null when the guard cannot tell), whether it
// runs in a process of its own (so a cd there does not move the shell), whether xargs adds words to it, and the
// string env -S splits into it.
export function unwrap(words: string[]) {
  const env: Record<string, string> = {}
  let dir: string | null | undefined
  let process = false
  let xargs = false
  let script: string | undefined
  let k = 0
  const into = (d: string) => (dir = dir === null || unread(d) ? null : d.startsWith('/') || dir === undefined ? d : `${dir}/${d}`)
  while (k < words.length) {
    const w = words[k]!
    const assignment = assigns(w)
    const wrapper = WRAPPERS.get(base(w))
    if (assignment) env[assignment[0]] = assignment[1]
    else if (RESERVED.has(w)) {
      // a reserved word: the command follows it
    } else if (w === 'function') k++ // function NAME: its body follows
    else if (wrapper) {
      process ||= !['command', 'builtin', 'time'].includes(w)
      xargs ||= base(w) === 'xargs'
      if (base(w) === 'coproc' && /^([{(]|if|while|until|for|select|case)$/.test(words[k + 2] ?? '')) k++ // coproc NAME { … }
      let before = wrapper.before ?? 0
      for (k++; k < words.length; k++) {
        const o = words[k]!
        let opt = ''
        let value: string | undefined
        if (o === '--') {
          k++
          break
        } else if (base(w) === 'env' && o === '-') {
          // env - empties the environment, as -i does
        } else if (base(w) === 'env' && assigns(o)) {
          const [name, given] = assigns(o)!
          env[name] = given
        } else if (o.startsWith('--')) {
          const name = o.slice(2).split('=')[0]!
          opt = (name && wrapper.long?.find(l => l.startsWith(name))) || ''
          value = o.includes('=') ? o.slice(o.indexOf('=') + 1) : opt ? words[++k] : undefined
        } else if (o.startsWith('-') && o.length > 1) {
          // A bundle of letters: the first that takes a value takes the rest of the word, or the next word.
          const at = [...o.slice(1)].findIndex(l => wrapper.values?.includes(l))
          if (at >= 0) {
            opt = o.charAt(at + 1)
            value = o.slice(at + 2) || words[++k]
          }
        } else if (before-- <= 0) break
        if (['C', 'D', 'chdir'].includes(opt)) into(value ?? '')
        if (['R', 'chroot'].includes(opt)) dir = null
        if (['S', 'split-string'].includes(opt)) script = value ?? ''
      }
      continue
    } else break
    k++
  }
  return { words: words.slice(k), env, dir, process, xargs, script }
}

// One git push: its words after `push`, git's own options before it, where it runs (a directory, or undefined
// when the guard cannot tell which repository it is in), the variables the guard hands to the git it asks (those
// of its VAR= words that locate the repository and its settings), and why the guard cannot read it at all.
export type Push = { args: string[]; git: string[]; cwd?: string; env: Record<string, string>; unknown?: string; changes?: Changes; alias?: string }

// Every git push in a command line, wherever it stands: after a cd, VAR= words or a wrapper, inside ( ), $( ) or
// ` `, in a bash -c script or eval's words, or in a heredoc that a shell reads.
export function pushes(line: string): Push[] {
  return walk(split(line), '.', { heads: [], fresh: [] }).found
}

// Shells, which run a script: their -c words, or what they read on standard input. (eval runs its words.)
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'mksh', 'ash', 'yash', 'fish'])
// Commands that set variables, and the variables that may decide which repository and settings git reads.
const EXPORTS = new Set(['export', 'declare', 'typeset', 'local', 'readonly'])
const LOCATES = (name: string) => name.startsWith('GIT_') || ['HOME', 'XDG_CONFIG_HOME', 'CDPATH'].includes(name)
// Of those, the ones the guard hands to the git it asks, as the line writes them: they say which repository and
// which settings files git reads. That git runs before the person has approved the line, so nothing else the line
// sets reaches it (not PATH, LD_PRELOAD, GIT_TRACE or GIT_SSH_COMMAND).
const HANDED = /^(GIT_DIR|GIT_WORK_TREE|GIT_COMMON_DIR|GIT_CONFIG_(GLOBAL|SYSTEM|NOSYSTEM|COUNT|KEY_\d+|VALUE_\d+)|HOME|XDG_CONFIG_HOME)$/
// Variables that change the program that runs or what it loads: a push whose line sets one is refused, for the
// guard cannot read ahead what that program does.
const LOADS = (name: string) => /^(PATH|GIT_EXEC_PATH|LD_\w+|DYLD_\w+)$/.test(name)
// Commands that run another from their words, which the guard does not read: any git push in them is refused.
const RUNNERS = new Set([
  ...['flock', 'watch', 'strace', 'ltrace', 'script', 'su', 'runuser', 'sg', 'chroot', 'ssh', 'unbuffer', 'parallel'],
  ...['firejail', 'nsenter', 'unshare', 'chrt', 'taskset', 'numactl', 'proxychains', 'proxychains4', 'torsocks'],
  ...['fakeroot', 'faketime', 'valgrind', 'systemd-run', 'tmux', 'screen', 'xvfb-run', 'dbus-run-session'],
])
// Compound commands open at these words and close at fi, done, esac or }; the loops among them run their body again.
const OPENS = new Set(['if', 'while', 'until', 'for', 'select', 'case', '{'])
const CLOSES = new Set(['fi', 'done', 'esac', '}'])
const LOOPS = new Set(['while', 'until', 'for', 'select'])

// Git settings in the environment can define an alias, so a git command that is not push may run one.
const configures = (vars: Record<string, string>) =>
  Object.entries(vars).some(([key, value]) => key === 'GIT_CONFIG_PARAMETERS' || (/^GIT_CONFIG_KEY_\d+$/.test(key) && (/alias/i.test(value) || unread(value))))

// Where the shell is as it runs each command, as far as the guard can follow it, in one ( ) or the line itself.
// A list is the commands joined by && and ||, up to ; & or a newline.
type Frame = {
  here?: string // where the next command runs
  start?: string // where this list began
  moved?: 'sure' | 'unsure' // a command in this list moved the shell; surely, when it began the list
  first: boolean // the next command begins the list
  or: boolean // an || came earlier in this list
  fallback?: { to?: string; ran: boolean } // after cd x ||, where the shell is unless something other than exit ran
}

// The rule for a cd (or pushd, popd, eval cd, source, export GIT_DIR=): it moves the commands after it only when
// the shell surely keeps the move, that is when it begins its list or follows only &&, outside a pipeline, a
// compound command (if, a loop, case, { }) and a function, and not through a wrapper that starts a process.
// Any other move leaves the guard unable to tell where later pushes run, and those it refuses. A list run with &
// leaves the shell where it was. `outer` holds the variables a command that runs this script sets for it (the
// VAR= words before bash -c, eval, env -S or source), which every command in the script runs with.
function walk(parts: Part[], start: string | undefined, changes: Changes, outer: Record<string, string> = {}): { found: Push[]; here: string | undefined } {
  const found: Push[] = []
  const frames: Frame[] = [{ here: start, start, first: true, or: false }]
  const open: { word: string; at: number; parens: number }[] = [] // compound commands open here
  let blind = false // a function or an alias is defined: the guard cannot tell where its pushes run
  const frame = () => frames[frames.length - 1]!
  const close = (background: boolean) => {
    const f = frame()
    if (f.moved && background) f.here = f.start
    else if (f.moved === 'unsure' || f.fallback?.ran) f.here = undefined
    else if (f.fallback) f.here = f.fallback.to
    Object.assign(f, { start: f.here, moved: undefined, first: true, or: false, fallback: undefined })
  }
  const move = (to: string | undefined, sure: boolean) => {
    const f = frame()
    if (sure && !open.length && !f.or) {
      f.moved = f.first && !f.moved ? 'sure' : 'unsure'
      f.here = to
    } else {
      f.moved = 'unsure'
      f.here = undefined
      for (const push of found.slice(open[0]?.at ?? found.length)) push.cwd = undefined // a loop may run them after it
    }
  }
  // The words that reach parts[n] as a script it reads: those of the commands piped into it, and of a <( )
  // right after it (bash <(echo …)).
  // What a command prints into a pipe, as the shell reads it: its arguments as one line (echo git push -f | bash is the
  // script `git push -f`, not three scripts), and any heredoc it was given (cat <<EOF | bash).
  const prints = (c: Command) => [...c.stdin, c.words.slice(1).join(' ')]
  const feeds = (n: number) => {
    const scripts: string[] = []
    for (let j = n - 1; parts[j] === '|' && typeof parts[j - 1] === 'object'; j -= 2) scripts.push(...prints(parts[j - 1] as Command))
    if (parts[n + 1] === '(')
      for (let j = n + 2, depth = 0; j < parts.length && !(parts[j] === ')' && depth-- === 0); j++) {
        const p = parts[j]!
        if (p === '(') depth++
        else if (typeof p === 'object') scripts.push(...prints(p))
      }
    return scripts
  }
  const command = (part: Command, n: number) => {
    const f = frame()
    const piped = parts[n - 1] === '|' || parts[n + 1] === '|'
    const here = blind ? undefined : f.here
    const head = part.words[0] ?? ''
    if (CLOSES.has(head)) open.pop()
    for (const w of head === 'function' ? part.words.slice(2) : part.words) {
      if (OPENS.has(w)) open.push({ word: w, at: found.length, parens: 0 })
      else if (!['!', 'then', 'else', 'elif', 'do', 'time'].includes(w)) break
    }
    if (head === 'function' || (part.words.length === 1 && parts[n + 1] === '(' && parts[n + 2] === ')')) blind = true
    // $( ) and ` ` run in the shell's own variables, before the command's VAR= words take hold.
    for (const script of part.nested) found.push(...walk(script, here, changes, outer).found)
    const { words, env: own, dir, process, xargs, script } = unwrap(part.words)
    const env = { ...outer, ...own } // what the command runs with: the variables set for its script, then its own
    const name = base(words[0] ?? '')
    const there = dir === undefined ? here : dir === null ? undefined : join(here, dir)
    const unknown = (why: string) => found.push({ args: [], git: [], env: {}, unknown: why })
    // A script the command runs (bash -c, env -S, source) runs with its variables; a trap or an alias runs later, in
    // the shell's own.
    const inside = (text: string, at: string | undefined, vars = env) => walk(split(text), at, changes, vars).found
    if (f.fallback && name !== 'exit' && name !== 'return') f.fallback.ran = true
    if (configures(env)) unknown('it sets git settings in its environment (GIT_CONFIG_…)')

    if (script !== undefined) found.push(...inside([script, ...words.map(quote)].join(' '), there))
    else if (['cd', 'pushd', 'popd'].includes(name)) move(target(here, words, env), !process && !piped)
    else if (name === 'eval') {
      const run = walk(split(words.slice(1).join(' ')), here, changes, env)
      found.push(...run.found)
      if (run.here !== here) move(run.here, !process && !piped)
    } else if (name === 'source' || name === '.') {
      for (const s of [...part.stdin, ...feeds(n)]) found.push(...inside(s, here))
      move(undefined, !piped) // a script may cd
    } else if (SHELLS.has(name)) for (const s of [...scripts(words, part.stdin), ...feeds(n)]) found.push(...inside(s, there))
    else if (name === 'git' || name === 'git-push') found.push(...git(words, there, env, xargs, changes))
    else if (name === 'alias') {
      blind = true
      for (const w of words.slice(1)) found.push(...inside(w.slice(w.indexOf('=') + 1), undefined, outer))
    } else if (name === 'trap' && words[1] && !words[1].startsWith('-')) found.push(...inside(words[1], undefined, outer))
    else if (EXPORTS.has(name) || !words.length) {
      // VAR=value alone, or export (and its kin): the variables hold for the rest of the shell.
      const vars: Record<string, string> = words.length ? {} : { ...own }
      for (const w of words.slice(1).filter(w => !w.startsWith('-'))) {
        const [key, value] = assigns(w) ?? [w, '']
        vars[key] = value
      }
      if (words.length && configures(vars)) unknown('it sets git settings in its environment (GIT_CONFIG_…)')
      if (Object.values(vars).some(v => /git|push/i.test(v))) changes.names = true // a variable that holds git or push may be run as a command later on the line
      if (Object.keys(vars).some(LOCATES)) move(undefined, !piped)
      changes.loads ??= Object.keys(vars).find(LOADS)
    } else if (name === 'find') {
      for (let j = 1; j < words.length; j++)
        if (/^-(exec|execdir|ok|okdir)$/.test(words[j]!)) {
          let e = j + 1
          while (e < words.length && words[e] !== ';' && words[e] !== '+') e++
          const runs = walk([{ words: words.slice(j + 1, e), nested: [], stdin: [] }], undefined, changes).found
          if (runs.length) unknown('it runs git push through find, which the guard does not read')
          j = e
        }
    } else if (RUNNERS.has(name)) {
      // Each word may be a script (su -c '…'), and the words from git or a shell on may be the command it runs.
      const carried = words.slice(1).some((w, j) => {
        const rest = words.slice(j + 1)
        return inside(w, undefined).length || (['git', 'git-push', 'eval', ...SHELLS].includes(base(w)) && inside(rest.map(quote).join(' '), undefined).length)
      })
      if (carried) unknown(`it runs git push through ${name}, which the guard does not read`)
    } else if (unread(words[0] ?? '')) {
      // A command named by an expansion may be git: refused when its words name push, or git, or when a variable the line set holds either.
      if (words.some(w => w.includes('push') || w.toLowerCase().includes('git')) || changes.names) unknown('it runs a command named by an expansion')
    } else if (!['echo', 'printf'].includes(name) && words.some((w, j) => j > 0 && (base(w) === 'git' || unread(w)) && words[j + subcommand(words.slice(j))] === 'push'))
      unknown(`it runs git push through ${name}, which the guard does not read`)

    // A loop runs its body again, so a push earlier in it runs after what the commands after it change too.
    const loop = open.find(o => LOOPS.has(o.word))
    if (loop)
      for (const push of found.slice(loop.at))
        if (push.changes) {
          push.changes = seen(changes)
          if (changes.loads) push.unknown ??= loading(changes.loads)
        }
  }

  for (let n = 0; n < parts.length; n++) {
    const part = parts[n]!
    const f = frame()
    const kase = open[open.length - 1]?.word === 'case' ? open[open.length - 1] : undefined
    if (part === '(') {
      if (kase) kase.parens++
      if (f.fallback) f.fallback.ran = true
      frames.push({ here: f.here, start: f.here, first: true, or: false })
    } else if (part === ')') {
      if (kase && kase.parens-- === 0) kase.parens = 0 // the ) that ends a case pattern
      else {
        if (frames.length > 1) frames.pop()
        frame().first = false
      }
    } else if (part === ';') close(false)
    else if (part === '&') close(true)
    else if (part === '&&') f.first = false
    else if (part === '||') {
      f.first = false
      f.or = true
      if (f.moved && !f.fallback) f.fallback = { to: f.here, ran: false }
      if (f.moved) f.here = undefined // what follows || runs when something before it failed, a cd perhaps
    } else if (part !== '|') command(part, n)
  }
  close(false)
  return { found, here: frames[0]!.here }
}

// Where a cd, pushd or popd moves the shell: undefined when the guard cannot follow (cd alone, cd -, ~, $DIR,
// popd, a CDPATH set on the line).
function target(here: string | undefined, words: string[], env: Record<string, string>) {
  const args = words.slice(1).filter(w => w !== '--' && !/^-[LPe@]+$/.test(w))
  const to = args[0]
  if (base(words[0]!) === 'popd' || 'CDPATH' in env || args.length !== 1 || to === undefined || /^[-+]/.test(to) || unread(to)) return undefined
  return join(here, to)
}

// The scripts a shell runs: with -c (alone or in a bundle such as -lc), each word after the shell's options (the
// script and its arguments, read alike); else what it reads on standard input.
function scripts(words: string[], stdin: string[]) {
  const args = words.slice(1)
  return args.some(w => /^-[A-Za-z]*c[A-Za-z]*$/.test(w)) ? [...args.filter(w => !/^[-+]/.test(w)), ...stdin] : stdin
}

// git's own options come before its subcommand; these take the next word as their value.
const GIT_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--attr-source'])
const subcommand = (words: string[]) => {
  let k = 1
  while (words[k]?.startsWith('-')) k += GIT_VALUE.has(words[k]!) ? 2 : 1
  return k
}

// A git command (or git-push by its path), as the push it is: none when its subcommand is not push and cannot
// become one. Its repository is unknown when the guard cannot tell where it runs, or git's options or the VAR=
// words that say where git looks (GIT_DIR=, HOME= and the like) hold an expansion. A push run with PATH,
// GIT_EXEC_PATH or an LD_ or DYLD_ variable set (on it, or earlier on the line) is unknown too. The git the guard
// asks is handed the VAR= words that locate the repository and its settings, and no other. A push carries what
// the git commands before it on the line change.
function git(words: string[], here: string | undefined, env: Record<string, string>, xargs: boolean, changes: Changes): Push[] {
  if (base(words[0]!) === 'git-push') words = ['git', 'push', ...words.slice(1)]
  const k = subcommand(words)
  const sub = words[k] ?? ''
  const options = words.slice(1, k)
  const args = words.slice(k + 1)
  let unknown: string | undefined
  let aliased: string | undefined // a subcommand git may know as an alias in a config file: judge() looks it up
  // An alias this very line made (git config alias.p "push -f"; git p): read as the command it stands for, so it is judged as one.
  const made = sub === 'push' ? undefined : changes.alias?.[sub.toLowerCase()]
  if (made !== undefined && !unread(made))
    return walk(split(`${made.startsWith('!') ? made.slice(1) : `git ${made}`} ${args.map(quote).join(' ')}`), here, changes, env).found
  if (sub !== 'push') {
    if (options.some(o => o.toLowerCase().includes(`alias.${sub.toLowerCase()}=`))) unknown = 'it runs a git alias set on the command line'
    else if (made !== undefined) unknown = 'it runs a git alias this line just made, and the guard cannot read it'
    else if (unread(sub)) unknown = 'its git subcommand is an expansion'
    else if (xargs && !QUIET.has(sub)) unknown = 'xargs may put push where its git subcommand is'
    else if (options.some((o, j) => unread(o) && /^(-c|--config-env)$/.test(options[j - 1] ?? ''))) unknown = 'it sets a git setting the guard cannot read'
    else if (runs(sub, args).some(s => walk(split(s), undefined, changes).found.length)) unknown = `it runs git push through git ${sub}`
    else if (/^(send-pack|http-push)$/.test(sub) || (sub === 'subtree' && args.includes('push'))) unknown = `git ${sub} pushes in a way the guard does not read`
    else {
      note(sub, args, changes)
      if (QUIET.has(sub) || NOTED.has(sub)) return [] // a command git has itself: an alias cannot stand in for it
      aliased = sub
    }
  } else if (xargs) unknown = 'xargs adds words to it'
  const loads = Object.keys(env).find(LOADS) ?? changes.loads
  if (loads) unknown ??= loading(loads)
  const located = here !== undefined && !options.some(unread) && !Object.entries(env).some(([key, value]) => LOCATES(key) && unread(value))
  const handed = Object.fromEntries(Object.entries(env).filter(([key, value]) => HANDED.test(key) && !unread(value)))
  return [{ args, git: options, cwd: located ? here : undefined, env: handed, unknown, changes: seen(changes), alias: aliased }]
}
const loading = (name: string) => `it sets ${name}, which changes the program that runs or what it loads`

// The commands a git command runs: rebase's --exec (-x), submodule foreach's and bisect run's.
function runs(sub: string, args: string[]) {
  if (sub === 'rebase') return args.flatMap((a, j) => (/^(-x|--exec)$/.test(a) ? [args[j + 1] ?? ''] : a.startsWith('--exec=') ? [a.slice(7)] : []))
  const at = args.indexOf(sub === 'submodule' ? 'foreach' : sub === 'bisect' ? 'run' : '')
  if (at < 0) return []
  // foreach hands its words to a shell as one script; bisect run runs its words as they are.
  return [sub === 'bisect' ? args.slice(at + 1).map(quote).join(' ') : args.slice(at + 1).filter(a => !a.startsWith('-')).join(' ')]
}

// What the commands earlier on a line change before a later push runs, for the guard asks git before the line
// runs: the branches the line may check out (UNREAD when the guard cannot tell which), the branches whose
// upstream it may set ('HEAD' for the one checked out), why the settings git reports may be stale by then, and a
// variable the line sets for the shell that changes the program that runs (PATH=, export LD_PRELOAD=).
type Changes = { heads: string[]; fresh: string[]; stale?: string; loads?: string; alias?: Record<string, string>; names?: boolean }
// What a push carries: the changes made so far, as they stand when it is found.
const seen = (changes: Changes): Changes => ({ heads: [...changes.heads], fresh: [...changes.fresh], stale: changes.stale })
const UNREAD = WILD
// git subcommands that change none of these.
const QUIET = new Set(
  [
    ...['', 'add', 'am', 'annotate', 'apply', 'archive', 'bisect', 'blame', 'bundle', 'cat-file', 'check-attr', 'check-ignore'],
    ...['check-mailmap', 'check-ref-format', 'cherry', 'cherry-pick', 'clean', 'clone', 'commit', 'commit-graph', 'commit-tree'],
    ...['count-objects', 'credential', 'describe', 'diff', 'diff-files', 'diff-index', 'diff-tree', 'difftool', 'fetch'],
    ...['for-each-ref', 'format-patch', 'fsck', 'gc', 'grep', 'hash-object', 'help', 'init', 'lfs', 'log', 'ls-files', 'ls-remote'],
    ...['ls-tree', 'maintenance', 'merge', 'merge-base', 'mergetool', 'mktag', 'mktree', 'mv', 'name-rev', 'notes', 'pack-refs'],
    ...['prune', 'pull', 'range-diff', 'read-tree', 'reflog', 'repack', 'replace', 'request-pull', 'reset', 'restore', 'rev-list'],
    ...['rev-parse', 'revert', 'rm', 'shortlog', 'show', 'show-branch', 'show-ref', 'sparse-checkout', 'stage', 'stash', 'status'],
    ...['submodule', 'tag', 'update-index', 'update-ref', 'var', 'verify-commit', 'verify-pack', 'verify-tag', 'version'],
    ...['whatchanged', 'worktree', 'write-tree'],
  ],
)
// git commands that note() reads one by one (and that no alias can shadow).
const NOTED = new Set(['checkout', 'switch', 'rebase', 'branch', 'symbolic-ref', 'config', 'remote'])
// The name that a flag of `shorts` (or a long option spelling or abbreviating one of `longs`) takes, wherever git
// reads it from: `-b NAME`, `-bNAME`, `-fbNAME` (a bundle ends at the flag that takes a value), `--orphan NAME`,
// `--orphan=NAME`. found is false when no such flag is there; name is undefined when one is but its value is missing.
function flagValue(args: string[], shorts: string, longs: string[]): { found: boolean; name?: string } {
  for (let k = 0; k < args.length; k++) {
    const a = args[k]!
    if (a === '--') break
    if (a.startsWith('--')) {
      if (a === '--force' || !spells(a, ...longs)) continue // --force is its own option, not a prefix of --force-create
      return { found: true, name: a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[k + 1] }
    }
    if (!a.startsWith('-') || a.length < 2) continue
    for (let j = 1; j < a.length; j++) {
      if (shorts.includes(a[j]!)) return { found: true, name: a.slice(j + 1) || args[k + 1] }
    }
  }
  return { found: false }
}
function note(sub: string, args: string[], changes: Changes) {
  const named = args.filter(a => !a.startsWith('-'))
  const head = (b: string) => changes.heads.push(unread(b) ? UNREAD : b)
  const stale = (why: string) => (changes.stale ??= why)
  if (sub === 'checkout' || sub === 'switch') {
    // -b NAME (and its kin) makes and checks out NAME; one word alone is the branch checked out (or a path, or a
    // remote branch the new branch of its last part tracks); - is the branch before, which the guard cannot read.
    const create = flagValue(args, 'bBcC', ['orphan', 'create', 'force-create'])
    if (create.found) {
      const made = create.name ?? UNREAD
      head(made)
      changes.fresh.push(made)
    } else if (args.includes('-') || args.some(a => a.startsWith('@{'))) changes.heads.push(UNREAD)
    else if (named.length === 1 && !args.includes('--')) {
      for (const b of new Set([named[0]!, named[0]!.replace(/^[^/]*\//, '')])) head(b)
      changes.fresh.push(...named)
    }
  } else if (sub === 'rebase') {
    if (named.length >= 2) head(named[named.length - 1]!) // rebase UPSTREAM BRANCH checks BRANCH out first
  } else if (sub === 'branch') {
    // Making, moving or copying a branch, or setting an upstream, may give a branch an upstream; -m and -c may
    // rename the branch checked out.
    const upstream = args.some(a => /^(-u|-t|--track|--set-upstream-to|--unset-upstream)/.test(a))
    // -m, -M, -c and -C take no value in git: the names are the words after the options, so -mf is -m -f. A bundle
    // that ends in the flag with a name stuck on (-Mmain, which git rejects) is read as that name, to stay on the safe side.
    const flag = flagValue(args, 'mMcC', ['move', 'copy'])
    const stuck = flag.found && !named.length && flag.name && !flag.name.startsWith('-') ? [flag.name] : []
    const target = [...named, ...stuck]
    const moved = flag.found
    if (args.some(a => /^(-[dD]|--delete)$/.test(a)) || (!target.length && !upstream)) return
    changes.fresh.push('HEAD', ...target)
    if (moved && target.length) head(target[target.length - 1]!)
  } else if (sub === 'symbolic-ref') {
    if (args.some(a => /^(-d|--delete)$/.test(a)) || named.length < 2) return
    if (named[0] === 'HEAD') head(branch(named[1]!))
    else stale('git symbolic-ref on this line makes one branch a name for another')
  } else if (sub === 'config') {
    const writes = named.length >= 2 || args.some(a => /^(--add|--unset|--unset-all|--replace-all|--rename-section|--remove-section|-e|--edit)$/.test(a))
    const al = named.findIndex(w => /^alias\./i.test(w))
    if (writes && al >= 0) (changes.alias ??= {})[named[al]!.slice(6).toLowerCase()] = named[al + 1] ?? UNREAD
    if (writes && (args.some(a => /^(-e|--edit)$/.test(a)) || named.some(w => /^(push|branch|remote|alias|include)/i.test(w) || unread(w))))
      stale('git config on this line changes the settings that decide where a push goes')
  } else if (sub === 'remote') {
    if (args.some(a => a.startsWith('--mirror')) || named[0] === 'rename') stale('git remote on this line changes the settings that decide where a push goes')
  } else if (!QUIET.has(sub)) {
    changes.heads.push(UNREAD)
    stale(`git ${sub} is not a git command the guard knows (an alias, perhaps)`)
  }
}

// 3. The judgement.

const FORCE = 'a force push rewrites history other people may already have'
// A long option `o` names one of `names` when it spells it or a prefix of it: git takes --force-w for
// --force-with-lease and --mir for --mirror.
const spells = (o: string, ...names: string[]) => o.startsWith('--') && o.length > 2 && names.some(n => n.startsWith(o.slice(2).split('=')[0]!))
// --force, --force-with-lease[=...] or a prefix of either; -f alone or in a bundle (-uf), before any -o.
const forces = (o: string) => (o.startsWith('--') ? spells(o, 'force', 'force-with-lease') : /^-[^o]*f/.test(o))

// What a push's words name: its options, the refspecs after the remote, and whether they are branches to delete.
export function parse(args: string[]) {
  const options: string[] = []
  const positional: string[] = []
  for (let k = 0; k < args.length; k++) {
    const a = args[k]!
    if (a === '--') {
      positional.push(...args.slice(k + 1))
      break
    }
    if (!a.startsWith('-') || a === '-') positional.push(a)
    else {
      options.push(a)
      // -o, --push-option, --repo, --receive-pack, --exec and --recurse-submodules take the next word as a value.
      if (/^-[^-o]*o$/.test(a) || (!a.includes('=') && spells(a, 'push-option', 'repo', 'receive-pack', 'exec', 'recurse-submodules'))) k++
    }
  }
  const deletes = options.some(o => spells(o, 'delete') || /^-[^-o]*d/.test(o))
  return { options, refspecs: positional.slice(1), deletes }
}

// What a refspec writes on the remote: what follows its last colon (git splits there), all of it when it has none.
const destination = (spec: string) => spec.slice(spec.lastIndexOf(':') + 1)
const branch = (ref: string) => ref.replace(/^(refs\/)?heads\//, '')

// What git says about a push's repository: the branch checked out (none when detached), the settings that
// decide where a push goes, one `key value` per line, and the branches that are symbolic refs to another.
export type Repo = { head?: string; config: string[]; symrefs?: Record<string, string> }
const values = (config: string[], key: string) => config.filter(l => l.startsWith(`${key} `)).map(l => l.slice(key.length + 1))

// Where a branch named without a destination really goes: its own name, the branch a symbolic ref names, where
// remote.<name>.push maps it (forced when that setting starts with +), and its upstream when push.default is
// upstream or tracking. HEAD (or @) is the branch checked out when the push runs (`current`). A name that is not
// a full ref is read as each ref it could be.
function lands(name: string, { config, symrefs = {} }: Repo, current: string[]) {
  if (name === 'HEAD' || name === '@') return { to: current, forced: false }
  const upstream = /^(upstream|tracking)$/.test(values(config, 'push.default').pop() ?? '')
  const to: string[] = []
  let forced = false
  for (const src of name.startsWith('refs/') ? [name] : ['', 'tags/', 'heads/', 'remotes/'].map(p => `refs/${p}${name}`)) {
    to.push(symrefs[src] ?? src)
    for (const spec of config.filter(l => /^remote\.\S+\.push /.test(l)).map(l => l.slice(l.indexOf(' ') + 1))) {
      const rule = spec.replace(/^\+/, '')
      const [from, into] = [rule.slice(0, rule.lastIndexOf(':')), destination(rule)]
      const [pre, post = ''] = from.split('*')
      const wild = from.includes('*') && src.startsWith(pre!) && src.endsWith(post) && src.length >= from.length - 1
      if (!rule.includes(':') || rule.startsWith('^') || !into || (from !== src && !wild)) continue
      to.push(wild ? into.replace('*', src.slice(pre!.length, src.length - post.length)) : into)
      forced ||= spec.startsWith('+')
    }
    if (upstream && src.startsWith('refs/heads/')) to.push(...values(config, `branch.${src.slice(11)}.merge`))
  }
  return { to, forced }
}

// Why a push may not go, or undefined when it may. `ask` asks git about the push's repository, and is called when
// where the push goes depends on git's settings: it names no branch, or names one without saying where it goes.
export async function judge(push: Push, ask: () => Promise<Repo>, depth = 0): Promise<string | undefined> {
  if (push.unknown) return `${push.unknown}, so the guard cannot tell where it goes`
  if (push.alias !== undefined) {
    // A git subcommand the guard does not know may be an alias in a config file: ask git, and judge what it stands for.
    if (push.cwd === undefined) return `git ${push.alias} may be an alias, and the guard cannot locate the repository to look it up; cd there by a plain path`
    if (depth >= 5) return `git aliases nest too deep (${push.alias}) for the guard to read ahead`
    const value = values((await ask()).config, `alias.${push.alias.toLowerCase()}`).pop()
    if (value === undefined) return undefined // not an alias: some other program git runs
    const rest = push.args.map(quote).join(' ')
    for (const p of pushes(value.startsWith('!') ? `${value.slice(1)} ${rest}` : `git ${value} ${rest}`)) {
      if (p.git.length) return `the alias ${push.alias} runs git with options, which the guard does not read ahead`
      const why = await judge(p, ask, depth + 1)
      if (why) return why
    }
    return undefined
  }
  if (push.args.some(unread)) return 'it holds an expansion ($, `, ~, a brace or a glob) the guard cannot read ahead; spell it out'
  const { options, refspecs, deletes } = parse(push.args)
  if (options.some(forces) || refspecs.some(r => r.startsWith('+'))) return FORCE
  const every = options.find(o => spells(o, 'all', 'branches', 'mirror'))
  if (every) return `${every} pushes every branch, main included`
  if (refspecs.includes(':')) return 'the refspec : pushes every branch that matches, main included'
  const targets = refspecs.map(r => (deletes ? r : destination(r)))
  if (targets.some(t => t.includes('*') && !/^refs\/(?!heads\/)[^/*]+\//.test(t))) return 'a pattern refspec can reach main'
  const named = targets.map(branch).find(b => PROTECTED.has(b))
  if (named) return `${named} takes changes through a pull request, not a push`
  const loose = deletes ? [] : refspecs.filter(r => !r.includes(':') && !r.includes('*')) // branches named without a destination
  if (refspecs.length ? !loose.length : options.includes('--tags')) return undefined // where each goes is written out, or tags alone
  if (push.cwd === undefined) return 'where it goes depends on the settings of a repository the guard cannot locate; cd there by a plain path'
  // git is asked before the line runs, so what the line's earlier git commands change comes from the line itself.
  const { heads = [], fresh = [], stale } = push.changes ?? {}
  if (stale) return `${stale}, so the guard cannot read ahead where this push goes; push in a call of its own`
  if ((!refspecs.length || loose.some(n => n === 'HEAD' || n === '@')) && heads.some(unread))
    return 'an earlier command on this line checks out a branch the guard cannot read, so it cannot tell where this push goes'
  const repo = await ask()
  if (!refspecs.length) {
    // With no refspec, settings decide: a remote's push or mirror, push.default=matching, the branch's upstream.
    // (git reads a boolean written with no value as true, and an empty one as false.)
    const setting = repo.config.find(l => /^remote\.\S+\.push /.test(l) || /^remote\.\S+\.mirror (?!(false|no|off|0)?$)/i.test(l))
    if (setting) return `${setting.split(' ')[0]} decides where it goes; name the branch`
    if (values(repo.config, 'push.default').pop() === 'matching') return 'push.default=matching pushes main too'
  }
  // The branch checked out when the push runs: the one now, or one the line checks out before it.
  const current = [...new Set([repo.head ?? '', ...heads])].filter(Boolean)
  const upstream = /^(upstream|tracking)$/.test(values(repo.config, 'push.default').pop() ?? '')
  const unsure = (b: string) => fresh.includes(b) || (fresh.includes('HEAD') && current.includes(b)) // its upstream may change
  const sent = refspecs.length ? loose.filter(n => n !== 'HEAD' && n !== '@').map(branch) : current
  if (upstream && sent.some(unsure)) return 'push.default=upstream sends it to an upstream this line sets, which the guard cannot read ahead'
  const goes = refspecs.length
    ? loose.map(n => lands(n, repo, current))
    : current.map(b => ({ to: [b, ...values(repo.config, `branch.${b}.merge`)], forced: false }))
  if (goes.some(g => g.forced)) return FORCE
  const hit = goes.flatMap(g => g.to).map(branch).find(b => PROTECTED.has(b))
  if (hit && heads.length && hit === repo.head && !heads.includes(hit))
    return `${hit} is checked out now, and the guard cannot be sure the line moves off it before this push; name the branch to push`
  if (hit && heads.includes(hit) && !refspecs.some(r => branch(destination(r)) === hit))
    return `the line checks out ${hit} before this push, and ${hit} takes changes through a pull request; name the branch to push`
  return hit ? `${hit} takes changes through a pull request, not a push` : undefined
}

// The git settings that decide where a push goes.
const SETTINGS = /^(push\.default|branch\..*\.merge|remote\..*\.(push|mirror)|alias\..+)$/
// What `git config --list -z` prints, as `key value` lines of the settings above: each entry is the key, a newline
// and the value, or the key alone for a boolean written with no value, which git reads as true.
const settings = (listed: string) =>
  listed
    .split('\0')
    .map(entry => (entry.includes('\n') ? entry.replace('\n', ' ') : `${entry} true`))
    .filter(line => SETTINGS.test(line.slice(0, line.indexOf(' '))))

// What the guard's git runs with besides the variables it is handed: trace2 off. git takes trace2's targets from the
// global and system settings files, and a line that names those files (GIT_CONFIG_GLOBAL, GIT_CONFIG_SYSTEM, or HOME
// and XDG_CONFIG_HOME) could otherwise send git's trace to a file of its choosing; these variables override them.
const UNTRACED = { GIT_TRACE2: '0', GIT_TRACE2_EVENT: '0', GIT_TRACE2_PERF: '0' }

// Why the guard throws when git cannot answer about a push it found, and what it says then: the push waits. When
// the check failed anywhere else (the line could not be read, the hook ran past its time), the command waits whole.
const UNANSWERED = 'git could not say where this push goes'
const waits = (error: { message?: string }) =>
  `guard: the check could not finish, so ${error.message === UNANSWERED ? 'the push' : 'this command'} waits. Ask the person to run it if they meant it.`

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    for (const push of pushes(e.command)) {
      const why = await judge(push, async () => {
        // Ask git, in the push's own repository, which branch is checked out (none when detached), where its
        // settings send a push, and which branches are other names for one. Each answer counts only when git exits
        // 0 with its whole output: an error, a timeout or a signal throws, and the catch below keeps the push waiting.
        const init = { cwd: push.cwd, env: { ...push.env, ...UNTRACED } }
        const run = async (...argv: string[]) => {
          const answer = await $.process.run(['git', ...push.git, ...argv], init).catch(() => undefined)
          if (answer?.exitCode !== 0 || answer.isStdoutTruncated) throw new Error(UNANSWERED)
          return answer.stdout
        }
        // The three questions do not depend on one another, so they are asked together: the push waits for the slowest
        // git, not for all three one after another. Any one failing still fails the whole check (and the push waits).
        const [head, config, refs] = await Promise.all([
          run('branch', '--show-current'),
          run('config', '--list', '-z'),
          run('for-each-ref', '--format=%(refname) %(symref)', 'refs/heads'),
        ])
        const symrefs: Record<string, string> = {}
        for (const [ref, to] of refs.split('\n').map(l => l.split(' '))) if (ref && to) symrefs[ref] = to
        return { head: head.trim() || undefined, config: settings(config), symrefs }
      })
      if (why) return { deny: `guard: ${why}.` }
    }
    return next(e)
  })
    // Fails closed: if the guard breaks before it has let the call through, the command does not run.
    .catch(($, e, next) =>
      next.called ? next(e) : { deny: waits(next.error) },
    )
}
