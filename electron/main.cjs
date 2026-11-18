// Desktop shell for the app: one window that loads the production build
// (dist/) over a private app:// scheme, so routing, storage and fetches to
// public APIs behave as they do on a web origin. Links to the web open in the
// default browser. Build an installer with `npm run app:dist`.
const { app, BrowserWindow, protocol, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const SCHEME = 'app'
const HOST = 'monorail'
const DIST = path.join(__dirname, '..', 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
])

if (!app.requestSingleInstanceLock()) app.quit()

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: 'MonoRail UI',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  })
  win.once('ready-to-show', () => win.show())

  const isExternal = (url) => /^(https?|mailto):/i.test(url)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${SCHEME}://`)) return
    event.preventDefault()
    if (isExternal(url)) void shell.openExternal(url)
  })

  void win.loadURL(`${SCHEME}://${HOST}/index.html`)
}

app.on('second-instance', () => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.focus()
})

app.whenReady().then(() => {
  protocol.handle(SCHEME, async (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname)
    if (rel === '/' || rel === '') rel = '/index.html'
    const file = path.normalize(path.join(DIST, rel))
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 })
    try {
      const body = await fs.readFile(file)
      return new Response(body, { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
  createWindow()
})

app.on('window-all-closed', () => app.quit())
