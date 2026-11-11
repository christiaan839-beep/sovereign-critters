#!/usr/bin/env python3
"""Every hook that sits on the tool path must fail open.

The README's first principle is that a decorative mod never blocks a tool, and CONTRIBUTING says a hook that can throw ends in
`.catch(($, e, next) => next(e))`. This makes that a check instead of advice: it lists every handler for the events below,
in every plugin but `critter-ward` (which fails closed on purpose), that is not followed by a `.catch`.

Usage: python3 tools/check-hooks.py [plugins-dir]   (exit 1 if any handler is missing its catch)
"""
import glob, os, re, sys

EVENTS = ['tool.call', 'tool.check', 'prompt.submit', 'prompt.edit', 'turn.complete', 'session.start', 'session.end']
FAILS_CLOSED = {'critter-ward'}
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'plugins')
start = re.compile(r"\n  on\('(%s)'" % '|'.join(re.escape(e) for e in EVENTS))
bad = []
for path in sorted(glob.glob(os.path.join(root, '*', 'hooks', 'register.ts*'))):
    plugin = os.path.basename(os.path.dirname(os.path.dirname(path)))
    if plugin in FAILS_CLOSED:
        continue
    text = open(path, encoding='utf-8').read()
    at = 0
    while (m := start.search(text, at)):
        end = text.find('\n  })', m.start() + 1)  # a handler is written at two spaces and closed at two spaces
        if end < 0:
            break
        if not re.match(r"\s*(//[^\n]*\n\s*)?\.catch", text[end + 5:end + 80]):
            bad.append(f"{plugin}: on('{m.group(1)}') at line {text[:m.start()].count(chr(10)) + 2} has no .catch(($, e, next) => next(e))")
        at = end + 5
for line in bad:
    print('FAIL ' + line)
sys.exit(1 if bad else 0)
