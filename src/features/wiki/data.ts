/*
 * Sample content for the wiki layout drafts: Chicago 'L' rapid transit.
 * Figures are illustrative (rounded or invented for the mockups), not
 * authoritative. Swap this file for real content once a layout is picked.
 */

export type LineId = 'red' | 'blue' | 'brown' | 'green' | 'orange' | 'pink' | 'purple' | 'yellow'

export interface Line {
  id: LineId
  name: string
  terminals: [string, string]
  stations: number
  lengthMi: number
  opened: number
  owl: boolean
  /** Average weekday entries, thousands. Illustrative. */
  weekdayK: number
  /** Last 12 months of weekday entries, thousands. Illustrative. */
  trend: number[]
}

export const LINES: Line[] = [
  { id: 'red', name: 'Red Line', terminals: ['Howard', '95th/Dan Ryan'], stations: 33, lengthMi: 23.4, opened: 1900, owl: true, weekdayK: 152, trend: [138, 141, 144, 147, 150, 149, 151, 153, 150, 148, 151, 152] },
  { id: 'blue', name: 'Blue Line', terminals: ["O'Hare", 'Forest Park'], stations: 33, lengthMi: 26.9, opened: 1895, owl: true, weekdayK: 104, trend: [92, 94, 95, 97, 99, 101, 100, 103, 102, 101, 103, 104] },
  { id: 'brown', name: 'Brown Line', terminals: ['Kimball', 'Loop'], stations: 27, lengthMi: 11.4, opened: 1907, owl: false, weekdayK: 61, trend: [55, 56, 57, 58, 58, 59, 60, 60, 59, 60, 61, 61] },
  { id: 'green', name: 'Green Line', terminals: ['Harlem/Lake', 'Ashland/63rd · Cottage Grove'], stations: 30, lengthMi: 20.8, opened: 1892, owl: false, weekdayK: 38, trend: [33, 34, 34, 35, 35, 36, 36, 37, 37, 37, 38, 38] },
  { id: 'orange', name: 'Orange Line', terminals: ['Midway', 'Loop'], stations: 16, lengthMi: 13.0, opened: 1993, owl: false, weekdayK: 33, trend: [29, 29, 30, 30, 31, 31, 32, 32, 32, 33, 33, 33] },
  { id: 'pink', name: 'Pink Line', terminals: ['54th/Cermak', 'Loop'], stations: 22, lengthMi: 11.2, opened: 2006, owl: false, weekdayK: 18, trend: [15, 15, 16, 16, 16, 17, 17, 17, 18, 17, 18, 18] },
  { id: 'purple', name: 'Purple Line', terminals: ['Linden', 'Howard · Loop (rush)'], stations: 27, lengthMi: 3.9, opened: 1908, owl: false, weekdayK: 14, trend: [11, 11, 12, 12, 12, 13, 13, 13, 13, 14, 14, 14] },
  { id: 'yellow', name: 'Yellow Line', terminals: ['Dempster-Skokie', 'Howard'], stations: 3, lengthMi: 4.7, opened: 1964, owl: false, weekdayK: 2, trend: [1.6, 1.7, 1.7, 1.8, 1.8, 1.9, 1.9, 2, 2, 2, 2.1, 2.1] },
]

export const LINE_BY_ID = Object.fromEntries(LINES.map((l) => [l.id, l])) as Record<LineId, Line>

export interface Station {
  id: number
  name: string
  lines: LineId[]
  area: string
  accessible: boolean
  opened: number
  /** Average weekday entries. Illustrative. */
  weekday: number
}

