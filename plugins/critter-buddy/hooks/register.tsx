import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Look, Scene } from '../types'
import { catchIn, faceRuns, faceSvg, initial, paint, paintBig, paintBigSvg, paintOrb, paintOrbSvg, paintSvg, paintWizard, paintWizardSvg, poke, quip, react, startGame, step, stopGame } from './scene'
import type { FaceKind, Reaction, Run, Svgd } from './scene'

// `shape` tags the stored form: a value an earlier version stored is declined, not misread.
const scene = atom({ plugin: 'critter-buddy', key: 'scene' } as const, initial(), { shape: 'scene-4' })
const isHidden = atom({ plugin: 'critter-buddy', key: 'isHidden' } as const, false, { shape: 'hidden-1' })
const diary = atom({ plugin: 'critter-buddy', key: 'diary' } as const, [] as string[], { shape: 'diary-1' })
// lite: the band, the wizard and the orb, the pane, the backdrop. full: the rows of the transcript too.
// party: every message wears a face as well.
type Detail = 'lite' | 'full' | 'party'
const detail = atom({ plugin: 'critter-buddy', key: 'detail' } as const, 'full' as Detail, { shape: 'detail-1' })
const world = atom({ plugin: 'critter-buddy', key: 'world' } as const, 'day' as 'day' | 'night', { shape: 'world-1' })

// off by default: the cat speaks after a turn through one small model call, which costs tokens each time
const talk = atom({ plugin: 'critter-buddy', key: 'talk' } as const, false as boolean, { shape: 'talk-1' })

const PANE = 'cat-corner'
const STAGE = 'stage'
const TOOL_DIARY = 'mcp__critter-buddy__cat_diary'
const LOOKS: Record<string, [Look, string]> = {
  Skill: ['wizard', 'casting a skill'], Agent: ['wizard', 'sending a subagent'], Task: ['wizard', 'sending a subagent'],
  Read: ['reader', 'reading'], Grep: ['reader', 'searching'], Glob: ['reader', 'looking for files'],
  Bash: ['coder', 'running a command'], Edit: ['writer', 'editing'], Write: ['writer', 'writing a file'],
  WebFetch: ['web', 'reading a page'], WebSearch: ['web', 'searching the web'],
}
const VARIANTS = ['orange', 'ink', 'brown', 'tabby', 'ginger', 'black', 'tuxedo', 'cream', 'grey', 'siamese', 'pair'] as const
// a build, an install or a long run: the critter puts on the chef's hat for it
const BUILD = /\b(build|compile|install|docker|make|cargo|gradle|mvn|webpack|tsc|pytest|vitest|jest|mocha)\b|\b(npm|pnpm|yarn|bun)\s+(run|ci|install|test)\b|plugin (test|validate)/
const TEST = /\b(pytest|vitest|jest|mocha)\b|\b(npm|pnpm|yarn|bun|cargo|go)\s+(run\s+)?test\b|plugin test/
const COMMIT = /\bgit\s+commit\b/
const DAY = 86_400_000
const ERR_LINES = [
  'It failed. The cat was not surprised.',
  'The wizard says that was on purpose.',
  'The cat knocked it over first.',
  'Nothing was harmed. Mostly.',
]

let liveCols = 80
let turnStartedAt = 0
let ticker: { cancel: () => void } | undefined
let greeted: string | undefined // the first notice under the logo carries the greeting; a redraw of it keeps it
const notes = new Map<string, string>() // what each row placed in the transcript says

// Africa/Johannesburg is UTC+2: night runs 18:00 to 05:59.
const hourOf = (ms: number) => Math.floor(ms / 3_600_000 + 2) % 24
const isNight = (ms: number) => hourOf(ms) >= 18 || hourOf(ms) < 6
const hhmm = (ms: number) => `${String(hourOf(ms)).padStart(2, '0')}:${String(Math.floor(ms / 60_000) % 60).padStart(2, '0')}`

