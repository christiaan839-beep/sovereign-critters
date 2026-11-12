#!/usr/bin/env python3
"""Writing rules the plugin directory's validation applies to a hooks module (.jsx/.tsx).

A .tsx file compiles to h(...) and Fragment, so a file that declares either name (a variable, a parameter, a
loop variable, an import) can shadow them, and the directory refuses it. Also: an agent is registered from a literal spec that leaves permissionMode out. Usage: check-directory.py [--jsx-only] <plugin folder>... (--jsx-only skips the $ and on shape rules)
Reads every .tsx/.jsx file under each folder's hooks/. Exits 1 and names file:line for each finding.

The portal also reads how the engine handle `$` and the registrar `on` are used: every call is `$.noun.method(...)`,
each registration starts its own line as `on("event", hook)`, and `$` is passed on only as the one whole argument of
a function declared at the top level of the same file. A top-level helper names its parameter something else."""
import pathlib
import re
import sys

NAMES = r'(?:h|Fragment|React|jsx|jsxs|createElement)'
DECLARES = [
    re.compile(r'\b(?:const|let|var|function|class)\s+' + NAMES + r'\b'),            # let h = 1
    re.compile(r'\b(?:const|let|var)\s*[\[{][^=;]*\b' + NAMES + r'\b[^=;]*[\]}]\s*='),  # const { h } = o
    re.compile(r'[(,]\s*' + NAMES + r'\s*(?:[:,)=?]|=>)'),                            # (a, h) or (h) => or (h: T)
    re.compile(r'(?<![\w.$])' + NAMES + r'\s*=>'),                                    # h => x
    re.compile(r'\bimport\s+(?:type\s+)?[^;]*\b' + NAMES + r'\b[^;]*\bfrom\b'),      # import { h } from
]


def strip(line):
    """The line without its strings and its // comment, so a word in either is not read as code."""
    out, quote, i = [], None, 0
    while i < len(line):
        c = line[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in '\'"`':
            quote = c
        elif line.startswith('//', i):
            break
        else:
            out.append(c)
        i += 1
    return ''.join(out)


def jsx_name_findings(text):
    """(line number, line) for each declaration of a name the JSX may compile to."""
    return [(n, raw.strip()) for n, raw in enumerate(text.splitlines(), 1) if any(p.search(strip(raw)) for p in DECLARES)]


AGENT_CALL = re.compile(r'\$\.agent\.register\(\s*(\{)?')


def agent_findings(text):
    """(line number, why) for each $.agent.register not given an object literal, or whose literal sets permissionMode.
    The directory reads the spec where it is written: a name it cannot see through leaves it unable to confirm the agent
    leaves permission decisions with the person, and the session's own mode is what applies when the field is left out."""
    found = []
    for m in AGENT_CALL.finditer(text):
        line = text.count('\n', 0, m.start()) + 1
        if not m.group(1):
            found.append((line, '$.agent.register is not given an object literal'))
            continue
        depth, i = 0, m.end(1) - 1
        while i < len(text):
            depth += {'{': 1, '}': -1}.get(text[i], 0)
            i += 1
            if depth == 0:
                break
        body = text[m.start():i]
        if re.search(r'\bpermissionMode\b', body):
            found.append((line, 'the agent spec sets permissionMode'))
        if '...' in body:
            found.append((line, 'the agent spec spreads another object into it'))
    return found

HOOK_PARAMS = re.compile(r'\(\s*\$\s*,\s*\w+\s*(?:,\s*\w+\s*)?\)\s*=>')  # ($, e, next) =>  : a hook's own parameters
SOLE_ARG = re.compile(r'\b\w+\(\s*\$\s*\)')                                        # helper($)
BARE_DOLLAR = re.compile(r'(?<![\w.$])\$(?![\w$.{/])')  # neither `${` of a template nor the `$/` of a regex is the handle


def handle_findings(text):
    """(line number, reason, line) for each use of `$` or `on` in a shape the portal cannot read."""
    out = []
    for n, raw in enumerate(text.splitlines(), 1):
        line = strip(raw)
        if re.match(r'^(?:export\s+)?(?:const|let|var|function)\b[^=(]*?\(.*\$', line) or re.match(r'^(?:export\s+)?const\s+\w+\s*=\s*(?:<[^>]*>)?\s*\([^)]*(?<![\w.$])\$(?![\w$.])', line):
            out.append((n, 'a top-level function declares a parameter named $ (name it ctx and call it with $ as its one argument)', raw.strip()))
        if re.search(r'\b(?:const|let|var)\s+\$\b', line) or re.search(r'\b(?:const|let|var)\s*[\[{][^=;]*(?<![\w.$])\$(?![\w$.])', line):
            out.append((n, 'declares a name the portal keeps for $', raw.strip()))
        if re.search(r'=\s*(?:<[^>]*,\s*>|<\w+\s*,\s*>)\s*\(', line):
            out.append((n, 'a generic arrow in a .tsx file reads as JSX: use a function declaration', raw.strip()))
        rest = SOLE_ARG.sub('x(', HOOK_PARAMS.sub('', line))
        if BARE_DOLLAR.search(rest):
            out.append((n, '$ is used other than as $.noun.method(...) or as the one whole argument of a top-level function', raw.strip()))
        if re.search(r'(?<![\w.])on\s*\(\s*\[', line):
            out.append((n, 'on() registers one event: write one on("event", hook) per event', raw.strip()))
        if re.search(r'(?<![\w.])on\b(?!\s*(?:\(|=>|:))', line) and not re.match(r'^\s*(?:export\s+)?const\s+register\b', line):
            out.append((n, 'on is aliased or passed on: call it only as on("event", hook)', raw.strip()))
    return out


def main(argv):
    jsx_only = '--jsx-only' in argv
    argv = [a for a in argv if a != '--jsx-only']
    if not argv:
        print(__doc__)
        return 2
    bad = 0
    for folder in argv:
        for path in sorted(pathlib.Path(folder, 'hooks').rglob('*')):
            if path.suffix not in ('.tsx', '.jsx'):
                continue
            text = path.read_text(encoding='utf8')
            for n, line in jsx_name_findings(text):
                bad += 1
                print(f'{path}:{n}: declares a name the JSX compiles to: {line}')
            for n, why in agent_findings(text):
                bad += 1
                print(f'{path}:{n}: {why}')

            for n, why, line in ([] if jsx_only else handle_findings(text)):
                bad += 1
                print(f'{path}:{n}: {why}: {line}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