export const STATIONS: Station[] = [
  { id: 40380, name: 'Clark/Lake', lines: ['blue', 'brown', 'green', 'orange', 'pink', 'purple'], area: 'Loop', accessible: true, opened: 1897, weekday: 15400 },
  { id: 41320, name: 'Belmont', lines: ['red', 'brown', 'purple'], area: 'Lake View', accessible: true, opened: 1900, weekday: 11900 },
  { id: 40890, name: "O'Hare", lines: ['blue'], area: "O'Hare", accessible: true, opened: 1984, weekday: 10800 },
  { id: 41450, name: 'Chicago', lines: ['red'], area: 'Near North Side', accessible: true, opened: 1943, weekday: 13200 },
  { id: 41400, name: 'Roosevelt', lines: ['red', 'green', 'orange'], area: 'South Loop', accessible: true, opened: 1892, weekday: 9800 },
  { id: 40900, name: 'Howard', lines: ['red', 'purple', 'yellow'], area: 'Rogers Park', accessible: true, opened: 1908, weekday: 6100 },
  { id: 40450, name: '95th/Dan Ryan', lines: ['red'], area: 'Roseland', accessible: true, opened: 1969, weekday: 8700 },
  { id: 41220, name: 'Fullerton', lines: ['red', 'brown', 'purple'], area: 'Lincoln Park', accessible: true, opened: 1900, weekday: 10400 },
  { id: 40590, name: 'Damen', lines: ['blue'], area: 'Wicker Park', accessible: false, opened: 1895, weekday: 5200 },
  { id: 41290, name: 'Kimball', lines: ['brown'], area: 'Albany Park', accessible: true, opened: 1907, weekday: 3300 },
  { id: 40930, name: 'Midway', lines: ['orange'], area: 'Garfield Ridge', accessible: true, opened: 1993, weekday: 4600 },
  { id: 41660, name: 'Lake', lines: ['red'], area: 'Loop', accessible: true, opened: 1943, weekday: 12600 },
  { id: 40260, name: 'State/Lake', lines: ['brown', 'green', 'orange', 'pink', 'purple'], area: 'Loop', accessible: false, opened: 1895, weekday: 7800 },
  { id: 40370, name: 'Washington', lines: ['blue'], area: 'Loop', accessible: false, opened: 1951, weekday: 6900 },
  { id: 41020, name: 'Logan Square', lines: ['blue'], area: 'Logan Square', accessible: true, opened: 1970, weekday: 5600 },
  { id: 40830, name: '18th', lines: ['pink'], area: 'Pilsen', accessible: true, opened: 1896, weekday: 1700 },
  { id: 40050, name: 'Davis', lines: ['purple'], area: 'Evanston', accessible: true, opened: 1908, weekday: 3100 },
  { id: 41190, name: 'Jarvis', lines: ['red'], area: 'Rogers Park', accessible: false, opened: 1908, weekday: 1900 },
  { id: 40140, name: 'Dempster-Skokie', lines: ['yellow'], area: 'Skokie', accessible: true, opened: 1964, weekday: 1100 },
  { id: 40510, name: 'Garfield', lines: ['green'], area: 'Washington Park', accessible: true, opened: 1892, weekday: 1600 },
  { id: 41510, name: 'Morgan', lines: ['green', 'pink'], area: 'West Loop', accessible: true, opened: 2012, weekday: 4200 },
  { id: 40710, name: 'Chicago/Franklin', lines: ['brown', 'purple'], area: 'River North', accessible: true, opened: 1900, weekday: 5300 },
  { id: 41090, name: 'Monroe', lines: ['red'], area: 'Loop', accessible: false, opened: 1943, weekday: 7400 },
  { id: 40390, name: 'Forest Park', lines: ['blue'], area: 'Forest Park', accessible: true, opened: 1953, weekday: 2400 },
  { id: 40920, name: 'Pulaski', lines: ['pink'], area: 'Little Village', accessible: true, opened: 1902, weekday: 1300 },
  { id: 41700, name: 'Washington/Wabash', lines: ['brown', 'green', 'orange', 'pink', 'purple'], area: 'Loop', accessible: true, opened: 2017, weekday: 9100 },
]

export interface RecentEdit {
  title: string
  path: string
  editor: string
  when: string
  summary: string
  kind: 'edit' | 'new' | 'review'
}

export const RECENT_EDITS: RecentEdit[] = [
  { title: 'Red Line', path: '/wiki/article', editor: 'M. Okafor', when: '12 min ago', summary: 'Updated Red Line Extension timeline', kind: 'edit' },
  { title: "Daily 'L' station entries", path: '/wiki/dataset', editor: 'J. Ruiz', when: '1 h ago', summary: 'Documented the daytype column', kind: 'edit' },
  { title: 'Clark/Lake', path: '/wiki/station', editor: 'A. Novak', when: '3 h ago', summary: 'New page', kind: 'new' },
  { title: 'Slow zone reporting', path: '/wiki/docs', editor: 'S. Patel', when: 'Yesterday', summary: 'Needs review after process change', kind: 'review' },
  { title: 'Glossary: headway', path: '/wiki/glossary', editor: 'K. Lee', when: 'Yesterday', summary: 'Clarified scheduled vs. actual', kind: 'edit' },
  { title: "History of the 'L'", path: '/wiki/timeline', editor: 'D. Brooks', when: '2 days ago', summary: 'Added 1993 color naming', kind: 'edit' },
]

export const CATEGORIES = [
  { id: 'lines', label: 'Lines & routes', count: 8, blurb: 'Every rail line: terminals, branches, service patterns.' },
  { id: 'stations', label: 'Stations', count: 145, blurb: 'Station pages with accessibility, transfers and ridership.' },
  { id: 'datasets', label: 'Datasets', count: 37, blurb: 'Data dictionaries for ridership, GTFS, on-time performance.' },
  { id: 'ops', label: 'Operations', count: 62, blurb: 'Runbooks and procedures for service changes and incidents.' },
  { id: 'fleet', label: 'Rolling stock', count: 14, blurb: 'Railcar series, maintenance cycles, yards and shops.' },
  { id: 'history', label: 'History', count: 41, blurb: 'Elevated companies, consolidation, and major projects.' },
] as const

