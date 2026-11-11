# Changelog

## 0.1.3

- **Fixed:** a tool named like an object property (`constructor`, `toString`, `__proto__`) is now counted as itself; before, the tally turned into text such as `function Object() { [native code] }1`.

## 0.1.2

- The listing card now carries a homepage, a repository link and keywords, and a description short enough to read in full. No behaviour change.

## 0.1.1

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.1.0

First release.