const bar = (n: number) => '█'.repeat(Math.round(n / 10)) + '░'.repeat(10 - Math.round(n / 10))
const moodOf = (s: Scene) => (s.trust < 30 ? 'sulking' : s.trust > 80 ? 'devoted' : s.joy > 75 ? 'pleased' : 'unbothered')
const pick = <T,>(list: readonly T[], key: string): T => {
  let h = 7
  for (const c of key) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0
  return list[h % list.length]!
}

// Pixel rows and the five-cell face, drawn with whichever Text the surface resolved.
const rowsOf = (Text: any, rows: Run[][], key: string) =>
  rows.map((runs, i) => (
    <Text key={`${key}${i}`}>
      {runs.map((r, j) => (
        <Text key={`${key}${i}-${j}`} color={r.fg} backgroundColor={r.bg}>
          {r.text}
        </Text>
      ))}
    </Text>
  ))
const faceOf = (Text: any, kind: FaceKind) => (
  <Text>
    {faceRuns(kind, 1).map((r, j) => (
      <Text key={`f${j}`} color={r.fg} backgroundColor={r.bg}>
        {r.text}
      </Text>
    ))}
  </Text>
)


// What a surface draws with: the terminal paints half-block text, every other surface takes the same pixels as vector art
// (the desktop smears block glyphs; it draws SVG crisply). One call gives a hook the right face and sprite for where it runs.
const kit = (els: any, surface: string) => {
  const { Box, Text, Button, Svg } = els
  const vector = surface !== 'terminal' && Svg !== undefined
  const svg = (d: Svgd, alt: string) => <Svg source={d.source} width={d.width} height={d.height} alt={alt} />
  const face = (kind: FaceKind) => (vector ? svg(faceSvg(kind, 1), `the critter's face: ${kind}`) : faceOf(Text, kind))
  return { Box, Text, Button, vector, svg, face }
}

// Night's sky for the desktop backdrop: stars at fixed places, so a redraw does not shuffle them.
const STARS = Array.from({ length: 22 }, (_, i) => {
  const a = Math.imul(i + 1, 2654435761) >>> 0
  const b = Math.imul(i + 11, 1664525) >>> 0
  return { top: a % 34, left: b % 150, big: i % 5 === 0 }
})

