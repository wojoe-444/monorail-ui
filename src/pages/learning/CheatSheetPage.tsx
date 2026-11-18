import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Copy, OctagonAlert, Printer, TriangleAlert, X } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchField } from '@/components/ui/search-field'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ITEM_BY_ID, PERSON_BY_ID } from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Page 6, "Cheat sheet": Git, the parts you'll actually use. Dense blocks of
 * commands grouped by the job ("I want to undo…"), a filter that keeps your
 * place, copy buttons, and marks on the commands that can hurt you:
 *   amber = rewrites history others may have (needs care, recoverable)
 *   red   = throws work away (no reflog will save uncommitted changes)
 * Each block links to the page that explains why.
 */

const SHEET = ITEM_BY_ID['git-sheet']

type Risk = 'rewrites' | 'destroys'

interface Cmd {
  cmd: string
  does: string
  risk?: Risk
}

interface Block {
  id: string
  title: string
  /** The situation, in the reader's words. */
  when: string
  cmds: Cmd[]
  why?: { label: string; path: string }
  note?: string
}

const BLOCKS: Block[] = [
  {
    id: 'look',
    title: 'Look around',
    when: 'Before anything else: where am I, what changed?',
    cmds: [
      { cmd: 'git status -sb', does: 'Short status, with the branch and ahead/behind' },
      { cmd: 'git log --oneline --graph -20', does: 'Last 20 commits as a graph' },
      { cmd: 'git diff', does: 'Changes not yet staged' },
      { cmd: 'git diff --staged', does: 'What the next commit will contain' },
      { cmd: 'git show <sha>', does: 'One commit: message and diff' },
    ],
  },
  {
    id: 'undo',
    title: 'Undo',
    when: 'I changed or committed something I shouldn’t have.',
    cmds: [
      { cmd: 'git restore <file>', does: 'Discard unstaged edits to a file', risk: 'destroys' },
      { cmd: 'git restore --staged <file>', does: 'Unstage, keep the edits' },
      { cmd: 'git commit --amend', does: 'Fix the last commit’s message or contents', risk: 'rewrites' },
      { cmd: 'git reset --soft HEAD~1', does: 'Undo the last commit, keep changes staged' },
      { cmd: 'git revert <sha>', does: 'New commit that undoes an old one. Safe on main' },
      { cmd: 'git reset --hard HEAD', does: 'Throw away every uncommitted change', risk: 'destroys' },
    ],
    note: 'Committed a secret? Deleting it from history isn’t enough. Rotate it first.',
    why: { label: 'Rotate a leaked API key', path: '/learn/how-to' },
  },
  {
    id: 'branches',
    title: 'Branches',
    when: 'Starting, switching, tidying up.',
    cmds: [
      { cmd: 'git switch -c pr/<you>/<thing>', does: 'New branch, our naming' },
      { cmd: 'git switch -', does: 'Back to the previous branch' },
      { cmd: 'git branch -vv', does: 'Branches with upstream and ahead/behind' },
      { cmd: 'git fetch --prune', does: 'Update remotes, forget deleted branches' },
      { cmd: 'git branch -d <branch>', does: 'Delete a merged branch' },
      { cmd: 'git branch -D <branch>', does: 'Delete even if unmerged', risk: 'destroys' },
    ],
  },
  {
    id: 'rewrite',
    title: 'Rewrite history',
    when: 'Tidy my branch before review. Never on main.',
    cmds: [
      { cmd: 'git rebase origin/main', does: 'Replay my commits on the latest main', risk: 'rewrites' },
      { cmd: 'git commit --fixup <sha>', does: 'Mark a commit as a fix for an earlier one' },
      { cmd: 'git rebase -i --autosquash origin/main', does: 'Fold fixups in, reorder, reword', risk: 'rewrites' },
      { cmd: 'git push --force-with-lease', does: 'Push a rewritten branch, unless someone else pushed', risk: 'rewrites' },
      { cmd: 'git push --force', does: 'Overwrite the remote, whatever is there', risk: 'destroys' },
    ],
    why: { label: 'Failure Modes, ep. 4: the force push', path: '/learn/video' },
  },
  {
    id: 'rescue',
    title: 'Rescue',
    when: 'I think I just lost work.',
    cmds: [
      { cmd: 'git reflog', does: 'Everywhere HEAD has been. Your commits are here' },
      { cmd: 'git switch -c rescue <sha>', does: 'Put a branch on a lost commit' },
      { cmd: 'git reset --hard HEAD@{1}', does: 'Undo a bad rebase or reset', risk: 'destroys' },
      { cmd: 'git rebase --abort', does: 'Stop a rebase, back to where you started' },
      { cmd: 'git fsck --lost-found', does: 'Find dangling commits the reflog missed' },
    ],
    note: 'Committed work is almost never lost for 90 days. Uncommitted work is.',
    why: { label: 'Night Shift, ep. 14: the 3 a.m. rollback', path: '/learn/podcast' },
  },
  {
    id: 'compare',
    title: 'Compare',
    when: 'What’s different, and who did it?',
    cmds: [
      { cmd: 'git diff origin/main...HEAD', does: 'What my branch adds (what review will see)' },
      { cmd: 'git log origin/main..HEAD', does: 'Commits on my branch, not on main' },
      { cmd: 'git diff --stat <a> <b>', does: 'Files and line counts only' },
      { cmd: 'git log -p -- <file>', does: 'Every change to one file' },
      { cmd: 'git log -S "<text>"', does: 'Commits that added or removed some text' },
      { cmd: 'git blame -L 40,60 <file>', does: 'Who last touched these lines' },
    ],
  },
  {
    id: 'stash',
    title: 'Stash',
    when: 'Put this down for a minute.',
    cmds: [
      { cmd: 'git stash push -u -m "<note>"', does: 'Stash everything, untracked too, with a label' },
      { cmd: 'git stash list', does: 'What’s in the stash' },
      { cmd: 'git stash pop', does: 'Re-apply the latest and drop it' },
      { cmd: 'git stash apply stash@{2}', does: 'Re-apply one, keep it in the stash' },
      { cmd: 'git stash drop stash@{2}', does: 'Delete one stash', risk: 'destroys' },
    ],
  },
  {
    id: 'setup',
    title: 'Set once',
    when: 'Kestrel’s recommended config. Run these on a new laptop.',
    cmds: [
      { cmd: 'git config --global pull.rebase true', does: 'Pull rebases instead of merge commits' },
      { cmd: 'git config --global rerere.enabled true', does: 'Remember how you resolved a conflict' },
      { cmd: 'git config --global push.autoSetupRemote true', does: 'First push sets the upstream' },
      { cmd: 'git config --global fetch.prune true', does: 'Always prune on fetch' },
    ],
    why: { label: 'Your first week at Kestrel', path: '/learn/course' },
  },
]

