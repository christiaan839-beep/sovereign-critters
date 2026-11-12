#!/usr/bin/env python3
"""Writing rules the plugin directory's validation applies to a hooks module (.jsx/.tsx).

A .tsx file compiles to h(...) and Fragment, so a file that declares either name (a variable, a parameter, a
loop variable, an import) can shadow them, and the directory refuses it. Usage: check-directory.py <plugin folder>...
Reads every .tsx/.jsx file under each folder's hooks/. Exits 1 and names file:line for each finding."""
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


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    bad = 0
    for folder in argv:
        for path in sorted(pathlib.Path(folder, 'hooks').rglob('*')):
            if path.suffix not in ('.tsx', '.jsx'):
                continue
            for n, line in jsx_name_findings(path.read_text(encoding='utf8')):
                bad += 1
                print(f'{path}:{n}: declares a name the JSX compiles to: {line}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