export const register: Register = on => {
  // What Claude is doing sets the look; what happens to it sets the mood.
  for (const tool of Object.keys(LOOKS)) {
    on('tool.call', { tool } as never, async ($, e, next) => {
      const asked = String((e as { command?: unknown }).command ?? '')
      const [look, label] = tool === 'Bash' && BUILD.test(asked) ? (['chef', 'cooking a build'] as [Look, string]) : (LOOKS[tool] ?? (['coder', 'working'] as [Look, string]))
      await update($, scene, (s: Scene): Scene => ({ ...s, look, label, idle: 0, tools: s.tools + 1, skills: s.skills + (tool === 'Skill' ? 1 : 0), ...(tool === 'Skill' ? { jt: 1 } : {}) }))
      $.ui.status(`critter: ${label}`)
      const ran = await next(e)
      const command = String((e as { command?: unknown }).command ?? '')
      let ev: Reaction | null = null
      if (ran.deny !== undefined) ev = 'deny'
      else if (ran.isError === true) ev = 'error'
      else if (tool === 'Skill') ev = 'spell' // a skill ran: the wizard casts, sparks round the orb
      else if (tool === 'Bash' && COMMIT.test(command)) ev = 'commit'
      else if (tool === 'Bash' && TEST.test(command)) ev = 'test'
      if (ev) await update($, scene, (s: Scene): Scene => react(s, ev as Reaction))
      return ran
    }).catch(($, e, next) => next(e)) // a decorative mod never stands in the way of a tool call
  }

  // A tool of the model's own: it can read the cat's diary and the pair's moods.
  on('tool.call', { tool: TOOL_DIARY }, async $ => {
    const s = await read($, scene)
    const d = await read($, diary)
    const lines = d.slice(-12)
    return {
      result:
        `The cat is ${moodOf(s)} (trust ${Math.round(s.trust)}, joy ${Math.round(s.joy)}). ` +
        `${s.stats.turns} turns, ${s.stats.errors} errors, ${s.stats.pets} pets, ${s.stats.commits} commits, ${s.stats.knocks} cups knocked off.\n` +
        (lines.length ? lines.join('\n') : 'The diary is empty. The cat was asleep.'),
    }
  }).catch(($, e, next) => next(e))

  // A permission question: both of them look up.
  on('tool.check', async ($, e, next) => {
    const r = await next(e)
    if (r.decision === 'ask') await update($, scene, (s: Scene): Scene => react(s, 'ask'))
    return r
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    turnStartedAt = await $.clock.now()
    await update($, scene, (s: Scene): Scene => ({ ...s, look: 'wizard', wt: 0, label: 'thinking', tools: 0, idle: 0 })) // the wizard takes the bar for the whole turn: the hat builds while Claude thinks
    return next(e)
  }).catch(($, e, next) => next(e))

  // The pair watch you type: the cat looks up and the critter wakes, once per burst of typing, not on every key.
  on('prompt.edit', async ($, e, next) => {
    try {
      const s = await read($, scene)
      if (s.mode === 'loaf' || s.idle > 0) await update($, scene, (x: Scene): Scene => ({ ...(x.mode === 'loaf' ? poke(x, 'alert') : x), idle: 0 }))
    } catch {
      // a decorative reaction never holds up the prompt
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    const took = turnStartedAt ? now - turnStartedAt : 0
    let line = ''
    let n = 0
    await update($, scene, (s: Scene): Scene => {
      const r = { ...react(s, 'turn', took), label: `done, ${s.tools} tools` }
      line = r.log[r.log.length - 1] ?? ''
      n = r.stats.turns
      return r
    })
    $.ui.status(undefined)
    if ((await read($, talk)) && !(await read($, isHidden))) {
      try {
        const st = await read($, scene)
        const r = await $.model.complete({
          model: 'haiku', effort: 'low', maxTokens: 60, timeoutMs: 8000,
          system: 'You are a small tabby cat who lives above a terminal prompt. Reply with one line under 14 words, dry and affectionate, no emojis, and never say you are an AI.',
          prompt: `A turn just ended after ${Math.round(took / 1000)} seconds. Tools used this session: ${st.tools}. Errors: ${st.stats.errors}. Commits: ${st.stats.commits}. Say something about it.`,
        })
        const said = r.isAnswered ? (r.text.trim().split('\n')[0] ?? '').slice(0, 140) : ''
        if (said) {
          line = said
          await update($, scene, (s: Scene): Scene => ({ ...s, log: [...s.log, said].slice(-6) }))
        }
      } catch {
        // no model to ask: the cat keeps its own line
      }
    }
    // The cat's line for the turn stays in the transcript, as a row of its own.
    if (line && !(await read($, isHidden)) && (await read($, detail)) !== 'lite') {
      const id = `diary-${n}`
      notes.set(id, `${hhmm(now)}  ${line}`)
      try {
        await $.ui.place({ id })
      } catch {
        // a host with no transcript rows to place
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    // The cat remembers you across sessions: neglect costs trust, petting earns it.
    const now = await $.clock.now()
    const mem = (await $.store.get('memory')) as { trust?: number; pets?: number; lastSeen?: number } | undefined
    if (mem && typeof mem.trust === 'number') {
      const days = mem.lastSeen ? Math.floor((now - mem.lastSeen) / DAY) : 0
      const trust = Math.max(0, mem.trust - days * 8)
      await update($, scene, (s: Scene): Scene => ({ ...s, trust, log: [...s.log, days >= 1 ? `You are back after ${days} day${days === 1 ? '' : 's'}. I am fine.` : 'Back already. Good.'] }))
    }
    // The diary carries across sessions too.
    const kept = (await $.store.get('diaryLog')) as string[] | undefined
    if (Array.isArray(kept)) await update($, diary, (d: string[]) => [...kept.filter(l => typeof l === 'string'), ...d].slice(-200))
    await setWorld($, isNight(now) ? 'night' : 'day')
    await $.tool
      .register({
        name: 'cat_diary',
        description: "Reads the cat's diary and the critter pair's moods: how the cat feels about this session so far. Rarely needed.",
        inputSchema: { type: 'object', properties: {} },
      })
      .catch(() => undefined)
    ticker?.cancel() // a second session.start must not stack a second clock
    ticker = $.clock.every(250, async () => {
      if ((await read($, isHidden)) === true) return
      const t = await $.clock.now()
      let said: string[] = []
      let snapshot: Scene | undefined
      await update($, scene, (s: Scene): Scene => {
        const n = { ...step({ ...s, cols: liveCols }), night: isNight(t) }
        said = n.log
        snapshot = n
        return { ...n, log: [] }
      })
      if (said.length) {
        const written = await update($, diary, (d: string[]) => [...d, ...said.map(l => `${hhmm(t)} ${l}`)].slice(-200))
        await $.store.set('diaryLog', written)
      }
      if (snapshot && snapshot.tick % 40 === 0) await $.store.set('memory', { trust: snapshot.trust, pets: snapshot.stats.pets, lastSeen: t })
      if (snapshot && (snapshot.night ? 'night' : 'day') !== (await read($, world))) await setWorld($, snapshot.night ? 'night' : 'day')
    })
    // One command, subcommands inside: the session already has /pet from another mod.
    try {
      await $.command.register({ name: 'critter', description: 'The pair above your prompt: pet, treat, nap, spell, corner, diary, stage, hide, show, lite|full|party, talk on|off, cat <coat>' })
    } catch {
      $.ui.log('critter-buddy: /critter is taken by another plugin; the buttons above the prompt still work')
    }
    return next(e)
  })

  // The session ends: what the cat feels and what it wrote are kept, whatever the clock last saved.
  on('session.end', async ($, e, next) => {
    try {
      const s = await read($, scene)
      await $.store.set('memory', { trust: s.trust, pets: s.stats.pets, lastSeen: await $.clock.now() })
      await $.store.set('diaryLog', await read($, diary))
    } catch {
      // a decorative mod never holds up the end of a session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'critter' }, async ($, e) => {
    const [sub = '', arg = ''] = e.args.trim().split(/\s+/)
    const reactions: Record<string, [Reaction, string]> = {
      pet: ['pet', 'You petted the cat. It did not ask.'],
      treat: ['treat', 'A treat. The wizard thinks it was for him.'],
      nap: ['nap', 'Both of them are asleep.'],
      spell: ['spell', 'The wizard cast something.'],
    }
    const hit = reactions[sub]
    if (hit) {
      await update($, scene, (s: Scene): Scene => react(s, hit[0]))
      return { text: hit[1] }
    }
    if (sub === 'stage') {
      await $.ui.open({ id: STAGE, title: 'Stage', focus: true })
      return { text: 'The stage is open: the critter alone, walking and idling.' }
    }
    if (sub === 'corner') {
      await $.ui.open({ id: PANE, title: 'Cat corner', focus: true })
      return { text: 'Cat corner opened.' }
    }
    if (sub === 'diary') {
      const d = await read($, diary)
      return { text: d.length ? d.slice(-12).join('\n') : 'The diary is empty. The cat was asleep.' }
    }
    if (sub === 'lite' || sub === 'full' || sub === 'party') {
      await update($, detail, () => sub as Detail)
      return {
        text:
          sub === 'lite' ? 'Lite: the band, the wizard and the orb, the pane and the backdrop.'
          : sub === 'full' ? 'Full: the tool rows, results, durations, hints and the cat\'s diary rows too.'
          : 'Party: every message wears a face as well.',
      }
    }
    if (sub === 'talk') {
      if (arg !== 'on' && arg !== 'off') return { text: 'Usage: /critter talk on | off. The cat speaks after each turn through one small model call; that costs tokens, so it is off until you say.' }
      await update($, talk, () => arg === 'on')
      return { text: arg === 'on' ? 'The cat will speak after each turn: one small model call each time.' : 'The cat is quiet again.' }
    }
    if (sub === 'cat') {
      const v = VARIANTS.find(x => x === arg)
      if (!v) return { text: `Usage: /critter cat ${VARIANTS.join(' | ')}` }
      await update($, scene, (s: Scene): Scene => ({ ...s, variant: v }))
      return { text: `The tabby is now ${v}.` }
    }
    if (sub === '' || sub === 'hide' || sub === 'show') {
      const hidden = await update($, isHidden, h => (sub === 'hide' ? true : sub === 'show' ? false : !h))
      const w = await read($, world)
      await drawBackdrop($, hidden ? undefined : { id: w, glass: glassFor(w) })
      return { text: hidden ? 'The pair are hidden.' : 'The pair are back.' }
    }
    return { text: 'Usage: /critter [pet | treat | nap | spell | corner | stage | diary | hide | show | lite | full | party | talk on|off | cat <coat>]' }
  })

  // ---- the band above the prompt: the pair on the bar, and three things to press ----
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const s = await read($, scene)
    // A wide desktop window would spread the pair thin across it: the bar stops at 96 cells, like the film's frame.
    const cols = Math.min(96, e.props.bodyColumns || e.viewport?.columns || 80)
    liveCols = cols
    const { Box, Text, Button, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    // Other mods draw here too (usage-line, snoozing-pet): keep their rows beneath ours.
    const others = await next(e)
    const rows = paint({ ...s, cols })
    return (
      <Box flexDirection="column">
        {vector ? svg(paintSvg({ ...s, cols }, 5), 'The critter and the tabby cat on the bar') : rowsOf(Text, rows, 'r')}
        <Box flexDirection="row">
          <Text dimColor>{`${s.label} · cat ${moodOf(s)} `}</Text>
          <Button key="pet" label="pet" hotkey="p" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'pet'))} />
          <Text> </Text>
          <Button key="treat" label="treat" hotkey="t" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'treat'))} />
          <Text> </Text>
          <Button key="cast" label="cast" hotkey="c" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'spell'))} />
          <Text> </Text>
          <Button key="corner" label="cat corner" hotkey="k" onPress={() => $.ui.open({ id: PANE, title: 'Cat corner', focus: true })} />
        </Box>
        {others}
      </Box>
    )
  })

  // ---- the thinking orb: the wizard stands to its left, the Sovereign Matrix orb beside him ----
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (await read($, isHidden)) return next(e)
    const orbLine = await next(e) // the engine's own line: the orb, its word, the time and the tokens
    const s = await read($, scene)
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="row" alignItems="flex-end" gap={1}>
        <Box>{vector ? svg(paintWizardSvg(s, 5), 'The wizard critter, pacing beside the orb') : rowsOf(Text, paintWizard(s), 'w')}</Box>
        <Box>{vector ? svg(paintOrbSvg(s.tick, 5), 'The Sovereign Matrix orb') : rowsOf(Text, paintOrb(s.tick), 'o')}</Box>
        {orbLine}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- the rows of the transcript: a face on each tool call, what it did in its eyes ----
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const base = await next(e)
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite') return base
    const kind: FaceKind = e.props.isErrored || e.props.isInterrupted ? 'err' : e.props.isRunning ? 'run' : 'ok'
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="row" gap={1}>
        {face(kind)}
        {base}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const base = await next(e)
    if (!e.props.isErrored || (await read($, isHidden)) || (await read($, detail)) === 'lite') return base
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="column">
        {base}
        <Box flexDirection="row" gap={1}>
          {face('err')}
          <Text dimColor>{pick(ERR_LINES, e.props.tool_use_id)}</Text>
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const base = await next(e)
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite' || e.props.isExpanded) return base
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="row" gap={1}>
        {face(e.props.isActive ? 'run' : 'ok')}
        {base}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite' || e.props.hint === '') return next(e)
    return next({ ...e, props: { ...e.props, hint: `${e.props.hint} · the cat is watching` } })
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const base = await next(e)
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite' || e.props.waitingFor) return base
    const line = quip('turn', await read($, scene), hourOf(Date.now()), e.props.durationMs)
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    // under the engine's line, not beside it: its row already runs the width of the terminal
    return (
      <Box flexDirection="column">
        {base}
        <Text dimColor>{`  ${line}`}</Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- what the person and the model say: a face only in party mode ----
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const base = await next(e)
    if ((await read($, isHidden)) || (await read($, detail)) !== 'party') return base
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    // the mail brought in by a background task or another session gets a happy face
    if (e.props.origin.kind === 'composer') return base
    return (
      <Box flexDirection="row" gap={1}>
        {face('ok')}
        {base}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const base = await next(e)
    if (!e.props.isFirstOfReply || (await read($, isHidden)) || (await read($, detail)) !== 'party') return base
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="column">
        {face('rest')}
        {base}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- the questions it asks, and what the command printed ----
  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => {
    const base = await next(e)
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite') return base
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          {face('run')}
          <Text dimColor>{quip('ask', await read($, scene))}</Text>
        </Box>
        {base}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'CommandOutput', props: { command: 'critter' } } as never, async ($, e, next) => {
    if ((await read($, isHidden)) || e.props.isErrored) return next(e)
    const s = await read($, scene)
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="row" gap={1} alignItems="flex-end">
        <Box>{vector ? svg(paintWizardSvg(s, 4), 'The wizard critter') : rowsOf(Text, paintWizard(s), 'c')}</Box>
        <Text>{e.props.text}</Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- the footer: the cat's mood among the modes, a hint under the prompt, a greeting under the logo ----
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite') return next(e)
    const s = await read($, scene)
    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, `cat ${moodOf(s)}`] } })
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if ((await read($, isHidden)) || (await read($, detail)) === 'lite' || e.props.isDraft) return next(e)
    const tail = ` · ${quip('hint', await read($, scene), hourOf(Date.now()))}`
    return next({ ...e, props: { ...e.props, tail } })
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => {
    const base = await next(e)
    if (await read($, isHidden)) return base
    greeted ??= e.requestId
    if (greeted !== e.requestId) return base
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="column">
        {base}
        <Box flexDirection="row" gap={1}>
          {face('ok')}
          <Text dimColor>{`critter-buddy: ${quip('greet', await read($, scene), hourOf(Date.now()))}`}</Text>
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- a row the mod placed: the cat's line for a finished turn ----
  on('ui.render', { component: 'Placed' }, async ($, e, next) => {
    if (e.props.plugin !== 'critter-buddy') return next(e)
    const text = notes.get(e.props.id)
    if (!text) return next(e)
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box flexDirection="row" gap={1}>
        {face('rest')}
        <Text dimColor italic>{text}</Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- the window behind the conversation: cream Day, glass Night with a few stars (the desktop app only) ----
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== 'critter-buddy') return next(e)
    const night = (await read($, world)) === 'night'
    const { Box, Text, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    return (
      <Box position="absolute" top={0} left={0} width="100%" height="100%" backgroundColor={night ? '#141413' : '#faf9f5'}>
        {night &&
          STARS.map((st, i) => (
            <Box key={`s${i}`} position="absolute" top={st.top} left={st.left}>
              <Text color={st.big ? '#d4a548' : '#8f7cc4'} dimColor={!st.big}>{st.big ? '✦' : '·'}</Text>
            </Box>
          ))}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- the stage: our own critter alone on an empty screen, walking and idling as the session runs ----
  on('ui.render', { component: 'Pane', requestId: STAGE }, async ($, e) => {
    const s = await read($, scene)
    const { Box, Text, Button, vector, svg } = kit($.ui.resolve(e), e.surface)
    const cols = Math.min(72, e.props.bodyColumns || 60)
    // the cat is off the stage; the critter keeps to what it is doing, else it idles
    const alone: Scene = { ...s, cols, kx: -80, look: s.look === 'wizard' || s.look === 'done' ? s.look : 'idle' }
    return (
      <Box flexDirection="column">
        <Text bold>{'Stage'}</Text>
        {vector ? svg(paintSvg(alone, 5), 'The critter alone on a stage, walking and idling') : rowsOf(Text, paint(alone), 's')}
        <Text dimColor>{`${s.label} · ${s.tools} tools · ${s.skills} skills`}</Text>
        <Box flexDirection="row">
          <Button key="spell" label="cast" hotkey="c" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'spell'))} />
          <Text> </Text>
          <Button key="nap" label="nap" hotkey="n" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'nap'))} />
          <Text> </Text>
          <Button key="close" label="close" hotkey="q" onPress={() => $.ui.close({ id: STAGE })} />
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ---- the cat corner: the portrait, the pair's moods, the diary, and the game ----
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, scene)
    const d = await read($, diary)
    const { Box, Text, Button, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    const cols = e.props.bodyColumns || 40
    const portrait = paintBig({ ...s, cols: Math.min(60, cols), cdir: 1 })
    const field = Array.from({ length: 9 }, (_, r) =>
      [0, 1, 2].map(l => (s.game.lane === l && s.game.row === r ? (r >= 5 ? ' ▼ ' : ' · ') : '   ')).join('│'),
    )
    return (
      <Box flexDirection="column">
        {vector
          ? svg(paintBigSvg({ ...s, cols: Math.min(60, cols), cdir: 1 }, 8), 'The critter and the cat, large')
          : portrait.map((runs, i) => (
              <Text key={`p${i}`}>
                {runs.map((r, j) => (
                  <Text key={`q${j}`} color={r.fg}>{r.text}</Text>
                ))}
              </Text>
            ))}
        <Text bold>{'Moods'}</Text>
        <Text>{`trust ${bar(s.trust)} ${Math.round(s.trust)}`}</Text>
        <Text>{`joy   ${bar(s.joy)} ${Math.round(s.joy)}`}</Text>
        <Text dimColor>{`${s.stats.turns} turns · ${s.tools} tools · ${s.skills} skills · ${s.stats.errors} errors · ${s.stats.pets} pets · ${s.stats.commits} commits · ${s.stats.knocks} knocked off`}</Text>
        <Box flexDirection="row">
          <Button key="p" label="pet" hotkey="p" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'pet'))} />
          <Text> </Text>
          <Button key="t" label="treat" hotkey="t" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'treat'))} />
          <Text> </Text>
          <Button key="n" label="nap" hotkey="n" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'nap'))} />
        </Box>
        <Text bold>{'Catch the treat'}</Text>
        {s.game.on ? (
          <Box>
            <Text>{`score ${s.game.score}   best ${s.game.best}`}</Text>
            {field.map((line, i) => (
              <Text key={`f${i}`} dimColor={i < 5}>{line}</Text>
            ))}
            <Box flexDirection="row">
              <Button key="l0" label="left" hotkey="1" onPress={() => update($, scene, (x: Scene): Scene => catchIn(x, 0))} />
              <Text> </Text>
              <Button key="l1" label="middle" hotkey="2" onPress={() => update($, scene, (x: Scene): Scene => catchIn(x, 1))} />
              <Text> </Text>
              <Button key="l2" label="right" hotkey="3" onPress={() => update($, scene, (x: Scene): Scene => catchIn(x, 2))} />
              <Text> </Text>
              <Button key="stop" label="stop" onPress={() => update($, scene, (x: Scene): Scene => stopGame(x))} />
            </Box>
          </Box>
        ) : (
          <Button key="play" label="play" onPress={() => update($, scene, (x: Scene): Scene => startGame(x))} />
        )}
        <Text bold>{'Diary'}</Text>
        {d.length === 0 && <Text dimColor>{'Nothing happened yet. The cat is asleep.'}</Text>}
        {d.slice(-8).map((l, i) => (
          <Text key={`d${i}`} dimColor>{l}</Text>
        ))}
      </Box>
    )
  })
}

// The glass behind the conversation: frosted cream by day, a deep violet tint by night.
const glassFor = (w: 'day' | 'night') =>
  w === 'night' ? { blur: 18, opacity: 0.6, tint: '#1c1838' } : { blur: 14, opacity: 0.5, tint: '#faf9f5' }

// Set the world once, when it changes; the desktop draws it, every other surface answers that it did not.
const setWorld = async ($: any, w: 'day' | 'night') => {
  await update($, world, () => w)
  if ((await read($, isHidden)) === true) return
  await drawBackdrop($, { id: w, glass: glassFor(w) })
}

// Not every host has a backdrop to draw on: a missing or refused call is not the mod's problem.
const drawBackdrop = async ($: any, arg: { id: string; glass: ReturnType<typeof glassFor> } | undefined) => {
  try {
    await $.ui.backdrop(arg)
  } catch {
    // no backdrop here
  }
}
