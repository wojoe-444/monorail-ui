// Screenshot a lab page with headless Chrome over the DevTools protocol, so any
// viewport works (including phone widths below Chrome's 500px window minimum).
// Usage: node scripts/shot.mjs <route> <out.png> [light|dark] [width] [height] [waitMs] [--full]
// e.g.   node scripts/shot.mjs /lab/tremor C:/tmp/tremor.png dark 1440 900
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [route = '/', out = 'shot.png', mode = 'light', w = '1440', h = '900', waitMs = '7000'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const fullPage = process.argv.includes('--full')
const width = +w
const height = +h
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'shot-'))

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {
  stdio: 'ignore',
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function targetWs() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* not up yet */
    }
    await sleep(200)
  }
  throw new Error('Chrome did not start')
}

try {
  const ws = new WebSocket(await targetWs())
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id
      pending.set(n, resolve)
      ws.send(JSON.stringify({ id: n, method, params }))
    })

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
  await send('Page.navigate', { url: `http://localhost:5291/?shot-mode=${mode}#${route}` })
  await sleep(+waitMs)
  let clip
  if (fullPage) {
    const { result } = await send('Runtime.evaluate', {
      expression: 'Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll("*")].filter(e => e.scrollHeight > e.clientHeight && getComputedStyle(e).overflowY === "auto").map(e => e.scrollHeight + 64))',
      returnByValue: true,
    })
    const full = Math.min(8000, result.result.value)
    await send('Emulation.setDeviceMetricsOverride', { width, height: full, deviceScaleFactor: 1, mobile: width < 600 })
    await sleep(800)
    clip = { x: 0, y: 0, width, height: full, scale: 1 }
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) })
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
  console.log(out)
  ws.close()
} finally {
  chrome.kill()
  await sleep(300)
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch {
    /* Chrome may still hold files */
  }
}
