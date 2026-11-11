// The control room keeps nothing of its own: the plugin manager is the truth, and it is asked each time.
declare module 'claude-code' {
  interface PluginState {
    'critter-mods': Record<string, never>
  }
}
