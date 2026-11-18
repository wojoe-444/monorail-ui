import type { NavItem } from '@/components/layout/nav'
import { ArticlePage } from '@/pages/learning/ArticlePage'
import { CheatSheetPage } from '@/pages/learning/CheatSheetPage'
import { CoursePage } from '@/pages/learning/CoursePage'
import { DecisionGuidePage } from '@/pages/learning/DecisionGuidePage'
import { HomeIntent } from '@/pages/learning/homes/HomeIntent'
import { HomeMagazine } from '@/pages/learning/homes/HomeMagazine'
import { HomePortal } from '@/pages/learning/homes/HomePortal'
import { HomeShelf } from '@/pages/learning/homes/HomeShelf'
import { HomeToday } from '@/pages/learning/homes/HomeToday'
import { HomeTransitMap } from '@/pages/learning/homes/HomeTransitMap'
import { HowToPage } from '@/pages/learning/HowToPage'
import { LabPage } from '@/pages/learning/LabPage'
import { LiveSessionsPage } from '@/pages/learning/LiveSessionsPage'
import { PodcastPage } from '@/pages/learning/PodcastPage'
import { ProgressPage } from '@/pages/learning/ProgressPage'
import { QuizPage } from '@/pages/learning/QuizPage'
import { TopicPage } from '@/pages/learning/TopicPage'
import { VideoSeriesPage } from '@/pages/learning/VideoSeriesPage'

/**
 * The Learning hub mockups: six takes on the hub's home page and twelve kinds
 * of page inside it. Each entry is a drawer subpage and a card on its index
 * page (`LearningIndexPage`), which draws `sketch` as a schematic.
 */
export interface Mockup extends Pick<NavItem, 'path' | 'label' | 'page' | 'layout' | 'description'> {
  letter: string
  /** Who it suits / what it's best at. */
  bestFor: string
  tradeoff: string
  /** Grid of [colSpan, rowSpan, tone] blocks drawn on a 6×4 grid. Tone p = primary, m = muted. */
  sketch: [number, number, 'p' | 'm'][]
}

