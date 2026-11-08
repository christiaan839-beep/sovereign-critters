/** The engine's own `Shaped`, restated: a contract can import nothing. */
export type Shaped<T> = { shape: string; value: T }

/** One line of the diary. Tool names and times only: never a command, a path or a prompt. */
export type Entry =
  | { kind: 'tool'; at: number; tool: string; ms: number; ok: boolean }
  | { kind: 'turn'; at: number; tools: number; errors: number; ms: number }

declare module 'claude-code' {
  interface PluginState {
    'session-diary': {
      entries: Shaped<Entry[]>
    }
  }
}
