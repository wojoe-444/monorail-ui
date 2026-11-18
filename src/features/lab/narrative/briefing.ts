/**
 * Briefing, Spoken: a sentence is a list of parts. Plain parts are words;
 * figure parts are numbers with an exact-value tip and, for speech, a `say`
 * form ("85 grams per kilowatt hour" for "85 g/kWh"). The spoken string and
 * each part's offsets in it are computed once, so the browser's word
 * boundary events can be mapped back to the part to highlight.
 */

export type Glyph = { kind: 'trend' | 'counts'; values: { label: string; value: number; text: string }[]; summary: string }

export type Part = string | { text: string; say?: string; tip?: string; glyph?: Glyph }

export interface Sentence {
  id: string
  parts: Part[]
}

export interface Segment {
  id: string
  /** lower comes first and survives shorter lengths */
  priority: number
  short: Sentence[]
  long: Sentence[]
}

export interface Token {
  text: string
  /** offsets in the spoken string */
  start: number
  end: number
  figure?: { tip?: string; glyph?: Glyph }
}

export interface Prepared {
  id: string
  spoken: string
  tokens: Token[]
  words: number
}

/** Split plain parts into word tokens (keeping trailing spaces/punctuation with the word) and record spoken offsets. */
export function prepare(s: Sentence): Prepared {
  let spoken = ''
  const tokens: Token[] = []
  for (const p of s.parts) {
    if (typeof p === 'string') {
      for (const m of p.matchAll(/\S+\s*|\s+/g)) {
        const t = m[0]
        tokens.push({ text: t, start: spoken.length, end: spoken.length + t.length })
        spoken += t
      }
    } else {
      const say = p.say ?? p.text
      tokens.push({ text: p.text, start: spoken.length, end: spoken.length + say.length, figure: p.tip || p.glyph ? { tip: p.tip, glyph: p.glyph } : undefined })
      spoken += say
    }
  }
  return { id: s.id, spoken, tokens, words: spoken.split(/\s+/).filter(Boolean).length }
}

/** Pick segments within a word budget: priority order, long forms when there's room, short otherwise. */
export function compose(segments: Segment[], budgetWords: number, preferLong: boolean): Sentence[] {
  const sorted = [...segments].sort((a, b) => a.priority - b.priority)
  const count = (ss: Sentence[]) => ss.reduce((n, s) => n + prepare(s).words, 0)
  const chosen: { seg: Segment; form: Sentence[] }[] = []
  let used = 0
  for (const seg of sorted) {
    const long = count(seg.long)
    const short = count(seg.short)
    if (preferLong && used + long <= budgetWords) {
      chosen.push({ seg, form: seg.long })
      used += long
    } else if (used + short <= budgetWords || seg.priority <= 0 || seg.id === 'close') {
      chosen.push({ seg, form: seg.short })
      used += short
    }
  }
  // Keep the briefing's reading order: greeting, then stories by priority, closing last.
  return chosen
    .sort((a, b) => (a.seg.id === 'close' ? 1 : b.seg.id === 'close' ? -1 : a.seg.priority - b.seg.priority))
    .flatMap((c) => c.form)
}

export const LENGTHS = {
  short: { label: '30 sec', words: 80, long: false },
  medium: { label: '1 min', words: 160, long: false },
  long: { label: '3 min', words: 460, long: true },
} as const
export type Length = keyof typeof LENGTHS

/** Spoken numbers read better rounded and with units in words. */
export const sayDeg = (n: number) => `${n < 0 ? 'minus ' : ''}${Math.abs(n)} degrees`

const COMPASS: Record<string, string> = {
  N: 'north', S: 'south', E: 'east', W: 'west',
  NE: 'northeast', NW: 'northwest', SE: 'southeast', SW: 'southwest',
  NNE: 'north-northeast', ENE: 'east-northeast', ESE: 'east-southeast', SSE: 'south-southeast',
  SSW: 'south-southwest', WSW: 'west-southwest', WNW: 'west-northwest', NNW: 'north-northwest',
}
/** "148 km WSW of Tual, Indonesia" → "148 kilometers west-southwest of Tual, Indonesia" for the voice. */
export function sayPlace(place: string): string {
  return place.replace(/(\d+) km ([NSEW]{1,3}) of/, (_, n, d) => `${n} kilometers ${COMPASS[d] ?? d} of`).replace(/, CA$/, ', California')
}