export const HOME_MOCKUPS: Mockup[] = [
  {
    letter: 'A',
    path: '/learn/home/portal',
    label: 'Portal',
    page: HomePortal,
    description: 'Search first: one big box, shortcuts by format, then what’s new and popular.',
    bestFor: 'A big catalog where most people arrive knowing what they want.',
    tradeoff: 'Familiar and safe; says little about what the place stands for.',
    sketch: [
      [6, 1, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [4, 2, 'm'],
      [2, 2, 'm'],
    ],
  },
  {
    letter: 'B',
    path: '/learn/home/today',
    label: 'Today',
    page: HomeToday,
    description: 'A personal desk: pick up where you left off, what’s due, a nudge for the day.',
    bestFor: 'Returning learners with assignments, paths in flight and habits to keep.',
    tradeoff: 'Empty and odd for a first visit; needs a good new-person state.',
    sketch: [
      [4, 2, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [3, 2, 'm'],
      [3, 2, 'm'],
    ],
  },
  {
    letter: 'C',
    path: '/learn/home/magazine',
    label: 'Magazine',
    page: HomeMagazine,
    description: 'An editorial issue: a cover story, columns and a reading list, published weekly.',
    bestFor: 'Hubs with a voice and editors, where the writing is the point.',
    tradeoff: 'Needs a steady editorial rhythm or it looks abandoned fast.',
    sketch: [
      [4, 3, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
    ],
  },
  {
    letter: 'D',
    path: '/learn/home/map',
    label: 'Curriculum map',
    page: HomeTransitMap,
    description: 'Paths drawn as transit lines: every course a station, transfers where skills meet.',
    bestFor: 'Structured curricula where order and prerequisites matter.',
    tradeoff: 'Striking but costly to keep the map honest as content changes.',
    sketch: [
      [6, 3, 'p'],
      [3, 1, 'm'],
      [3, 1, 'm'],
    ],
  },
  {
    letter: 'E',
    path: '/learn/home/shelf',
    label: 'Screening room',
    page: HomeShelf,
    description: 'A streaming-style shelf: a featured series up top, rows of episodes to browse.',
    bestFor: 'Video-heavy hubs and casual, browse-to-discover learning.',
    tradeoff: 'Rewards watching over doing; text formats feel second-class.',
    sketch: [
      [6, 2, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
    ],
  },
  {
    letter: 'F',
    path: '/learn/home/intent',
    label: 'I need to…',
    page: HomeIntent,
    description: 'Intent first: start from the job in front of you, not from formats or topics.',
    bestFor: 'People who come to the hub mid-task and want the shortest route.',
    tradeoff: 'Only as good as the list of jobs; browsing for fun gets harder.',
    sketch: [
      [6, 1, 'm'],
      [3, 1, 'p'],
      [3, 1, 'p'],
      [3, 1, 'p'],
      [3, 1, 'p'],
    ],
  },
]

export const PAGE_MOCKUPS: Mockup[] = [
  {
    letter: '1',
    path: '/learn/how-to',
    label: 'How-to',
    page: HowToPage,
    description: 'A step-by-step procedure you follow while doing it, with checks along the way.',
    bestFor: 'Short, exact processes people need under pressure.',
    tradeoff: 'Brittle: one changed screen and a step is wrong.',
    sketch: [
      [6, 1, 'm'],
      [1, 3, 'm'],
      [5, 1, 'p'],
      [5, 1, 'm'],
      [5, 1, 'm'],
    ],
  },
  {
    letter: '2',
    path: '/learn/video',
    label: 'Video series',
    page: VideoSeriesPage,
    description: 'A player with chapters and transcript, and the series’ episodes beside it.',
    bestFor: 'Story-driven material and showing rather than telling.',
    tradeoff: 'Hard to skim; the transcript has to carry search and speed.',
    sketch: [
      [4, 3, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [4, 1, 'm'],
      [2, 1, 'm'],
    ],
  },
  {
    letter: '3',
    path: '/learn/article',
    label: 'Article',
    page: ArticlePage,
    description: 'Long-form reading: a calm column, margin notes and a reading position.',
    bestFor: 'Ideas, opinions and context that need room to argue.',
    tradeoff: 'Easy to start, rarely finished; needs a strong summary up top.',
    sketch: [
      [1, 4, 'm'],
      [4, 1, 'p'],
      [4, 3, 'm'],
      [1, 4, 'm'],
    ],
  },
  {
    letter: '4',
    path: '/learn/course',
    label: 'Learning path',
    page: CoursePage,
    description: 'A multi-module path: syllabus, progress, what’s next and who’s taking it.',
    bestFor: 'Larger skills taught in order over days or weeks.',
    tradeoff: 'Commitment up front scares people off; show the first step clearly.',
    sketch: [
      [6, 1, 'p'],
      [4, 1, 'm'],
      [2, 3, 'm'],
      [4, 1, 'm'],
      [4, 1, 'm'],
    ],
  },
  {
    letter: '5',
    path: '/learn/quiz',
    label: 'Quiz',
    page: QuizPage,
    description: 'One question at a time with instant, explained feedback.',
    bestFor: 'Checking understanding and required knowledge checks.',
    tradeoff: 'Feels like a test; the explanations are what make it learning.',
    sketch: [
      [6, 1, 'm'],
      [6, 2, 'p'],
      [3, 1, 'm'],
      [3, 1, 'm'],
    ],
  },
  {
    letter: '6',
    path: '/learn/cheat-sheet',
    label: 'Cheat sheet',
    page: CheatSheetPage,
    description: 'A dense, printable one-page reference you keep open in another tab.',
    bestFor: 'Things people look up, not learn: commands, shortcuts, syntax.',
    tradeoff: 'Teaches nothing on its own; link out to the why.',
    sketch: [
      [2, 2, 'm'],
      [2, 2, 'm'],
      [2, 2, 'm'],
      [2, 2, 'm'],
      [2, 2, 'p'],
      [2, 2, 'm'],
    ],
  },
  {
    letter: '7',
    path: '/learn/live',
    label: 'Live sessions',
    page: LiveSessionsPage,
    description: 'Workshops, office hours and reading groups on a calendar, with seats to claim.',
    bestFor: 'Learning that needs people in a room: practice, Q&A, cohorts.',
    tradeoff: 'Time zones and capacity; recordings need a home afterwards.',
    sketch: [
      [6, 1, 'm'],
      [4, 3, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [2, 1, 'm'],
    ],
  },
  {
    letter: '8',
    path: '/learn/podcast',
    label: 'Podcast',
    page: PodcastPage,
    description: 'An episode page: player, show notes, timestamped transcript, links mentioned.',
    bestFor: 'Conversations and stories people take on a walk or commute.',
    tradeoff: 'Invisible to skimmers unless the notes do the work.',
    sketch: [
      [6, 1, 'p'],
      [4, 3, 'm'],
      [2, 3, 'm'],
    ],
  },
  {
    letter: '9',
    path: '/learn/lab',
    label: 'Hands-on lab',
    page: LabPage,
    layout: 'full',
    description: 'Instructions on the left, a working sandbox on the right, checks that confirm each step.',
    bestFor: 'Skills you only get by doing: tools, systems, workflows.',
    tradeoff: 'The most expensive format to build and keep running.',
    sketch: [
      [2, 4, 'm'],
      [4, 3, 'p'],
      [4, 1, 'm'],
    ],
  },
  {
    letter: '10',
    path: '/learn/decision-guide',
    label: 'Decision guide',
    page: DecisionGuidePage,
    description: 'Answer a few questions, get a recommendation and the reasoning behind it.',
    bestFor: 'Choices with a house answer: which tool, which process, who to ask.',
    tradeoff: 'Opinionated by design; it needs an owner who keeps it current.',
    sketch: [
      [3, 1, 'm'],
      [3, 1, 'm'],
      [2, 1, 'p'],
      [2, 1, 'm'],
      [2, 1, 'm'],
      [6, 1, 'm'],
    ],
  },
  {
    letter: '11',
    path: '/learn/topic',
    label: 'Topic',
    page: TopicPage,
    description: 'Everything on one subject, sorted by how deep you want to go.',
    bestFor: 'The landing page for a subject: start here, then go deeper.',
    tradeoff: 'Turns into a link dump without a point of view on order.',
    sketch: [
      [6, 1, 'p'],
      [2, 2, 'm'],
      [2, 2, 'm'],
      [2, 2, 'm'],
      [6, 1, 'm'],
    ],
  },
  {
    letter: '12',
    path: '/learn/progress',
    label: 'My learning',
    page: ProgressPage,
    description: 'Your record: what you finished, what’s due, skills over time, certificates.',
    bestFor: 'Learners tracking growth, and managers checking required training.',
    tradeoff: 'Can drift into surveillance; keep it the learner’s own.',
    sketch: [
      [6, 1, 'm'],
      [4, 2, 'p'],
      [2, 2, 'm'],
      [6, 1, 'm'],
    ],
  },
]
