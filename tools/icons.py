#!/usr/bin/env python3
"""Draws the icons of critter-clock, critter-ledger, critter-latch and critter-seal: the critter with the one
thing each mod is about, on the family's 42 by 42 grid and palette. Standard library only, the same bytes every run.

    python3 tools/icons.py            write each plugin's .claude-plugin/icon.png
    python3 tools/icons.py --check    exit 1 if a file on disk differs from what this would write
    python3 tools/icons.py --grid N   print icon N's grid as JSON (the posters read it)
"""
import json, os, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID, BLOCK, EDGE = 42, 6, 2  # 42 * 6 + 2 * 2 = 256
PAPER = '#f1e6cf'

# the critter, as the bell and the diary draw it: the right arm is out, holding something
BODY = {'d': '#ee9d7f', 'e': '#d97757', 'f': '#fff4ea', 'g': '#141413', 'h': '#b9573a', 'j': '#8e3b25'}
BODY_ROWS = [
    '...........ddddddddddde',
    '..........ddddddddddddee',
    '..........ddefgeeeefgehh',
    '..........ddeggeeeeggehh',
    '......ddddddeggeeeeggehhdddd',
    '......eeeeddeggeeeeggehheeeh',
    '......eeeeddeeeeeeeeeehheeeh',
    '......hhhheehhhhhhhhhhhhhhhh',
    '..........eehhhhhhhhhhjj',
    '..........hj..eh..eh..hj',
    '..........hj..eh..eh..hj',
    '..........hj..eh..eh..hj',
    '..........hj..eh..eh..hj',
]
BODY_TOP = 18

ICONS = {
    # a conductor's cap and a pocket watch on its chain: the time the session has run
    'critter-clock': {
        'colors': {'n': '#2b3350', 'm': '#1b2036', 'y': '#d4a548', 'Y': '#a87d2a', 'w': '#faf9f5', 'k': '#141413', 'r': '#c0392b'},
        'parts': [(12, 10, [
            '..nnnnnnnnnn',
            '.nnnnnynnnnnn',
            '.nnnnyyynnnnn',
            '.nnnnnynnnnnn',
            '.yyyyyyyyyyyy',
            'mmmmmmmmmmmmmmmm',
        ]), (11, 27, [
            '....yy',
            '....yy',
            '...yyyy',
            '..yyyyyy',
            '.yywwwwyy',
            'yywwwkwwyy',
            'yywwwkwwyY',
            'yywwwkrrYY',
            'yywwwwwwYY',
            'yywwwwwwYY',
            '.yywwwwYY',
            '..yYYYYY',
            '...YYYY',
        ])],
    },
    # a bookkeeper's green eyeshade and an open ledger with ruled lines: the tokens, added up
    'critter-ledger': {
        'colors': {'v': '#3f8f5f', 'V': '#2c6b45', 'b': '#3f3328', 'p': '#faf9f5', 'l': '#cbc2ad', 'c': '#6b4a2e', 'C': '#4a321e', 'r': '#c0392b'},
        'parts': [(15, 9, [
            '..bbbbbbbbbbbb',
            '.bb..........bb',
            'vvvvvvvvvvvvvvvvv',
            'vvvvvvvvvvvvvvvvVV',
            '.VVVVVVVVVVVVVVVV',
        ]), (15, 28, [
            'cccccCccccc',
            'cppppCppppc',
            'cpllpCpllpc',
            'cppppCppppc',
            'cpllpCplrpc',
            'cppppCppppc',
            'cpllpCpllpc',
            'cppppCppppc',
            'cccccCccccc',
            '.CCCCCCCCC',
        ])],
    },
    # a hard hat and a brass padlock, shut: the delete that cannot be taken back, held
    'critter-latch': {
        'colors': {'y': '#e2b33a', 'Y': '#b98a1f', 'w': '#fff0b8', 's': '#3a3a42', 'S': '#5a5a66', 'g': '#d4a548', 'G': '#a87d2a', 'k': '#141413'},
        'parts': [(11, 9, [
            '.....yyyyyy',
            '...yyywyyyyyy',
            '..yywwyyyyyyyY',
            '..ywyyyyyyyyYY',
            '..yyyyyyyyyyYY',
            'yyyyyyyyyyyyyyYYY',
            'YYYYYYYYYYYYYYYYY',
        ]), (12, 28, [
            '...SSSS',
            '..SS..ss',
            '..S....s',
            '..S....s',
            '..S....s',
            'gggggggggG',
            'gggggggggG',
            'ggggkkgggG',
            'ggggkkgggG',
            'gggggkgggG',
            'gggggkgggG',
            'gggggggggG',
            'GGGGGGGGGG',
        ])],
    },
    # a postmaster's cap and an envelope closed with red wax: the secret that stays on the machine
    'critter-seal': {
        'colors': {'o': '#7a2230', 'O': '#551520', 'y': '#d4a548', 'p': '#faf9f5', 'l': '#cbc2ad', 'L': '#a89f8a', 'r': '#c0392b', 'R': '#8f2219', 'x': '#e8695a'},
        'parts': [(12, 10, [
            '..oooooooooo',
            '.oooooooooooo',
            '.ooooyyoooooo',
            '.ooooyyoooooo',
            '.yyyyyyyyyyyy',
            'OOOOOOOOOOOOOOOO',
        ]), (16, 27, [
            'lllllllllllll',
            'lLpppppppppLl',
            'lpLpppppppLpl',
            'lppLpppppLppl',
            'lpppLrrrLpppl',
            'lpppprxrRpppl',
            'lpppprrrRpppl',
            'lppppRRRRpppl',
            'lpppppppppppl',
            'lllllllllllll',
        ])],
    },
}


def grid(name):
    icon = ICONS[name]
    colors = dict(BODY, **icon['colors'])
    g = [[PAPER] * GRID for _ in range(GRID)]

    def stamp(top, left, rows, table):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    g[top + y][left + x] = table[ch]

    stamp(BODY_TOP, 0, BODY_ROWS, BODY)
    for top, left, rows in icon['parts']:
        stamp(top, left, rows, colors if rows is not BODY_ROWS else BODY)
    return g


def png(g):
    size = GRID * BLOCK + 2 * EDGE
    paper = bytes.fromhex(PAPER[1:])
    lines = []
    for y in range(size):
        gy = (y - EDGE) // BLOCK
        row = bytearray([0])
        for x in range(size):
            gx = (x - EDGE) // BLOCK
            row += bytes.fromhex(g[gy][gx][1:]) if 0 <= gy < GRID and 0 <= gx < GRID else paper
        lines.append(bytes(row))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)

    head = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', head) + chunk(b'IDAT', zlib.compress(b''.join(lines), 9)) + chunk(b'IEND', b'')


def main(argv):
    if len(argv) == 2 and argv[0] == '--grid':
        print(json.dumps(grid(argv[1])))
        return 0
    check = argv == ['--check']
    stale = 0
    for name in ICONS:
        path = os.path.join(ROOT, 'plugins', name, '.claude-plugin', 'icon.png')
        data = png(grid(name))
        if check:
            if not os.path.exists(path) or open(path, 'rb').read() != data:
                print(f'{name}: icon.png is not what tools/icons.py draws')
                stale += 1
        else:
            with open(path, 'wb') as f:
                f.write(data)
            print(f'wrote {os.path.relpath(path, ROOT)}')
    return 1 if stale else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