export interface GlossaryTerm {
  term: string
  definition: string
  seeAlso?: string[]
  tag: 'Operations' | 'Data' | 'Infrastructure' | 'Fares'
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Consist', tag: 'Operations', definition: 'The set of railcars coupled together to form one train, and their order.', seeAlso: ['Married pair'] },
  { term: 'Daytype', tag: 'Data', definition: "Ridership datasets tag each date as W (weekday), A (Saturday) or U (Sunday/holiday). Holidays follow the Sunday schedule, so they're coded U.", seeAlso: ['Station entry'] },
  { term: 'Deadhead', tag: 'Operations', definition: 'A train moving without passengers, usually between a yard and the start of its run.', seeAlso: ['Revenue service'] },
  { term: 'Dwell time', tag: 'Operations', definition: 'How long a train stands at a platform with doors open. Long dwells at busy stations are a common cause of bunching.', seeAlso: ['Headway'] },
  { term: 'GTFS', tag: 'Data', definition: 'General Transit Feed Specification: the open format for schedules (static) and vehicle positions and predictions (realtime).' },
  { term: 'Headway', tag: 'Operations', definition: 'Time between consecutive trains at the same point in the same direction. Scheduled headway comes from the timetable; actual headway is measured.', seeAlso: ['Dwell time', 'Bunching'] },
  { term: 'Bunching', tag: 'Operations', definition: 'Trains running closer together than scheduled, leaving a long gap behind them.', seeAlso: ['Headway'] },
  { term: 'Interlocking', tag: 'Infrastructure', definition: 'Signals and switches wired so that conflicting routes cannot be set at the same time.' },
  { term: 'Loop', tag: 'Infrastructure', definition: 'The elevated rectangle of track around the central business district, shared by five lines.' },
  { term: 'Married pair', tag: 'Operations', definition: 'Two railcars permanently coupled and run as a unit; consists are built in multiples of a pair.', seeAlso: ['Consist'] },
  { term: 'Owl service', tag: 'Operations', definition: 'Overnight service. Only the Red and Blue lines run around the clock.' },
  { term: 'Revenue service', tag: 'Operations', definition: 'A train carrying passengers on a scheduled trip.', seeAlso: ['Deadhead'] },
  { term: 'Slow zone', tag: 'Infrastructure', definition: 'A stretch of track with a reduced speed limit because of track condition or work.' },
  { term: 'Station entry', tag: 'Data', definition: "A counted entry through a station's fare control. Transfers inside the paid area aren't counted again.", seeAlso: ['Unlinked trip'] },
  { term: 'Third rail', tag: 'Infrastructure', definition: 'The energized rail beside the running rails that supplies 600 V DC traction power.' },
  { term: 'Unlinked trip', tag: 'Data', definition: 'One boarding of one vehicle. A bus-to-train journey counts as two unlinked trips.', seeAlso: ['Station entry'] },
  { term: 'Fare capping', tag: 'Fares', definition: 'Charging no more than the price of a pass once a rider has paid that much in single fares within the period.' },
  { term: 'Transfer', tag: 'Fares', definition: 'A discounted or free ride taken within a set window after a full fare.' },
]

export interface TimelineEvent {
  year: number
  title: string
  body: string
  era: 'Private companies' | 'Chicago Transit Authority' | 'Modernization'
}

export const TIMELINE: TimelineEvent[] = [
  { year: 1892, era: 'Private companies', title: 'First elevated line opens', body: 'The South Side Rapid Transit begins service between Congress Street and 39th Street, using steam locomotives.' },
  { year: 1897, era: 'Private companies', title: 'The Loop is completed', body: 'The Union Loop ties the separate elevated companies into one downtown circuit.' },
  { year: 1900, era: 'Private companies', title: 'Northwestern Elevated opens', body: 'The north side main line opens, the core of what later becomes the Red, Brown and Purple lines.' },
  { year: 1924, era: 'Private companies', title: 'Chicago Rapid Transit Company', body: 'The four elevated companies are unified under a single operator.' },
  { year: 1943, era: 'Private companies', title: 'State Street subway', body: 'The first subway opens beneath State Street, carrying north-south trains under downtown.' },
  { year: 1947, era: 'Chicago Transit Authority', title: 'Public ownership', body: 'A new public authority takes over rapid transit and surface lines.' },
  { year: 1969, era: 'Chicago Transit Authority', title: 'Dan Ryan branch', body: 'Service opens in the median of the Dan Ryan Expressway to 95th Street.' },
  { year: 1984, era: 'Chicago Transit Authority', title: "Extension to O'Hare", body: "The northwest line reaches O'Hare International Airport." },
  { year: 1993, era: 'Modernization', title: 'Lines named by color', body: 'Routes are renamed by color (Red, Blue, Green…) and the Midway line opens as the Orange Line.' },
  { year: 2006, era: 'Modernization', title: 'Pink Line', body: 'The Cermak branch becomes its own route, running via the Paulina connector into the Loop.' },
  { year: 2013, era: 'Modernization', title: 'Red Line South rebuild', body: 'The Dan Ryan branch closes for five months while track is replaced end to end.' },
  { year: 2017, era: 'Modernization', title: 'Washington/Wabash opens', body: 'A new Loop station replaces two older ones on Wabash Avenue.' },
]

export const fmt = (n: number) => n.toLocaleString('en-US')
