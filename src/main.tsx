import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/theme.css'
// Applies the saved palette and mode before the first render.
import { setThemeMode } from '@/lib/theme'

import { NAV } from '@/app/routes'
import { AppShell } from '@/components/layout/AppShell'

// Headless screenshots (scripts/shot.sh) pick the mode with ?shot-mode=dark.
const shotMode = new URLSearchParams(window.location.search).get('shot-mode')
if (shotMode === 'dark' || shotMode === 'light') setThemeMode(shotMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell sections={NAV} />
  </StrictMode>,
)
