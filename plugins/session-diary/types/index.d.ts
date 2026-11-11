/** The engine's own `Shaped`, restated: a contract can import nothing. */
export type Shaped<T> = { shape: string; value: T }

/** One line of the diary. Tool names and times only: never a command, a path or a prompt. */
export type Entry =
  | { kind: 'tool'; at: number; tool: string; ms: number; ok: boolean }
  | { kind: 'turn'; at: number; tools: number; errors: number; ms: number }

/** One day of work in Johannesburg, kept in $.store (key `days`, fourteen days) as counts so a week survives the 300-line cap and a restart. Tool names, never what was run. */
export type Day = { day: string; tools: number; failed: number; turns: number; ms: number; by: Record<string, number> }

declare module 'claude-code' {
  interface PluginState {
    'session-diary': {
      entries: Shaped<Entry[]>
    }
  }
}
