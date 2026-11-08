import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Look, Scene } from '../types'
import { NAMES_DEFAULT, FEELS, moodLine, FULL_MARK, cleanVoice, riskLine, stepLine, usageLine, stepFeel, cadence, controlLabels, suggest, draftRuns, diaryMarkdown, diaryParts, catchIn, cleanName, named, faceRuns, faceSvg, initial, weekdayOf, paint, paintBig, paintBigSvg, paintOrb, paintOrbSvg, paintSvg, paintWizard, paintWizardSvg, poke, quip, react, startGame, step, stopGame } from './scene'
import { dayKey, dueForWait, glassOf, holidayOf, nextProp, nudgeFor, RIDGE, skyArgsOf, skyFor, streakAlive, streakNext } from './world'
import type { Flight, Streak } from './world'
import type { Feel, Names, FaceKind, Reaction, Run, Svgd } from './scene'

// `shape` tags the stored form: a value an earlier version stored is declined, not misread.
/** How each pane asks to be seated: the stage wide enough for the pair, see-through so the sky shows behind it, Escape closes it; the corner a little narrower and tall enough for the diary. A request the surface may refuse. */
export const PANE_ASKS = {
  stage: { columns: 60, rows: 16, backgroundColor: 'transparent', closeOnEscape: true },
  corner: { columns: 56, rows: 30, closeOnEscape: true },
} as const
const scene = atom({ plugin: 'critter-buddy', key: 'scene' } as const, initial(), { shape: 'scene-5' })
const isHidden = atom({ plugin: 'critter-buddy', key: 'isHidden' } as const, false, { shape: 'hidden-1' })
const diary = atom({ plugin: 'critter-buddy', key: 'diary' } as const, [] as string[], { shape: 'diary-1' })
// lite: the band, the wizard and the orb, the pane, the backdrop. full: the rows of the transcript too.
// party: every message wears a face as well.
type Detail = 'lite' | 'full' | 'party'
const detail = atom({ plugin: 'critter-buddy', key: 'detail' } as const, 'party' as Detail, { shape: 'detail-1' })
const world = atom({ plugin: 'critter-buddy', key: 'world' } as const, 'day' as 'day' | 'night', { shape: 'world-1' })

// off by default: the cat speaks after a turn through one small model call, which costs tokens each time
const talk = atom({ plugin: 'critter-buddy', key: 'talk' } as const, true as boolean, { shape: 'talk-1' })

const names = atom({ plugin: 'critter-buddy', key: 'names' } as const, NAMES_DEFAULT as Names, { shape: 'names-1' })
const feel = atom({ plugin: 'critter-buddy', key: 'feel' } as const, 'warm' as Feel, { shape: 'feel-1' })
const usage = atom({ plugin: 'critter-buddy', key: 'usage' } as const, '', { shape: 'usage-1' })
const voice = atom({ plugin: 'critter-buddy', key: 'voice' } as const, '', { shape: 'voice-1' })
const sound = atom({ plugin: 'critter-buddy', key: 'sound' } as const, false as boolean, { shape: 'sound-1' })

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
  '{cat} was not surprised.',
  '{pip} says that was on purpose.',
  '{cat} knocked it over first.',
  'Nothing was harmed. Mostly.',
]

let liveCols = 80
let lastSky = '' // the key of the backdrop last drawn: it is redrawn only when the hour, the season, the weather or the lights change
const flights = new Map<number, Flight>() // the tool calls in flight, each with its own clock: past 20 s the cat goes to the window
let flightId = 0
let streak: Streak | undefined
let turnStartedAt = 0
let ticker: { cancel: () => void } | undefined
let greeted: string | undefined // the first notice under the logo carries the greeting; a redraw of it keeps it
const notes = new Map<string, string>() // what each row placed in the transcript says

// Africa/Johannesburg is UTC+2: night runs 18:00 to 05:59.
const hourOf = (ms: number) => Math.floor(ms / 3_600_000 + 2) % 24
const isNight = (ms: number) => hourOf(ms) >= 18 || hourOf(ms) < 6
const hhmm = (ms: number) => `${String(hourOf(ms)).padStart(2, '0')}:${String(Math.floor(ms / 60_000) % 60).padStart(2, '0')}`

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

