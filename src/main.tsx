import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/theme.css'
// Applies the saved palette and mode before the first render.
import '@/lib/theme'

import { NAV } from '@/app/routes'
import { AppShell } from '@/components/layout/AppShell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell sections={NAV} />
  </StrictMode>,
)
