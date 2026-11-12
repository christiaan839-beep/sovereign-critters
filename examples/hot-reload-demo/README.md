# hot-reload-demo: write your first mod

**Workshop** pillar: how a mod is made. A teaching example, **not** in the marketplace. It was the first version of `critter-crab`, kept because it teaches one idea well:

> **A module's own variables start over on a reload. `$.state` and `$.store` do not.**

It draws one line above the prompt with two values side by side: when the module last loaded (a plain variable) and how many prompts entered this session (kept in `$.state`). Save the code while it runs and you see the lesson: the load time changes, the count stays.

## Run it

```
claude --plugin-dir examples/hot-reload-demo
```

Send a prompt or two, then open `hooks/register.tsx`, change nothing but a comment, and save. The band redraws: `loaded` shows the new time and the prompt count is where it was.

Claude Code also writes its TypeScript types for your version into `.claude-plugin/types/` when it loads the folder like this, so your editor and `tsc -p examples/hot-reload-demo` can check the code. They are not committed.

## The five files

| File | What it is |
| --- | --- |
| `.claude-plugin/plugin.json` | The manifest: name, version, description, licence. Every plugin has one. |
| `hooks/hooks.json` | `{ "modules": ["./register.tsx"] }`. Pointing at a module is what makes a plugin a mod. |
| `hooks/register.tsx` | The hooks module: one exported `register(on)` that Claude Code calls when the mod loads. |
| `types/index.d.ts` | The contract for this mod's `$.state`: the key `prompts` is a number. |
| `tests/hot-reload-demo.test.tsx` | Four tests, run with `claude plugin test`, no session and no network. |

## Read the code in this order

Each step names the lines in `hooks/register.tsx` and the test that pins them.

1. **A value that survives a reload.** `atom({ plugin, key }, 0)` near the top declares the counter. The host keeps its value for the session; the module only holds a handle to it. `read($, prompts)` and `update($, prompts, n => n + 1)` reach it. *Test: "the count rides in $.state…".*
2. **A value that does not.** `let loadedAt` inside `register` is a plain variable. A reload runs `register` again, so it starts from `'just now'`.
3. **An event, and passing it on.** `on('session.start', …)` fires when the session starts and again on every reload. The hook does its work and returns `next(e)`, so the session starts as usual. Every hook ends by calling `next` or by answering on its own.
4. **Acting on the result, not the request.** The `prompt.submit` hook calls `next(e)` first and counts only if the prompt was not dropped (`entered.drop === undefined`). A mod beneath it may refuse a prompt; one that never entered is not counted. *Test: "a prompt dropped beneath this mod…".*
5. **Asking for a redraw.** Writing a plain variable redraws nothing, so `session.start` calls `$.ui.invalidate('ui.render')`. Writing `$.state` redraws by itself. *Test: "a band drawn before session.start redraws…".*
6. **Drawing.** `on('ui.render', { component: 'AbovePrompt' }, …)` adds the band. `$.ui.resolve(e)` gives the elements this surface draws (`Box`, `Text`); the same code draws in the terminal and on the desktop. *Test: the first one mounts the band on both surfaces.*
7. **Stepping aside.** When the engine is showing a survey (`e.props.hasSurvey`), the hook returns `next(e)` and draws nothing of its own. *Test: "the band steps aside for a survey".*

## The loop

```
claude plugin validate examples/hot-reload-demo --strict   # what Claude Code reads from your code
claude plugin test examples/hot-reload-demo                 # the tests
claude --plugin-dir examples/hot-reload-demo                # the real thing; save to reload
```

`validate` prints a `hooks:` line (the events you hook) and a `calls:` line (the `$` methods you call). If an event you meant is not on the first line, Claude Code will not call that hook either.

## Try it yourself

Each of these is a small change and a test. Write the test first and watch it fail.

1. **Keep the count across a restart.** Move it from `$.state` to `$.store` (`await $.store.get('prompts')`, `await $.store.set('prompts', n)`). A test: set the store, start a new session, read the band. `critter-crab` does exactly this for its notes.
2. **Add `/demo reset`.** Register the command in `session.start` with `$.command.register`, answer it in `on('command.run', { command: 'demo' }, …)`, and set the count back to 0.
3. **Count only your own prompts.** Look at `e.origin.kind` in the `prompt.submit` hook: count `composer` and leave the rest.

## The rules this family keeps

- **A test that has never failed proves nothing.** Break the code, watch the test go red, put it back.
- **A decorative hook never blocks a tool.** Every hook on the tool path ends in `.catch(($, e, next) => next(e))`. Only a guard fails closed, and only for its one promise.
- **Same input, same words.** Nothing on screen comes from chance, so a test can pin it.
- **Claim what you checked.** When the engine's behaviour matters, say where you read it: Claude Code's docs, or the types in `.claude-plugin/types`.

[`VOICE.md`](../../VOICE.md) has the rest, and Claude Code's own guide to [creating a mod](https://code.claude.com/docs/en/plugins/mods/create) goes further.

Apache-2.0.