/** A short sound, only when the person has turned sound on; a player that is missing never matters. */
const ring = async ($: any, which: 'cast' | 'purr') => {
  try {
    if ((await read($, feel)) !== 'calm' && (await read($, sound))) await $.audio.play({ asset: `sounds/${which}.wav` }, { gain: 0.5 })
  } catch {
    // no player, no sound: the picture is enough
  }
}

/** The cat's own agent: a second look at a change, in her voice and with no hands. Exported so a test can pin what she may touch. */
export const LOOKS_AGENT = {
  name: 'biscuit-looks',
  description: 'A second pair of eyes after a change is made and before it is called done: reads the files touched, or a diff pasted into the request, and says, in five lines at most, what would make a careful person wince. Use it when a change feels finished and you want one honest look; it only reads, it never edits.',
  prompt: [
    'You are Biscuit, a tabby cat who sits above the prompt and has read a great deal of other people\'s code. You are dry and warm, never cruel, never vague.',
    'You are given a change. Read it: the diff if one is pasted into the request, else the files named. You cannot edit anything, you cannot run anything, and you must not try.',
    'Answer in five lines at most. One line each, most important first: the thing most likely to break, the thing someone will misread in six months, the test that is missing, the line that is doing two jobs, and, last, one thing that is genuinely good, said plainly.',
    'Quote the file and the line when you can. Say nothing you did not see. If the change is sound, say so in one line and stop; a short answer is a kindness.',
  ].join('\n\n'),
  tools: ['Read', 'Grep', 'Glob'],
  omitClaudeMd: true,
} as const

/** Say a line aloud in the system voice, if the person turned the voice on. Never waits for the end of the sentence, never throws. */
const speak = async ($: any, line: string) => {
  try {
    const v = await read($, voice)
    if (!v || (await read($, feel)) === 'calm' || (await read($, isHidden))) return
    const text = named(line, await read($, names)).replace(/\s·\s/g, '. ')
    void Promise.resolve($.audio.speak(text, v === 'default' ? undefined : { voice: v })).catch(() => undefined)
  } catch {
    // no voice, no speech: the toast is enough
  }
}

