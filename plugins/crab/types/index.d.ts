// The crab keeps its notes in $.store (one key, `notes`), not in $.state, so there is nothing to declare here.
declare module 'claude-code' {
  interface PluginState {
    crab: Record<string, never>
  }
}
