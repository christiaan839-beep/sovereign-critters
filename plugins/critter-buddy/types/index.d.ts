/** The engine's own `Shaped`, restated: a contract can import nothing. */
export type Shaped<T> = { shape: string; value: T }

export type Look = 'idle' | 'wizard' | 'reader' | 'coder' | 'chef' | 'writer' | 'web' | 'done'
export type CatMode =
  | 'loaf' | 'walk' | 'alert' | 'pounce' | 'follow' | 'sit' | 'purr' | 'yawn' | 'swat' | 'sulk' | 'knock'
export type CatVariant = 'orange' | 'ink' | 'brown' | 'tabby' | 'ginger' | 'black' | 'tuxedo' | 'cream' | 'grey' | 'siamese' | 'pair'
export type FxKind = 'heart' | 'z' | 'spark' | 'bubble' | 'cup' | 'treat'
export type Fx = { k: FxKind; x: number; y: number; vx: number; vy: number; life: number }
export type Game = { on: boolean; lane: 0 | 1 | 2; row: number; score: number; best: number }
export type Stats = {
  turns: number; errors: number; pets: number; commits: number; tests: number; denials: number; knocks: number
}

/** Everything the band and the pane draw: one value, advanced by `step`, changed by `react`. */
export type Scene = {
  /** Which wizard: by the hour, always the gold star, or always the violet bolt. */
  form: 'auto' | 'gold' | 'bolt'
  tick: number
  cols: number
  look: Look
  label: string
  tools: number
  skills: number
  night: boolean
  idle: number
  /** Ticks the wizard look has lasted: the hat and staff build up over the first eight. */
  wt: number
  cx: number
  cdir: 1 | -1
  jt: number
  kx: number
  kdir: 1 | -1
  mode: CatMode
  mt: number
  target: number
  seed: number
  variant: CatVariant
  trust: number
  joy: number
  fx: Fx[]
  game: Game
  stats: Stats
  log: string[]
  /** Days in a row you came back to the cat; three earns a ball of yarn, seven a cushion, 14 a plant, 30 a lamp. */
  streak?: number
}

declare module 'claude-code' {
  interface PluginState {
    'critter-buddy': {
      scene: Shaped<Scene>
      isHidden: Shaped<boolean>
      diary: Shaped<string[]>
      /** How far the mod reaches: lite (band, wizard, orb), full (the transcript's rows too), party (every message). */
      detail: Shaped<'lite' | 'full' | 'party'>
      /** Day or night, which sets the desktop backdrop. */
      world: Shaped<'day' | 'night'>
      /** Whether the cat speaks after a turn through a small model call. Off by default: it costs tokens. */
      talk: Shaped<boolean>
      /** What the person called the cat and the wizard critter. */
      names: Shaped<{ cat: string; pip: string }>
      /** Whether the cast chime and the purr play. Off until asked: sound in a shared mod is a choice. */
      sound: Shaped<boolean>
      /** How lively the pair are: calm (still, silent), warm (the usual) or playful. */
      feel: Shaped<'calm' | 'warm' | 'playful'>
      /** The cat's line about how full the context window is; empty while there is nothing to say. */
      usage: Shaped<string>
    }
  }
}