const COMMAND_COUNT = BLOCKS.reduce((n, b) => n + b.cmds.length, 0)

/** Placeholders like <file> in muted italics, so the literal part stands out. */
function CommandText({ cmd, query }: { cmd: string; query: string }) {
  const parts = cmd.split(/(<[^>]+>)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('<') ? (
          <span key={i} className="text-muted-foreground italic">
            {p}
          </span>
        ) : (
          <Highlight key={i} text={p} query={query} />
        ),
      )}
    </>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const at = text.toLowerCase().indexOf(query.toLowerCase())
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-highlight-soft text-highlight-soft-foreground">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

const RISK: Record<Risk, { label: string; text: string; bar: string; icon: typeof TriangleAlert; tip: string }> = {
  rewrites: {
    label: 'Rewrites history',
    text: 'text-warning',
    bar: 'bg-warning',
    icon: TriangleAlert,
    tip: 'Rewrites commits. Fine on your own branch; never on main or a branch others use.',
  },
  destroys: {
    label: 'Loses work',
    text: 'text-destructive',
    bar: 'bg-destructive',
    icon: OctagonAlert,
    tip: 'Throws work away. Uncommitted changes can’t be recovered afterwards.',
  },
}

function RiskMark({ risk }: { risk: Risk }) {
  const r = RISK[risk]
  const Icon = r.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn('inline-flex shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', r.text)}
        >
          <Icon className="size-3.5" aria-label={r.label} />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{r.tip}</TooltipContent>
    </Tooltip>
  )
}

function CopyButton({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-7 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 focus-visible:opacity-100 print:hidden',
            copied && 'text-success opacity-100',
          )}
          aria-label={copied ? 'Copied' : `Copy ${text}`}
          onClick={onCopy}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Copied' : 'Copy'}</TooltipContent>
    </Tooltip>
  )
}

