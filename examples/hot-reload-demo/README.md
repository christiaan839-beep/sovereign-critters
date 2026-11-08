# hot-reload-demo

A teaching example for mod authors. It is **not** in the marketplace: it was the first version of `crab`, kept because it shows one thing well.

A band above the prompt shows two values side by side: the time the module loaded (a variable in the module itself), and the number of prompts that entered this session (kept in `$.state`).

Run it with `claude --plugin-dir examples/hot-reload-demo`, save `hooks/register.tsx`, and watch the band: the load time is new, the count stays. That is the whole lesson: **module variables start over on a reload; `$.state` and `$.store` do not.**

Also shows: counting a prompt only once it has entered the session (`entered.drop === undefined`), invalidating a render by hand (`$.ui.invalidate`), and stepping aside for a survey (`hasSurvey`).

```
claude plugin validate examples/hot-reload-demo --strict
claude plugin test examples/hot-reload-demo
```

Apache-2.0.
