// Add shadcn/ui components so they match this app: `npm run ui:add -- tabs table`.
//
// Runs the shadcn CLI, then points the new files at the app's own `cn`
// (src/lib/utils.ts). shadcn 4 writes `import { cn } from "cn"` and adds the
// `cn` npm package; this app already has `cn` from clsx + tailwind-merge, so
// the extra package is removed again.
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const names = process.argv.slice(2)
if (names.length === 0) {
  console.error('Usage: npm run ui:add -- <component> [more components]')
  process.exit(1)
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' })
run(`npx --yes shadcn@4 add ${names.join(' ')} --yes`)

const CN_IMPORT = /from\s+["']cn["']/g
const fixed = []
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(tsx?|jsx?)$/.test(entry)) {
      const source = readFileSync(path, 'utf8')
      const next = source.replace(CN_IMPORT, "from '@/lib/utils'")
      if (next !== source) {
        writeFileSync(path, next)
        fixed.push(path)
      }
    }
  }
}
walk('src')
if (fixed.length) console.log(`Pointed ${fixed.length} file(s) at @/lib/utils:\n  ${fixed.join('\n  ')}`)

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
if (pkg.dependencies?.cn || pkg.devDependencies?.cn) run('npm uninstall cn')

console.log('\nDone. Check the new component uses token classes (see AGENTS.md > Design rules).')
