declare module 'claude-code' {
  interface PluginState {
    everywhere: { tally: Record<string, number> }
  }
}