function BlockCard({ block, query, copied, onCopy }: { block: Block; query: string; copied: string | null; onCopy: (c: string) => void }) {
  return (
    <section
      aria-labelledby={`block-${block.id}`}
      className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <header className="border-b px-4 py-2.5">
        <h2 id={`block-${block.id}`} className="text-sm font-semibold">
          {block.title}
        </h2>
        <p className="text-xs text-muted-foreground">{block.when}</p>
      </header>
      <ul className="divide-y">
        {block.cmds.map((c) => (
          <li key={c.cmd} className="group relative flex items-start gap-2 py-1.5 pr-1.5 pl-4 hover:bg-muted/50">
            {c.risk && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-0.5', RISK[c.risk].bar)} />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 font-mono text-[13px] leading-5 break-words">
                  <CommandText cmd={c.cmd} query={query} />
                </code>
                {c.risk && <RiskMark risk={c.risk} />}
              </div>
              <span className="text-xs text-muted-foreground">
                <Highlight text={c.does} query={query} />
              </span>
            </div>
            <CopyButton text={c.cmd} copied={copied === c.cmd} onCopy={() => onCopy(c.cmd)} />
          </li>
        ))}
      </ul>
      {(block.note || block.why) && (
        <footer className="flex flex-col gap-1 border-t bg-muted/40 px-4 py-2.5 text-xs">
          {block.note && <p className="text-muted-foreground">{block.note}</p>}
          {block.why && (
            <a
              href={href(block.why.path)}
              className="inline-flex w-fit items-center gap-1 rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {block.note ? '' : 'Why: '}
              {block.why.label}
              <ArrowRight className="size-3.5" />
            </a>
          )}
        </footer>
      )}
    </section>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(RISK) as Risk[]).map((k) => {
        const r = RISK[k]
        const Icon = r.icon
        return (
          <span key={k} className="inline-flex items-center gap-1.5">
            <Icon className={cn('size-3.5', r.text)} aria-hidden />
            {r.label}
          </span>
        )
      })}
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-muted-foreground italic">&lt;sha&gt;</span>
        fill in your own
      </span>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border bg-muted px-1 font-mono text-[11px]">{children}</kbd>
}

export function CheatSheetPage() {
  const [query, setQuery] = useState('')
  const [safeOnly, setSafeOnly] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const author = PERSON_BY_ID[SHEET.author]

  // "/" jumps to the filter, Esc clears it: this page lives in a tab you come back to.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = (cmd: string) => {
    void navigator.clipboard?.writeText(cmd).catch(() => {})
    setCopied(cmd)
  }

  const q = query.trim()
  const visible = useMemo(() => {
    const needle = q.toLowerCase()
    return BLOCKS.map((b) => {
      const blockHit = needle !== '' && (b.title.toLowerCase().includes(needle) || b.when.toLowerCase().includes(needle))
      const cmds = b.cmds.filter(
        (c) =>
          (!safeOnly || c.risk !== 'destroys') &&
          (needle === '' || blockHit || c.cmd.toLowerCase().includes(needle) || c.does.toLowerCase().includes(needle)),
      )
      return { ...b, cmds }
    }).filter((b) => b.cmds.length > 0)
  }, [q, safeOnly])
  const shown = visible.reduce((n, b) => n + b.cmds.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cheat sheet"
        title={SHEET.title}
        description={`${COMMAND_COUNT} commands in ${BLOCKS.length} groups, by the job you’re doing. Kept by ${author.name}, updated ${SHEET.updated}.`}
        actions={
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer />
            Print
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center print:hidden">
        <SearchField
          ref={input}
          size="sm"
          shortcut="/"
          className="w-full sm:max-w-sm"
          placeholder="Filter: rebase, undo, stash…"
          aria-label="Filter commands"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('')
          }}
        />
        <div className="flex items-center gap-2">
          <Switch id="safe-only" checked={safeOnly} onCheckedChange={setSafeOnly} />
          <Label htmlFor="safe-only" className="text-sm font-normal whitespace-nowrap">
            Hide commands that lose work
          </Label>
        </div>
        <span className="flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {q || safeOnly ? `${shown} of ${COMMAND_COUNT} commands` : `${COMMAND_COUNT} commands`}
        </span>
      </div>

      <Legend />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No commands match “{q}”.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This sheet is the everyday 10%. For the rest, <span className="font-mono text-xs">git help -a</span> or ask in{' '}
            <span className="font-mono text-xs">#git-help</span>.
          </p>
          <Button variant="outline" size="sm" onClick={() => setQuery('')}>
            <X />
            Clear filter
          </Button>
        </div>
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3 print:columns-2">
          {visible.map((b) => (
            <BlockCard key={b.id} block={b} query={q} copied={copied} onCopy={copy} />
          ))}
        </div>
      )}

      <p className="border-t pt-4 text-xs text-muted-foreground print:hidden">
        Press <Kbd>/</Kbd> to filter, <Kbd>Esc</Kbd> to clear. Something missing or wrong? Tell {author.name.split(' ')[0]} in{' '}
        <span className="font-mono">#git-help</span>. Want the model behind the commands? Try the{' '}
        <a href={href('/learn/lab')} className="font-medium text-primary underline-offset-4 hover:underline">
          feature-flag lab
        </a>
        , which walks a branch from first commit to rollback.
      </p>
    </div>
  )
}
