/*
 * Sample content for the Video series mockup (/learn/video): the six episodes
 * of "Failure Modes", with chapters, a full transcript for episode 4 (where
 * Priya is) and the resources each episode mentions.
 */

export interface Chapter {
  /** Seconds from the start. */
  at: number
  title: string
  /** Short transcript stand-in for episodes without a full transcript. */
  line?: string
}

export interface TranscriptLine {
  at: number
  speaker: 'mara' | 'kwame' | 'june' | 'ben'
  text: string
}

export interface Resource {
  title: string
  kind: 'Postmortem' | 'Repository' | 'Lab' | 'Podcast' | 'Article' | 'RFC'
  /** When it comes up in the episode, in seconds. */
  at: number
  path?: string
}

export interface Episode {
  n: number
  title: string
  summary: string
  /** Seconds. */
  duration: number
  guest?: string
  state: 'watched' | 'progress' | 'next' | 'new'
  /** Where Priya stopped, for the episode in progress. */
  position?: number
  chapters: Chapter[]
  transcript?: TranscriptLine[]
  resources: Resource[]
}

export const SERIES = {
  title: 'Failure Modes',
  host: 'mara',
  summary: 'Six episodes on how real systems break, told by the engineers who were paged.',
}

export const EPISODES: Episode[] = [
  {
    n: 1,
    title: 'The cache that ate Tuesday',
    summary: 'A routine deploy, a cold cache and a four-hour slowdown. What “warm-up” really costs, and how to pay it on purpose.',
    duration: 14 * 60,
    state: 'watched',
    chapters: [
      { at: 0, title: 'Tuesday, 10:02', line: 'The deploy went out clean. Nine minutes later, search latency tripled and stayed there.' },
      {
        at: 250,
        title: 'What a cold cache costs',
        line: 'Every miss went to the database, and the database had never seen this much traffic at once.',
      },
      {
        at: 590,
        title: 'Warming on purpose',
        line: 'We now replay an hour of real reads into a new cache before it takes a single request.',
      },
    ],
    resources: [{ title: 'INC-2104: Search slowdown after deploy', kind: 'Postmortem', at: 40 }],
  },
  {
    n: 2,
    title: 'Clocks lie',
    summary:
      'Two servers disagreed about the time by 900 milliseconds. Some customers were charged twice. A story about ordering, idempotency and humility.',
    duration: 15 * 60,
    guest: 'june',
    state: 'watched',
    chapters: [
      { at: 0, title: 'The double charge', line: 'Support had eleven tickets before breakfast, all saying the same thing: I paid twice.' },
      { at: 310, title: 'Whose clock is right?', line: 'Neither. That is the uncomfortable answer, and the design has to start from it.' },
      { at: 640, title: 'Idempotency keys, properly', line: 'One key per customer intent, checked before any money moves. Not after.' },
    ],
    resources: [{ title: 'Idempotency at Kestrel', kind: 'RFC', at: 660 }],
  },
  {
    n: 3,
    title: 'The thundering herd',
    summary: 'A cron job at midnight UTC, ten thousand mobile clients and one very unhappy database.',
    duration: 16 * 60,
    state: 'watched',
    chapters: [
      { at: 0, title: 'Midnight, every night', line: 'The graph had a spike at 00:00 UTC every day for a year. Nobody had asked why.' },
      {
        at: 330,
        title: 'Ten thousand alarm clocks',
        line: 'Every client synced on the hour, because the hour is the obvious time to pick.',
      },
      { at: 700, title: 'Spreading the load', line: 'A random offset per device. Three lines of code, and the spike was gone.' },
    ],
    resources: [{ title: 'INC-2187: Nightly sync overload', kind: 'Postmortem', at: 30 }],
  },
  {
    n: 4,
    title: 'Retries all the way down',
    summary:
      'Three sensible retry policies, set by three teams in three different years, multiplied into a 41-minute payments outage. With Kwame Mensah, who was on call.',
    duration: 14 * 60,
    guest: 'kwame',
    state: 'progress',
    position: 372,
    chapters: [
      { at: 0, title: 'Cold open: 2:14 a.m.' },
      { at: 90, title: 'What a retry promises' },
      { at: 245, title: 'Three layers, twenty-seven calls' },
      { at: 352, title: 'Why the dashboards looked fine' },
      { at: 480, title: 'Budgets, backoff and jitter' },
      { at: 640, title: 'What we changed' },
      { at: 760, title: 'Take it back to your team' },
    ],
    transcript: [
      {
        at: 0,
        speaker: 'kwame',
        text: 'The page came in at 2:14. Ledger p99 was up, not dramatically, maybe two hundred milliseconds. I almost went back to sleep.',
      },
      {
        at: 14,
        speaker: 'mara',
        text: 'This is Failure Modes. I’m Mara Okafor. Each episode we take one real incident at Kestrel and ask how a system that looked healthy fell over.',
      },
      {
        at: 27,
        speaker: 'mara',
        text: 'Tonight: the March ledger outage. Forty-one minutes of failed card payments, and not one server actually crashed.',
      },
      {
        at: 41,
        speaker: 'kwame',
        text: 'Which is the part nobody believed the next morning. Every box was up. CPU was fine. We were just very busy doing nothing useful.',
      },
      { at: 58, speaker: 'mara', text: 'So let’s start with the thing that did it. A retry.' },
      {
        at: 90,
        speaker: 'mara',
        text: 'A retry makes a promise: if this failed for a boring reason, a dropped packet, a blip, trying again will probably work.',
      },
      {
        at: 104,
        speaker: 'mara',
        text: 'And most of the time the promise holds. That’s what makes it dangerous. It works so often that we stop asking what happens when the failure isn’t a blip.',
      },
      {
        at: 121,
        speaker: 'kwame',
        text: 'Our checkout client retried three times. The API gateway retried three times. And the payments service retried its call to the ledger three times.',
      },
      { at: 138, speaker: 'mara', text: 'Each of those was a reasonable decision, made by a different team, in a different year.' },
      { at: 150, speaker: 'kwame', text: 'Right. Nobody ever saw all three at once. They lived in three different config files.' },
      {
        at: 170,
        speaker: 'mara',
        text: 'Pause here if you like and work it out: if the ledger slows down, how many requests does one tap of the Pay button turn into?',
      },
      { at: 245, speaker: 'mara', text: 'Three times three times three. One customer tap becomes up to twenty-seven calls to the ledger.' },
      {
        at: 258,
        speaker: 'kwame',
        text: 'And the ledger was slow because it was busy. So we answered “you’re busy” by sending it twenty-seven times the work.',
      },
      {
        at: 272,
        speaker: 'mara',
        text: 'This is retry amplification. Every layer multiplies the load on the layer below it, and the bottom layer is usually the one that’s struggling.',
      },
      {
        at: 296,
        speaker: 'kwame',
        text: 'By 2:21 the ledger’s connection pool was saturated. From there every timeout produced more retries, which produced more timeouts.',
      },
      { at: 318, speaker: 'mara', text: 'A feedback loop. The system had found a new stable state, and it was the wrong one.' },
      {
        at: 334,
        speaker: 'kwame',
        text: 'Rolling back the deploy didn’t help, because the deploy wasn’t the cause. It was only the push.',
      },
      {
        at: 352,
        speaker: 'mara',
        text: 'Which brings us to the second surprise. For the first twenty minutes, the dashboards said we were mostly fine.',
      },
      { at: 368, speaker: 'kwame', text: 'Success rate on the gateway read ninety-four percent. Not great, but not wake-the-VP bad.' },
      {
        at: 384,
        speaker: 'mara',
        text: 'Because the gateway was counting attempts, not customers. A payment that failed twice and then went through counted as two failures and a success.',
      },
      {
        at: 404,
        speaker: 'kwame',
        text: 'Meanwhile real customers were waiting eleven seconds and giving up. The retries hid the pain from us and handed it to them.',
      },
      {
        at: 424,
        speaker: 'mara',
        text: 'If you take one thing from this chapter: measure what the customer experiences. One tap, one outcome.',
      },
      {
        at: 445,
        speaker: 'kwame',
        text: 'We now chart “succeeded on first try” next to “succeeded at all”. When those two lines split apart, something is retrying hard.',
      },
      {
        at: 480,
        speaker: 'mara',
        text: 'So what do you do instead? Not “never retry”. Retries are good. Unbounded retries are the problem.',
      },
      {
        at: 496,
        speaker: 'mara',
        text: 'Three tools. First, a retry budget: retries can be at most, say, ten percent of your traffic. Over budget, you fail fast.',
      },
      { at: 517, speaker: 'kwame', text: 'That one change would have capped us at about 1.1 times normal load, instead of twenty-seven.' },
      {
        at: 533,
        speaker: 'mara',
        text: 'Second, exponential backoff: wait longer after each failure, so the thing you’re calling has room to recover.',
      },
      {
        at: 550,
        speaker: 'mara',
        text: 'Third, jitter. Add randomness to the wait, so ten thousand clients don’t all retry on the same millisecond.',
      },
      {
        at: 568,
        speaker: 'kwame',
        text: 'We had backoff. We didn’t have jitter. So every client woke up together, like alarm clocks in a dormitory.',
      },
      {
        at: 586,
        speaker: 'mara',
        text: 'And one rule under all three: retry at one layer only. Usually the one closest to the person, because it knows whether anyone is still waiting.',
      },
      {
        at: 610,
        speaker: 'kwame',
        text: 'Which means deeper services should say clearly when they’re overloaded. A 503 with Retry-After, not a slow timeout.',
      },
      {
        at: 640,
        speaker: 'kwame',
        text: 'The fix list was short. Retries removed from the gateway entirely. Payments-to-ledger retries moved behind a budget.',
      },
      { at: 660, speaker: 'kwame', text: 'Jitter everywhere, through the shared kestrel/retry library, so nobody hand-rolls it again.' },
      {
        at: 676,
        speaker: 'mara',
        text: 'And a load test that slows the ledger by two hundred milliseconds on purpose, every week, in staging.',
      },
      { at: 694, speaker: 'kwame', text: 'The first time we ran it, it found a fourth retry layer. In the mobile app.' },
      { at: 706, speaker: 'mara', text: 'Of course it did.' },
      {
        at: 716,
        speaker: 'kwame',
        text: 'Every change went out behind a feature flag, to five percent first. If you haven’t done that before, there’s a lab for it.',
      },
      {
        at: 760,
        speaker: 'mara',
        text: 'Three questions to ask about your own service this week. One: how many layers retry, end to end? Write the multiplication down.',
      },
      { at: 782, speaker: 'mara', text: 'Two: is there a budget, or can retries grow without limit?' },
      { at: 794, speaker: 'mara', text: 'Three: does your success metric count customers, or attempts?' },
      { at: 808, speaker: 'kwame', text: 'And if you can’t answer the first one, that is the answer.' },
      {
        at: 820,
        speaker: 'mara',
        text: 'Next time on Failure Modes: the config push. One typo, four regions, and why we now deploy config like code.',
      },
    ],
    resources: [
      { title: 'INC-2291: Ledger retry storm', kind: 'Postmortem', at: 27 },
      { title: 'Night Shift, ep. 14: The 3 a.m. rollback', kind: 'Podcast', at: 334, path: '/learn/podcast' },
      { title: 'How charts lie (and how ours won’t)', kind: 'Article', at: 445 },
      { title: 'RFC-118: Retry at one layer', kind: 'RFC', at: 586 },
      { title: 'kestrel/retry', kind: 'Repository', at: 660 },
      { title: 'Ship behind a feature flag', kind: 'Lab', at: 716, path: '/learn/lab' },
    ],
  },
  {
    n: 5,
    title: 'The config push',
    summary: 'One typo, four regions, nine minutes. Why we now review and roll out configuration exactly like code.',
    duration: 17 * 60,
    guest: 'ben',
    state: 'next',
    chapters: [
      {
        at: 0,
        title: 'It was only a config change',
        line: 'Nobody reviews a one-line YAML change. That was the rule, until this Thursday.',
      },
      {
        at: 380,
        title: 'Everywhere at once',
        line: 'Code went out region by region. Config went out to all four regions in the same second.',
      },
      { at: 760, title: 'Config is code', line: 'Same review, same staged rollout, same rollback button. No exceptions for “small”.' },
    ],
    resources: [{ title: 'INC-2302: Global config rollout', kind: 'Postmortem', at: 20 }],
  },
  {
    n: 6,
    title: 'Writing it up',
    summary: 'The blameless review: what we write after an incident, who it is for, and how to make people actually read it.',
    duration: 18 * 60,
    state: 'new',
    chapters: [
      { at: 0, title: 'Nobody reads postmortems', line: 'We counted. The median postmortem was opened four times, mostly by its authors.' },
      { at: 420, title: 'Blameless is not nameless', line: 'Say who did what. Then ask why it made sense to them at the time.' },
      { at: 820, title: 'The one-page review', line: 'What happened, what it cost, what we changed. The rest goes in an appendix.' },
    ],
    resources: [{ title: 'Write a proposal that gets a decision', kind: 'Article', at: 900 }],
  },
]

/** "6:12" / "14:00". */
export function clock(s: number): string {
  const t = Math.max(0, Math.floor(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
