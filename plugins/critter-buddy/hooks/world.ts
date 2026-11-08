// The world around the pair: the hour, the season, the holidays of South Africa, the weather of the session and the days
// in a row you came back. Everything here is a pure function of an instant (epoch milliseconds, read in Africa/Johannesburg,
// UTC+2 with no daylight saving) or of the scene, so a replay paints the same sky and a test can pin it. Nothing here asks the
// network for anything: the weather is the session's own, not the forecast's.

const HOUR = 3_600_000
const DAY = 86_400_000
const SAST = 2 * HOUR

/** The Johannesburg calendar day of an instant, as YYYY-MM-DD. */
export const dayKey = (ms: number): string => new Date(ms + SAST).toISOString().slice(0, 10)
/** The hour in Johannesburg, 0 to 23. */
export const hourSast = (ms: number): number => Math.floor(((ms + SAST) % DAY) / HOUR)
const parts = (ms: number) => {
  const d = new Date(ms + SAST)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

// ---- the hour ------------------------------------------------------------------------
export type Phase = 'night' | 'dawn' | 'day' | 'dusk'
/** Night from 19 to 5, dawn 5 to 7, day 7 to 17, dusk 17 to 19. */
export const phaseOf = (hour: number): Phase => (hour >= 19 || hour < 5 ? 'night' : hour < 7 ? 'dawn' : hour < 17 ? 'day' : 'dusk')

// ---- the season (the southern hemisphere's) ----------------------------------------------
export type Season = 'summer' | 'autumn' | 'winter' | 'spring'
export const seasonOf = (ms: number): Season => {
  const { m } = parts(ms)
  return m === 12 || m <= 2 ? 'summer' : m <= 5 ? 'autumn' : m <= 8 ? 'winter' : 'spring'
}

// ---- the holidays ----------------------------------------------------------------------
export type Holiday = { key: string; name: string; line: string }
/** The date of Easter Sunday in the Gregorian calendar (the anonymous algorithm), as month and day. */
export const easterOf = (year: number): { m: number; d: number } => {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  return { m: month, d: ((h + l - 7 * m + 114) % 31) + 1 }
}

const FIXED: readonly (readonly [number, number, Holiday])[] = [
  [1, 1, { key: 'new-year', name: "New Year's Day", line: "new year. {cat} has made no resolutions and wants it known" }],
  [3, 21, { key: 'human-rights', name: 'Human Rights Day', line: 'Human Rights Day. {cat} claims the warm spot as a right' }],
  [4, 27, { key: 'freedom', name: 'Freedom Day', line: 'Freedom Day. {cat} was never fenced in, thank you' }],
  [5, 1, { key: 'workers', name: "Workers' Day", line: "Workers' Day. {pip} put his staff down. {cat} never picked one up" }],
  [6, 16, { key: 'youth', name: 'Youth Day', line: 'Youth Day. {pip} salutes. {cat} naps through the speeches' }],
  [8, 9, { key: 'women', name: "National Women's Day", line: "Women's Day. {cat} runs this house and always has" }],
  [9, 24, { key: 'heritage', name: 'Heritage Day', line: 'Heritage Day. {cat} watches the braai from a respectful distance' }],
  [12, 16, { key: 'reconciliation', name: 'Day of Reconciliation', line: 'Day of Reconciliation. {cat} and {pip} are speaking again' }],
  [12, 25, { key: 'christmas', name: 'Christmas Day', line: 'Christmas. {pip} strung the lights. {cat} is under the tree' }],
  [12, 26, { key: 'goodwill', name: 'Day of Goodwill', line: 'Day of Goodwill. {cat} shows some. A little' }],
]
const GOOD_FRIDAY: Holiday = { key: 'good-friday', name: 'Good Friday', line: 'Good Friday. {pip} keeps the orb low and quiet' }
const FAMILY_DAY: Holiday = { key: 'family-day', name: 'Family Day', line: 'Family Day. {cat} and {pip} are, technically, family' }

/** The public holiday on an instant's Johannesburg day, if there is one. A holiday that falls on a Sunday is kept on the Monday too. */
export const holidayOf = (ms: number): Holiday | undefined => {
  const { y, m, d } = parts(ms)
  const at = (mm: number, dd: number) => Date.UTC(y, mm - 1, dd)
  const today = at(m, d)
  const table: [number, Holiday][] = FIXED.map(([mm, dd, h]) => [at(mm, dd), h])
  const e = easterOf(y)
  table.push([at(e.m, e.d) - 2 * DAY, GOOD_FRIDAY], [at(e.m, e.d) + DAY, FAMILY_DAY])
  for (const [t, h] of [...table]) if (new Date(t).getUTCDay() === 0) table.push([t + DAY, h])
  return table.find(([t]) => t === today)?.[1]
}
/** The weeks of lights: the 14th of December to the 1st of January. */
export const festiveOf = (ms: number): boolean => {
  const { m, d } = parts(ms)
  return (m === 12 && d >= 14) || (m === 1 && d === 1)
}

// ---- the session's weather -----------------------------------------------------------------
export type Weather = 'clear' | 'cloud' | 'rain' | 'storm'
/** The weather is the pair's joy: errors darken it, a green test, a commit or a treat clear it. No forecast is asked for. */
export const weatherOf = (joy: number): Weather => (joy < 25 ? 'storm' : joy < 45 ? 'rain' : joy < 60 ? 'cloud' : 'clear')

// ---- the streak ----------------------------------------------------------------------------------
export type Streak = { days: number; last: string }
const dayBefore = (key: string): string => new Date(Date.parse(`${key}T00:00:00Z`) - DAY).toISOString().slice(0, 10)
/** One more day of showing up. The same day twice counts once; a missed day starts again at one. */
export const streakNext = (prev: Streak | undefined, today: string): Streak => {
  if (!prev || typeof prev.days !== 'number' || typeof prev.last !== 'string') return { days: 1, last: today }
  if (prev.last === today) return prev
  return prev.last === dayBefore(today) ? { days: prev.days + 1, last: today } : { days: 1, last: today }
}
/** The streak as it stands on `today`: a streak that last grew before yesterday is already over. */
export const streakAlive = (prev: Streak | undefined, today: string): number =>
  prev && (prev.last === today || prev.last === dayBefore(today)) ? prev.days : 0
export type Prop = 'yarn' | 'cushion' | 'plant' | 'lamp'
/** What the cat has earned to keep on the bar: a ball of yarn at 3 days, a cushion at 7, a plant at 14, a lamp at 30. */
export const propsFor = (days: number): Prop[] => (['yarn', 'cushion', 'plant', 'lamp'] as const).filter((_, i) => days >= [3, 7, 14, 30][i]!)

/** The next prop and how many more days it needs, or undefined once the lamp is earned. */
export const nextProp = (days: number): { prop: Prop; inDays: number } | undefined => {
  const all = [['yarn', 3], ['cushion', 7], ['plant', 14], ['lamp', 30]] as const
  const n = all.find(([, d]) => days < d)
  return n ? { prop: n[0], inDays: n[1] - Math.max(0, days) } : undefined
}

// ---- the sky -------------------------------------------------------------------------------------
const STARS = Array.from({ length: 22 }, (_, i) => {
  const a = Math.imul(i + 1, 2654435761) >>> 0
  const b = Math.imul(i + 11, 1664525) >>> 0
  return { top: a % 34, left: b % 150, big: i % 5 === 0 }
})
const place = (n: number, salt: number, rows: number, cols: number) =>
  Array.from({ length: n }, (_, i) => ({ top: (Math.imul(i + salt, 2246822519) >>> 0) % rows, left: (Math.imul(i + salt + 7, 3266489917) >>> 0) % cols }))

const PAPER: Record<Phase, string> = { night: '#141413', dawn: '#f6e9df', day: '#faf9f5', dusk: '#2b2236' }
const GROUND: Record<Phase, Record<Season, string>> = {
  day: { summer: '#f4ecd6', autumn: '#f1e6d4', winter: '#e9edf0', spring: '#eef0e0' },
  dawn: { summer: '#efdcc9', autumn: '#ecd8c6', winter: '#e4dde0', spring: '#e9e2cf' },
  dusk: { summer: '#352a3a', autumn: '#35292f', winter: '#2a2c3c', spring: '#2f2c3a' },
  night: { summer: '#1c1b19', autumn: '#1d1a18', winter: '#181b20', spring: '#1a1c19' },
}
const CLOUD_COLOUR: Record<Phase, Record<Weather, string>> = {
  day: { clear: '#e6e2d6', cloud: '#d9d4c7', rain: '#c4c4c2', storm: '#a9a9ad' },
  dawn: { clear: '#ecd9cd', cloud: '#e2cdc2', rain: '#cbbdb8', storm: '#b2a6ab' },
  dusk: { clear: '#3a3046', cloud: '#40364c', rain: '#4a4456', storm: '#58506a' },
  night: { clear: '#232228', cloud: '#2a2930', rain: '#34343c', storm: '#42424d' },
}

/** The window behind the conversation, from the hour, the season, the session's weather and the holiday. */
export const skyFor = (o: { phase: Phase; season: Season; weather: Weather; festive: boolean }) => {
  const dark = o.phase === 'night' || o.phase === 'dusk'
  const cloudy = o.weather !== 'clear'
  return {
    key: `${o.phase}-${o.season}-${o.weather}-${o.festive ? 'lights' : 'plain'}`,
    paper: PAPER[o.phase],
    ground: GROUND[o.phase][o.season],
    body: dark && o.phase === 'night' ? '☾' : '●',
    bodyColor: o.phase === 'night' ? '#efe4c4' : o.phase === 'dusk' ? '#e0875f' : o.phase === 'dawn' ? '#eeb07f' : '#d4a548',
    bodyTop: o.phase === 'day' ? 2 : 8, // the sun is low at dawn and dusk
    bodyHidden: o.weather === 'storm', // a storm hides it
    stars: o.phase === 'night' && o.weather !== 'storm' ? STARS : o.phase === 'dusk' ? STARS.slice(0, 8) : ([] as typeof STARS),
    cloudColour: CLOUD_COLOUR[o.phase][o.weather],
    clouds: cloudy ? place(o.weather === 'cloud' ? 3 : 6, 3, 10, 130) : ([] as { top: number; left: number }[]),
    rain: o.weather === 'rain' ? place(26, 40, 30, 150) : o.weather === 'storm' ? place(60, 40, 30, 150) : ([] as { top: number; left: number }[]),
    bolt: o.weather === 'storm' ? { top: 6, left: 74 } : undefined,
    lights: o.festive,
  }
}
/** The glass of the desktop window, tinted by the hour. */
export const glassOf = (p: Phase): { blur: number; opacity: number; tint: string } =>
  p === 'night' ? { blur: 18, opacity: 0.6, tint: '#1c1838' }
  : p === 'dusk' ? { blur: 16, opacity: 0.55, tint: '#2b2236' }
  : p === 'dawn' ? { blur: 14, opacity: 0.5, tint: '#f6e9df' }
  : { blur: 14, opacity: 0.5, tint: '#faf9f5' }
