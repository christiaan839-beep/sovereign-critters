declare module 'claude-code' {
  interface PluginState {
    'critter-tally': { tally: Record<string, number> }
  }
}
