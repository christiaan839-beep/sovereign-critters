// The test runner has timers; the mod engine's types (lib es2023, no DOM) do not declare them. Tests only: a hooks module uses $.clock.
declare function setTimeout(handler: (...args: any[]) => void, ms?: number): unknown