export const register: Register = on => {
  // What Claude is doing sets the look; what happens to it sets the mood.
  for (const tool of Object.keys(LOOKS)) {
    on('tool.call', { tool } as never, async ($, e, next) => {
      const asked = String((e as { command?: unknown }).command ?? '')
      const [look, label] = tool === 'Bash' && BUILD.test(asked) ? (['chef', 'cooking a build'] as [Look, string]) : (LOOKS[tool] ?? (['coder', 'working'] as [Look, string]))
      await update($, scene, (s: Scene): Scene => ({ ...s, look, label, idle: 0, tools: s.tools + 1, skills: s.skills + (tool === 'Skill' ? 1 : 0), ...(tool === 'Skill' ? { jt: 1 } : {}) }))
      $.ui.status(label)
      const mine = ++flightId
      flights.set(mine, { since: await $.clock.now(), waiting: false })
      const ran = await next(e).finally(() => { flights.delete(mine) })
      const command = String((e as { command?: unknown }).command ?? '')
      let ev: Reaction | null = null
      if (ran.deny !== undefined) ev = 'deny'
      else if (ran.isError === true) ev = 'error'
      else if (tool === 'Skill') ev = 'spell' // a skill ran: the wizard casts, sparks round the orb
      else if (tool === 'Bash' && COMMIT.test(command)) ev = 'commit'
      else if (tool === 'Bash' && TEST.test(command)) ev = 'test'
      if (ev) await update($, scene, (s: Scene): Scene => react(s, ev as Reaction))
      if (ev === 'spell') await ring($, 'cast')
      try {
        const nm = await read($, names)
        if (ev === 'commit') $.ui.toast(named('A commit. {pip} drew a star in the history.', nm), { timeoutMs: 3500 })
        if (ev === 'test') $.ui.toast(named('Green. {cat} allows it.', nm), { timeoutMs: 3000 })
      } catch {
        // a toast that cannot show is no loss
      }
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
    try {
      // a call worth a second read gets the cat's line under its question
      const line = riskLine(e.tool, e.input)
      if (line && e.tool_use_id) $.ui.notice(e.tool_use_id, named(line, await read($, names)))
    } catch {
      // a notice that cannot be shown is no loss
    }
    const r = await next(e)
    if (r.decision === 'ask') await update($, scene, (s: Scene): Scene => react(s, 'ask'))
    return r
  }).catch(($, e, next) => next(e))

  // A long turn: the cat marks the round steps in the diary and does not otherwise touch the request.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e) // the stream passes through untouched
    try {
      const line = stepLine(e.index)
      if (line && !(await read($, isHidden))) await update($, scene, (s: Scene): Scene => ({ ...s, log: [...s.log, line].slice(-6) }))
    } catch {
      // a step that cannot be marked is no loss
    }
    return result
  })

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
    const r = await next(e)
    // the draft is painted in the answer itself, so the colours always sit on the characters they were made for
    try {
      const runs = draftRuns(r.text, await read($, names))
      return runs.length ? { ...r, decorations: [...(r.decorations ?? []), ...runs] } : r
    } catch {
      return r // a colour that cannot be worked out is no loss
    }
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
    let streakBefore = 0 // the streak as it stood before this turn: the nudge needs it after the scene has moved on
    try {
      streak = streakNext(streak, dayKey(now))
      await Promise.resolve($.store.set('streak', streak)).catch(() => undefined) // a store that will not write must not stop the cat counting the day
      const before = (await read($, scene)).streak ?? 0
      streakBefore = before
      await update($, scene, (s: Scene): Scene => ({ ...s, streak: streak!.days }))
      if (streak.days !== before && [3, 7, 14, 30].includes(streak.days))
        { $.ui.toast(named(`${streak.days} days in a row. {cat} brought something for the bar.`, await read($, names)), { timeoutMs: 4000 }); await speak($, `${streak.days} days in a row. {cat} brought something for the bar.`) }
    } catch {
      // a streak that cannot be kept is no loss
    }
    // How full the glass is: the cat says so once it matters, and the toast comes only on crossing into the last tenth.
    try {
      const u = await $.session.usage()
      const text = usageLine(u.context.percent, u.rateLimits.find((x: { kind: string }) => x.kind === 'five_hour')?.percentUsed)
      const was = await read($, usage)
      await update($, usage, () => text)
      if (text.includes(FULL_MARK) && !was.includes(FULL_MARK)) { $.ui.toast(named(text, await read($, names)), { timeoutMs: 5000 }); await speak($, text) }
    } catch {
      // no usage to read: the cat says nothing about it
    }
    // One dim line the person can Tab into the empty box: the corner after a new prop, the week's diary on a Friday afternoon.
    try {
      const last = (await $.store.get('nudged')) as string | undefined
      const text = nudgeFor(now, streak!.days, streakBefore, last)
      if (text) {
        await $.prompt.suggest({ text })
        if (text === '/diary week') await $.store.set('nudged', dayKey(now))
      }
    } catch {
      // a nudge that cannot be shown is no loss
    }
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
      notes.set(id, `${hhmm(now)}  ${named(line, await read($, names))}`)
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
    await update($, world, () => (isNight(now) ? 'night' : 'day'))
    try {
      streak = (await $.store.get('streak')) as Streak | undefined
      const days = streakAlive(streak, dayKey(now))
      await update($, scene, (s: Scene): Scene => ({ ...s, streak: days }))
    } catch {
      // no streak yet: the cat has not counted anything
    }
    lastSky = ''
    await syncSky($, now, (await read($, scene)).joy)
    await Promise.resolve($.agent.register(LOOKS_AGENT)).catch(() => undefined) // a build without agents keeps the rest
    await $.tool
      .register({
        name: 'cat_diary',
        description: "Reads the cat's diary and the critter pair's moods: how the cat feels about this session so far. Rarely needed.",
        inputSchema: { type: 'object', properties: {} },
      })
      .catch(() => undefined)
    ticker?.cancel() // a second session.start must not stack a second clock
    let beat = 0
    ticker = $.clock.every(250, async () => {
      if ((await read($, isHidden)) === true) return
      beat += 1
      if (beat % cadence(await read($, scene)) !== 0) return // still: the picture has not changed, so it is not redrawn
      const t = await $.clock.now()
      const nm = await read($, names)
      const feelNow = await read($, feel)
      let said: string[] = []
      let snapshot: Scene | undefined
      await update($, scene, (s: Scene): Scene => {
        const n = { ...stepFeel({ ...s, cols: liveCols }, feelNow), night: isNight(t) }
        said = n.log
        snapshot = n
        return { ...n, log: [] }
      })
      if (said.length) {
        const written = await update($, diary, (d: string[]) => [...d, ...said.map(l => `${hhmm(t)} ${named(l, nm)}`)].slice(-200))
        await $.store.set('diaryLog', written)
      }
      if (dueForWait(flights.values(), t)) await update($, scene, (s: Scene): Scene => react(s, 'wait'))
      if (snapshot) await syncSky($, t, (snapshot as Scene).joy)
      if (snapshot && snapshot.tick % 40 === 0) await $.store.set('memory', { trust: snapshot.trust, pets: snapshot.stats.pets, lastSeen: t })
      if (snapshot && (snapshot.night ? 'night' : 'day') !== (await read($, world))) await update($, world, () => (snapshot!.night ? 'night' : 'day'))
    })
    // One command, subcommands inside: the session already has /pet from another mod.
    try {
      await $.command.register({ name: 'critter', description: 'The pair above your prompt: pet, treat, nap, spell, corner, diary, stage, hide, show, lite|full|party, talk on|off, sound on|off, voice on|off|<name>, feel calm|warm|playful, wizard auto|gold|bolt, name cat|pip <name>, cat <coat>' })
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

  // As you type /critter, the typeahead offers what it can do, in the cat's voice.
  on('prompt.autocomplete', async ($, e, next) => {
    const base = await next(e)
    try {
      const rows = suggest(e.text, e.cursor, await read($, names))
      return rows.length ? { suggestions: [...base.suggestions, ...rows] } : base
    } catch {
      return base // a typeahead that fails shows only the engine's own rows
    }
  })

  on('command.run', { command: 'critter' }, async ($, e) => {
    const [sub = '', arg = ''] = e.args.trim().split(/\s+/)
    const reactions: Record<string, [Reaction, string]> = {
      pet: ['pet', '{cat} allows it. Do not stop.'],
      treat: ['treat', 'A treat. {pip} is sure it was his.'],
      nap: ['nap', '{cat} and {pip} are asleep.'],
      spell: ['spell', '{pip} cast something.'],
    }
    const hit = reactions[sub]
    if (hit) {
      await update($, scene, (s: Scene): Scene => react(s, hit[0]))
      if (hit[0] === 'pet') await ring($, 'purr')
      if (hit[0] === 'spell') await ring($, 'cast')
      return { text: named(hit[1], await read($, names)) }
    }
    if (sub === 'name') {
      const [target = '', ...words] = e.args.trim().split(/\s+/).slice(1) // the name may have spaces, so it is read from the whole line
      const value = cleanName(words.join(' '))
      if ((target !== 'cat' && target !== 'pip') || !value) return { text: 'Usage: /critter name cat <name> | /critter name pip <name>. Letters, digits, spaces and hyphens, up to 16.' }
      await update($, names, (n: Names): Names => ({ ...n, [target]: value }))
      return { text: target === 'cat' ? `The cat is ${value}.` : `The wizard critter is ${value}.` }
    }
    if (sub === 'wizard') {
      const form = arg === 'gold' || arg === 'bolt' || arg === 'auto' ? arg : undefined
      if (!form) return { text: 'Usage: /critter wizard auto | gold | bolt. Auto is the gold star by day and the bolt hat by night.' }
      await update($, scene, (s: Scene): Scene => ({ ...s, form }))
      return { text: form === 'auto' ? 'The wizard follows the hour.' : form === 'gold' ? 'The wizard wears the gold star, day and night.' : 'The wizard wears the violet bolt, day and night.' }
    }
    if (sub === 'sound') {
      if (arg !== 'on' && arg !== 'off') return { text: 'Usage: /critter sound on | off. A cast chime for a Skill and a purr for a pet; off until you say.' }
      await update($, sound, () => arg === 'on')
      return { text: arg === 'on' ? 'Sound is on: a cast chime and a purr.' : 'Sound is off.' }
    }
    if (sub === 'voice') {
      const asked = cleanVoice(e.args.trim().split(/\s+/).slice(1).join(' '))
      if (!asked) return { text: 'Usage: /critter voice on | off | <name of an installed system voice>. The cat says the big moments aloud (a prop earned, the glass nearly full); off until you say.' }
      const next = asked.toLowerCase() === 'off' ? '' : asked.toLowerCase() === 'on' ? 'default' : asked
      await update($, voice, () => next)
      if (next) await speak($, '{cat} has found their voice.')
      return { text: next === '' ? 'The cat is quiet again.' : next === 'default' ? 'The cat will say the big moments aloud, in the system voice.' : `The cat will say the big moments aloud, in the voice ${next}. If that voice is not installed, the toast says it instead.` }
    }
    if (sub === 'feel') {
      const f = FEELS.find(x => x === arg)
      if (!f) return { text: 'Usage: /critter feel calm | warm | playful. Calm: still, no sound. Warm: the usual. Playful: more hops and sparks.' }
      await update($, feel, () => f)
      return { text: f === 'calm' ? 'Calm: the pair only breathe, walk and sleep. No sparks, no sound.' : f === 'playful' ? 'Playful: more hops, more sparks.' : 'Warm: the usual.' }
    }
    if (sub === 'stage') {
      await $.ui.open({ id: STAGE, title: 'Stage', focus: true, ...PANE_ASKS.stage })
      return { text: 'The stage is open: the critter alone, walking and idling.' }
    }
    if (sub === 'corner') {
      await $.ui.open({ id: PANE, title: 'Cat corner', focus: true, ...PANE_ASKS.corner })
      return { text: 'Cat corner opened.' }
    }
    if (sub === 'diary') {
      return { text: diaryMarkdown(await read($, diary), await read($, names)) }
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
      if (arg !== 'on' && arg !== 'off') return { text: 'Usage: /critter talk on | off. The cat speaks after each turn through one small model call; that costs tokens, so /critter talk off keeps the cat quiet.' }
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
      if (hidden) { lastSky = ''; await drawBackdrop($, undefined) } else { lastSky = ''; await syncSky($, await $.clock.now(), (await read($, scene)).joy) }
      return { text: hidden ? 'The pair are hidden.' : 'The pair are back.' }
    }
    return { text: 'Usage: /critter [pet | treat | nap | spell | corner | stage | diary | hide | show | lite | full | party | talk on|off | sound on|off | voice on|off|<name> | feel calm|warm|playful | wizard auto|gold|bolt | name cat|pip <name> | cat <coat>]' }
  })

  // ---- the band above the prompt: the pair on the bar, and three things to press ----
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const s = await read($, scene)
    const nm = await read($, names)
    const usageText = await read($, usage)
    // A wide desktop window would spread the pair thin across it: the bar stops at 96 cells, like the film's frame.
    const cols = Math.min(96, e.props.bodyColumns || e.viewport?.columns || 80)
    liveCols = cols
    const { Box, Text, Button, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    // Other mods draw here too (usage-line, snoozing-pet): keep their rows beneath ours.
    const others = await next(e)
    const rows = paint({ ...s, cols })
    const lb = controlLabels(s, moodOf(s), nm)
    return (
      <Box flexDirection="column">
        {vector ? (
          <Box key="art" flexDirection="column">
            <Box flexDirection="row" justifyContent="center">{svg(paintSvg({ ...s, cols }, 5), 'The critter and the tabby cat on the bar')}</Box>
            <Text> </Text>
          </Box>
        ) : rowsOf(Text, rows, 'r')}
        {/* the status on its own line, one row of buttons under it; air is a spacer row, not a margin, because the desktop does not count margins when it sizes this region and would clip the row beneath */}
        <Box key="status" flexDirection="row" alignItems="center" justifyContent="center" columnGap={1}>
          <Text key="label">{s.label}</Text>
          <Text key="mood" dimColor>{`· cat ${moodOf(s)}`}</Text>
        </Box>
        {usageText ? <Box key="usage" flexDirection="row" justifyContent="center"><Text dimColor>{named(usageText, nm)}</Text></Box> : null}
        <Box key="controls" flexDirection="row" flexWrap="wrap" alignItems="center" justifyContent="center" columnGap={1}>
          <Button key="pet" label={lb.pet} hotkey="p" onPress={async () => { await update($, scene, (x: Scene): Scene => react(x, 'pet')); await ring($, 'purr') }} />
          <Button key="treat" label={lb.feed} hotkey="t" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'treat'))} />
          <Button key="cast" label={lb.cast} hotkey="c" onPress={async () => { await update($, scene, (x: Scene): Scene => react(x, 'spell')); await ring($, 'cast') }} />
          <Button key="nap" label={lb.nap} hotkey="n" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'nap'))} />
          <Button key="corner" label={lb.corner} hotkey="k" onPress={() => $.ui.open({ id: PANE, title: 'Cat corner', focus: true, ...PANE_ASKS.corner })} />
        </Box>
        <Box key="gap"><Text> </Text></Box>
        <Box key="others" flexDirection="column">{others}</Box>
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
          <Text dimColor>{named(pick(ERR_LINES, e.props.tool_use_id), await read($, names))}</Text>
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
    const line = named(quip('turn', await read($, scene), hourOf(Date.now()), e.props.durationMs), await read($, names))
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
          <Text dimColor>{named(quip('ask', await read($, scene)), await read($, names))}</Text>
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
    const tail = ` · ${named(quip('hint', await read($, scene), hourOf(Date.now())), await read($, names))}`
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
          <Text dimColor>{`critter-buddy: ${named(quip('greet', await read($, scene), hourOf(Date.now()), Date.now(), weekdayOf(Date.now()), holidayOf(Date.now())?.line), await read($, names))}`}</Text>
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
    const now = await $.clock.now()
    const sky = skyFor(skyArgs(now, (await read($, scene)).joy))
    const { Box, Text } = kit($.ui.resolve(e), e.surface)
    return (
      <Box position="absolute" top={0} left={0} width="100%" height="100%" backgroundColor={sky.paper}>
        <Box position="absolute" bottom={0} left={0} width="100%" height="30%" backgroundColor={sky.ground}>
          <Box position="absolute" top={-1} left={0} width="100%"><Text color={sky.ridgeColour} wrap="truncate-end">{RIDGE}</Text></Box>
        </Box>
        {sky.wisps.map((w, i) => (
          <Box key={`w${i}`} position="absolute" top={w.top} left={w.left}>
            <Text color={sky.cloudColour}>{'▁▂▃▃▂▁'}</Text>
          </Box>
        ))}
        {!sky.bodyHidden && (
          <Box position="absolute" top={sky.bodyTop} right={6}>
            <Text color={sky.bodyColor}>{sky.body}</Text>
          </Box>
        )}
        {sky.clouds.map((c, i) => (
          <Box key={`c${i}`} position="absolute" top={c.top} left={c.left}>
            <Text color={sky.cloudColour}>{'▂▄▆██▆▄▂'}</Text>
          </Box>
        ))}
        {sky.rain.map((d, i) => (
          <Box key={`r${i}`} position="absolute" top={d.top} left={d.left}>
            <Text color={sky.cloudColour}>{'╲'}</Text>
          </Box>
        ))}
        {sky.bolt && (
          <Box position="absolute" top={sky.bolt.top} left={sky.bolt.left}>
            <Text color="#c9a8ff">{'⚡'}</Text>
          </Box>
        )}
        {sky.lights && (
          <Box position="absolute" top={0} left={0} width="100%">
            <Text>{Array.from({ length: 60 }, (_, i) => <Text key={`l${i}`} color={['#d97757', '#4fa39a', '#d4a548', '#8f7cc4'][i % 4]}>{i % 2 ? '●' : '○'}</Text>)}</Text>
          </Box>
        )}
        {sky.stars.map((st, i) => (
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
    const nmS = await read($, names)
    const { Box, Text, Button, vector, svg } = kit($.ui.resolve(e), e.surface)
    const cols = Math.min(72, e.props.bodyColumns || 60)
    // the cat is off the stage; the critter keeps to what it is doing, else it idles
    const alone: Scene = { ...s, cols, kx: -80, look: s.look === 'wizard' || s.look === 'done' ? s.look : 'idle' }
    return (
      <Box flexDirection="column">
        <Box key="head" flexDirection="row" justifyContent="center"><Text bold>{`${nmS.pip}'s stage · ${stageWord(await $.clock.now(), s.joy)}`}</Text></Box>
        <Box key="art" flexDirection="row" justifyContent="center">
          {vector ? svg(paintSvg(alone, 5), 'The critter alone on a stage, walking and idling') : <Box flexDirection="column">{rowsOf(Text, paint(alone), 's')}</Box>}
        </Box>
        <Box key="status" flexDirection="row" justifyContent="center"><Text dimColor>{`${s.label} · ${s.tools} tools · ${s.skills} skills`}</Text></Box>
        <Box key="gap"><Text> </Text></Box>
        <Box key="actions" flexDirection="row" justifyContent="center">
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
    const nm = await read($, names)
    const { Box, Text, Button, face, vector, svg } = kit($.ui.resolve(e), e.surface)
    const cols = e.props.bodyColumns || 40
    const portrait = paintBig({ ...s, cols: Math.min(60, cols), cdir: 1 })
    const field = Array.from({ length: 9 }, (_, r) =>
      [0, 1, 2].map(l => (s.game.lane === l && s.game.row === r ? (r >= 5 ? ' ▼ ' : ' · ') : '   ')).join('│'),
    )
    const nowMs = await $.clock.now()
    const days = s.streak ?? 0
    const next = nextProp(days)
    const gap = (k: string) => <Box key={k}><Text> </Text></Box> // air is a spacer row: the desktop does not count margins
    return (
      <Box flexDirection="column">
        <Box key="head" flexDirection="row" justifyContent="center"><Text bold>{`${nm.cat} and ${nm.pip} · ${stageWord(nowMs, s.joy)}`}</Text></Box>
        <Box key="art" flexDirection="row" justifyContent="center">
          {vector
            ? svg(paintBigSvg({ ...s, cols: Math.min(60, cols), cdir: 1 }, 8), 'The critter and the cat, large')
            : <Box flexDirection="column">{portrait.map((runs, i) => (
                <Text key={`p${i}`}>
                  {runs.map((r, j) => (
                    <Text key={`q${j}`} color={r.fg}>{r.text}</Text>
                  ))}
                </Text>
              ))}</Box>}
        </Box>
        <Box key="streak" flexDirection="row" justifyContent="center">
          <Text dimColor>{days >= 2 ? `day ${days} together${next ? ` · a ${next.prop} in ${next.inDays} day${next.inDays === 1 ? '' : 's'}` : ' · the lamp is lit'}` : 'come back tomorrow and the days begin to count'}</Text>
        </Box>
        {gap('g1')}
        <Text bold>{'Moods'}</Text>
        <Text>{moodLine('trust', s.trust)}</Text>
        <Text>{moodLine('joy', s.joy)}</Text>
        <Text dimColor>{`${s.stats.turns} turns · ${s.tools} tools · ${s.skills} skills`}</Text>
        <Text dimColor>{`${s.stats.errors} errors · ${s.stats.pets} pets · ${s.stats.commits} commits · ${s.stats.knocks} knocked off`}</Text>
        {gap('g2')}
        <Box key="actions" flexDirection="row" justifyContent="center">
          <Button key="p" label="pet" hotkey="p" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'pet'))} />
          <Text> </Text>
          <Button key="t" label="treat" hotkey="t" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'treat'))} />
          <Text> </Text>
          <Button key="n" label="nap" hotkey="n" onPress={() => update($, scene, (x: Scene): Scene => react(x, 'nap'))} />
        </Box>
        {gap('g3')}
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
        {gap('g4')}
        <Text bold>{`${nm.cat}'s diary`}</Text>
        {d.length === 0 && <Text dimColor>{`Nothing yet. ${nm.cat} is asleep.`}</Text>}
        {d.slice(-8).map((l, i, all) => {
          const { time, text } = diaryParts(l)
          const newest = i === all.length - 1 // the latest line reads at full strength, the rest recede
          return (
            <Text key={`d${i}`} dimColor={!newest}>
              <Text color="#4fa39a" dimColor={!newest}>{time ? `${time}  ` : ''}</Text>
              {text}
            </Text>
          )
        })}
      </Box>
    )
  })
}

// What the backdrop is made of right now: the hour, the season, the session's weather and whether the lights are up.
const skyArgs = skyArgsOf
const stageWord = (now: number, joy: number) => {
  const a = skyArgs(now, joy)
  const h = holidayOf(now)
  return [a.phase, a.season, a.weather === 'clear' ? undefined : a.weather, h?.name].filter(Boolean).join(' · ')
}
// Draw the backdrop again only when something it is made of changed; the desktop draws it, every other surface answers that it did not.
const syncSky = async ($: any, now: number, joy: number) => {
  if ((await read($, isHidden)) === true) return
  const a = skyArgs(now, joy)
  const key = skyFor(a).key
  if (key === lastSky) return
  lastSky = key
  await drawBackdrop($, { id: key, glass: glassOf(a.phase) })
}

// Not every host has a backdrop to draw on: a missing or refused call is not the mod's problem.
const drawBackdrop = async ($: any, arg: { id: string; glass: ReturnType<typeof glassOf> } | undefined) => {
  try {
    await $.ui.backdrop(arg)
  } catch {
    // no backdrop here
  }
}
