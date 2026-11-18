// Downloads public datasets that can't be fetched from the browser (no CORS)
// into public/data/. Run: node scripts/fetch-snapshots.mjs
import { mkdir, writeFile } from 'node:fs/promises'

const out = new URL('../public/data/', import.meta.url)
await mkdir(out, { recursive: true })

// World Bank: life expectancy at birth, every country, 1960 to latest.
async function worldBank(indicator) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&date=1960:2025&per_page=20000`
  const res = await fetch(url)
  const [meta, rows] = await res.json()
  return { meta, rows }
}

const countriesRes = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=400')
const [, countries] = await countriesRes.json()
const real = new Map(
  countries.filter((c) => c.region.value !== 'Aggregates').map((c) => [c.id, { iso3: c.id, name: c.name, region: c.region.value.trim(), income: c.incomeLevel.value }]),
)

const { rows } = await worldBank('SP.DYN.LE00.IN')
const byCountry = new Map()
for (const r of rows) {
  const c = real.get(r.countryiso3code)
  if (!c || r.value == null) continue
  if (!byCountry.has(c.iso3)) byCountry.set(c.iso3, { ...c, series: {} })
  byCountry.get(c.iso3).series[r.date] = Math.round(r.value * 100) / 100
}
const worldRow = rows.filter((r) => r.countryiso3code === 'WLD' && r.value != null)
const world = Object.fromEntries(worldRow.map((r) => [r.date, Math.round(r.value * 100) / 100]))

await writeFile(
  new URL('life-expectancy.json', out),
  JSON.stringify({
    source: 'World Bank, SP.DYN.LE00.IN (Life expectancy at birth, total years)',
    fetched: new Date().toISOString(),
    world,
    countries: [...byCountry.values()],
  }),
)
console.log(`life-expectancy.json: ${byCountry.size} countries`)

// World Bank: ten indicators per country, 2000 to latest, for Ledger and Specimen.
const INDICATORS = {
  'SP.POP.TOTL': 'Population',
  'NY.GDP.PCAP.CD': 'GDP per capita (US$)',
  'SP.DYN.LE00.IN': 'Life expectancy (years)',
  'SP.DYN.TFRT.IN': 'Fertility (births per woman)',
  'SP.DYN.IMRT.IN': 'Infant mortality (per 1,000 births)',
  'IT.NET.USER.ZS': 'Internet users (% of people)',
  'SP.URB.TOTL.IN.ZS': 'Urban population (%)',
  'EG.ELC.ACCS.ZS': 'Access to electricity (%)',
  'EG.FEC.RNEW.ZS': 'Renewable energy (% of final use)',
  'EN.GHG.CO2.PC.CE.AR5': 'CO₂ per person (t)',
}
const ind = {}
const countriesOut = new Map([...real.values()].map((c) => [c.iso3, { ...c, values: {} }]))
for (const [code, label] of Object.entries(INDICATORS)) {
  const res = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&date=2000:2025&per_page=20000`)
  const body = await res.json()
  const rows = Array.isArray(body) && body[1] ? body[1] : []
  let n = 0
  for (const r of rows) {
    const c = countriesOut.get(r.countryiso3code)
    if (!c || r.value == null) continue
    ;(c.values[code] ??= {})[r.date] = Number(r.value.toPrecision(5))
    n++
  }
  ind[code] = { label, source: rows[0]?.indicator?.value ?? label }
  console.log(`${code}: ${n} values`)
}
await writeFile(
  new URL('world-indicators.json', out),
  JSON.stringify({
    source: 'World Bank World Development Indicators',
    fetched: new Date().toISOString(),
    indicators: ind,
    countries: [...countriesOut.values()].filter((c) => Object.keys(c.values).length),
  }),
)
console.log('world-indicators.json written')
