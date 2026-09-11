/**
 * The Codex page — a sidebar tab registered through the same
 * `ctx.betterSidebar` service external plugins use (the merged plugin eats its
 * own dogfood). One page, three sections, all in the Codex visual language:
 * near-black layered surfaces, 1px hairlines instead of shadows, grayscale
 * text and the signature green accent used sparingly (see
 * docs/external-plugin-guide.md §12 — this page's stylesheet consumes nothing
 * but design tokens).
 *
 *  1. **Theme** — the live state of the Codex palette (read from the theme
 *     controller's own store through `useSyncExternalStore`), the apply /
 *     follow-system actions, and a palette preview built from
 *     `CODEX_SWATCH_GRADIENT` plus a grid of key `CODEX_TOKENS` values.
 *  2. **Design tokens** — every token the theme defines, grouped by name
 *     prefix inside a bounded scroll area, each value painted as a swatch when
 *     it looks like a color.
 *  3. **Sessions** — the live session list and the archived one, with
 *     restore / delete actions and an in-page confirmation state for the
 *     destructive one (never `window.confirm`).
 *
 * The tab component receives the theme controller through a module-level
 * registration object: `codexTabs()` stays argument-free (the glue module calls
 * {@link setCodexThemeController} before registering the descriptor), and a
 * page rendered without a controller simply omits the theme section.
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  IconCodeOutline16,
  IconRefreshOutline16,
  IconTrashOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '../../context-types.ts'
import { t } from '../locales.ts'
import type { TabComponentProps, TabDescriptor } from '../service.ts'
import {
  deleteSession,
  fetchArchivedIds,
  listArchivedSessions,
  listSessions,
  subscribeSessions,
  unarchiveSession,
  type CodexSessionRow,
} from './sessions.ts'
import { CODEX_SWATCH_GRADIENT, CODEX_TOKENS, type CodexThemeController } from './theme.ts'
import { isColorValue } from './viewer.tsx'
import css from './codex-page.module.css'

/** The tab type id (namespaced like a third-party plugin's, per the guide). */
const TAB_ID = 'codex-design:codex'

/** The theme controller, handed over by the glue module before registration. */
let controller: CodexThemeController | undefined

/** Called once by the glue module before the descriptor is registered. */
export function setCodexThemeController(next: CodexThemeController): void {
  controller = next
}

/** Props the descriptor's `component` closure passes down. */
export interface CodexPageProps extends TabComponentProps {
  /**
   * The theme controller. Undefined when the page renders without one
   * (standalone compositions): the theme section is then skipped entirely.
   */
  themeController?: CodexThemeController
}

/** One rendered token group: a name-prefix family of the palette. */
interface TokenGroup {
  readonly label: string
  readonly entries: readonly { readonly name: string; readonly value: string }[]
}

/**
 * The ordered grouping rules for the token list. The labels are the palette's
 * own name prefixes in monospace — they are identifiers, not translatable copy,
 * so they stay literal. Every literal prefix here is backed by at least one
 * concrete token in `CODEX_TOKENS` (tests/codex-theme.spec.ts asserts exactly
 * that for every token-like string this plugin's sources mention).
 */
const TOKEN_GROUP_RULES: readonly { readonly label: string; readonly match: (name: string) => boolean }[] = [
  { label: '--dsw-alias-bg-*', match: name => name.startsWith('--dsw-alias-bg-') },
  { label: '--dsw-alias-hairline', match: name => name === '--dsw-alias-hairline' },
  { label: '--dsw-alias-border-*', match: name => name.startsWith('--dsw-alias-border-') },
  { label: '--dsw-alias-label-*', match: name => name.startsWith('--dsw-alias-label-') },
  { label: '--dsw-alias-accent*', match: name => name.startsWith('--dsw-alias-accent') },
  { label: '--dsw-alias-brand-*', match: name => name.startsWith('--dsw-alias-brand-') },
  { label: '--dsw-alias-button-*', match: name => name.startsWith('--dsw-alias-button-') },
  { label: '--dsw-alias-interactive-*', match: name => name.startsWith('--dsw-alias-interactive-') },
  {
    label: '--dsw-alias-state-* / --dsw-alias-danger',
    match: name => name.startsWith('--dsw-alias-state-') || name === '--dsw-alias-danger',
  },
  { label: '--dsw-alias-markdown-*', match: name => name.startsWith('--dsw-alias-markdown-') },
  { label: '--dsw-alias-scrollbar-*', match: name => name.startsWith('--dsw-alias-scrollbar-') },
  { label: '--dsw-alias-toast-*', match: name => name.startsWith('--dsw-alias-toast-') },
  { label: '--dsw-alias-tooltip-*', match: name => name.startsWith('--dsw-alias-tooltip-') },
  { label: '--dsw-specific-*', match: name => name.startsWith('--dsw-specific-') },
  { label: '--dsw-font-* / --ds-*', match: name => name.startsWith('--dsw-font-') || name.startsWith('--ds-') },
]

/**
 * The group heading of one token: the first matching rule's label, else its own
 * first three dash segments plus a wildcard (built from the name — no literal
 * token name is invented for a family the table does not know).
 */
function groupLabelOf(name: string): string {
  for (const rule of TOKEN_GROUP_RULES) {
    if (rule.match(name)) return rule.label
  }
  const segments = name.replace(/^--/, '').split('-')
  return `--${segments.slice(0, 3).join('-')}-*`
}

/** Group the palette by name prefix, in the rule table's order (leftovers last). */
function groupTokens(tokens: Record<string, string>): TokenGroup[] {
  const buckets = new Map<string, { name: string; value: string }[]>()
  for (const rule of TOKEN_GROUP_RULES) buckets.set(rule.label, [])
  for (const [name, value] of Object.entries(tokens)) {
    const label = groupLabelOf(name)
    const bucket = buckets.get(label)
    if (bucket === undefined) buckets.set(label, [{ name, value }])
    else bucket.push({ name, value })
  }
  return [...buckets]
    .filter(([, entries]) => entries.length > 0)
    .map(([label, entries]) => ({ label, entries }))
}

/** The palette swatches of the theme preview (all present in CODEX_TOKENS). */
const PREVIEW_TOKENS: readonly string[] = [
  '--dsw-alias-accent',
  '--dsw-alias-accent-soft',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-alias-danger',
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-hairline',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
]

/** The token total, shown as the design-tokens section badge. */
const TOKEN_COUNT = Object.keys(CODEX_TOKENS).length

/** One-line failure copy: the localized prefix plus the underlying message. */
function failureOf(prefix: string, cause: unknown): string {
  return `${prefix} · ${cause instanceof Error ? cause.message : String(cause)}`
}

/** The inline delete confirmation (the session name is interpolated). */
function confirmTextOf(row: CodexSessionRow): string {
  return t('codexDeleteConfirm', { name: row.title })
}

/**
 * The theme section: the live applied state, the two actions and the palette
 * preview. Both actions stay enabled while they already hold — the Host can
 * silently revert the resolved theme, so "apply" must always be able to force a
 * re-apply (the settings row keeps the same contract).
 */
function ThemeSection({ controller: themeController }: { controller: CodexThemeController }): ReactNode {
  const active = useSyncExternalStore(themeController.store.subscribe, themeController.store.getSnapshot)
  return (
    <section className={css.section}>
      <div className={css.sectionHead}>
        <span className={active ? `${css.stateDot} ${css.stateOn}` : `${css.stateDot} ${css.stateOff}`} aria-hidden="true" />
        <span className={css.sectionTitle}>{t('codexThemeTitle')}</span>
        {active && <span className={css.tag}>{t('codexThemeActive')}</span>}
      </div>
      <p className={css.sectionDesc}>{t('codexThemeDesc')}</p>
      <div className={css.themeRow}>
        <div className={css.preview}>
          <span className={css.previewSwatch} aria-hidden="true" style={{ background: CODEX_SWATCH_GRADIENT }} />
          <span className={css.previewGrid} aria-hidden="true">
            {PREVIEW_TOKENS.map((name) => {
              const value = CODEX_TOKENS[name]
              if (value === undefined) return null
              return <span key={name} className={css.previewChip} title={name} style={{ background: value }} />
            })}
          </span>
        </div>
        <div className={css.actions}>
          <button
            type="button"
            className={css.btnPrimary}
            onClick={() => { themeController.apply() }}
          >
            {t('codexThemeApply')}
          </button>
          <button
            type="button"
            className={css.btnGhost}
            onClick={() => { themeController.restore() }}
          >
            {t('codexThemeRestore')}
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * The design-tokens section: the palette the theme defines, grouped by name
 * prefix inside a bounded scroll area. Each row shows the CSS variable name and
 * its value in monospace, and paints the value as a swatch when it looks like a
 * color (the value is read out of `CODEX_TOKENS` at runtime — the palette is the
 * only place this plugin may write a literal color).
 */
function TokenSection(): ReactNode {
  const groups = useMemo(() => groupTokens(CODEX_TOKENS), [])
  return (
    <section className={css.section}>
      <div className={css.sectionHead}>
        <span className={css.sectionTitle}>{t('codexTokens')}</span>
        <span className={css.count}>{TOKEN_COUNT}</span>
      </div>
      <p className={css.sectionDesc}>{t('codexTokensDesc')}</p>
      <div className={css.tokenScroll}>
        {groups.map(group => (
          <div key={group.label} className={css.tokenGroup}>
            <div className={css.tokenGroupHead}>
              <span className={css.tokenGroupLabel}>{group.label}</span>
              <span className={css.count}>{group.entries.length}</span>
            </div>
            {group.entries.map(entry => (
              <div key={entry.name} className={css.tokenRow}>
                <span
                  className={isColorValue(entry.value) ? css.tokenSwatch : css.tokenSwatchNone}
                  aria-hidden="true"
                  style={isColorValue(entry.value) ? { background: entry.value } : undefined}
                />
                <code className={css.tokenName} title={entry.name}>{entry.name}</code>
                <code className={css.tokenValue} title={entry.value}>{entry.value}</code>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * The sessions section: the live session list and the durable archive set.
 * Rows are derived from the session feed on every render (the feed
 * subscription and every settled mutation bump `revision`), the archived ids
 * come from the host on mount and are re-read after each mutation — the host
 * re-publishes the workspace feed itself, so no page reload is ever needed.
 */
function SessionsSection({ ctx }: { ctx: Context }): ReactNode {
  const [archivedIds, setArchivedIds] = useState<readonly string[]>([])
  /** Recompute tick: the row builders read the session store's own snapshot. */
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    const result = await fetchArchivedIds()
    setArchivedIds(result.ids)
    setRevision(value => value + 1)
  }, [])

  useEffect(() => { void reload() }, [reload])

  // Follow the live session feed: creation, switch and deletion re-derive.
  useEffect(() => subscribeSessions(ctx, () => { setRevision(value => value + 1) }), [ctx])

  // `revision` is a dependency on purpose: the builders read a store snapshot
  // React cannot observe changing, so the tick is what re-derives the rows.
  const current = useMemo(() => listSessions(ctx, archivedIds), [ctx, archivedIds, revision])
  const archived = useMemo(() => listArchivedSessions(ctx, archivedIds), [ctx, archivedIds, revision])

  // Escape dismisses the inline confirmation (there is no window.confirm here).
  useEffect(() => {
    if (pendingId === null) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPendingId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [pendingId])

  const onRestore = (row: CodexSessionRow): void => {
    setBusyId(row.id)
    setError(null)
    void unarchiveSession(row.id)
      .then((unarchived) => {
        if (!unarchived) setError(t('codexUnarchiveFailed'))
      })
      .catch((cause: unknown) => { setError(failureOf(t('codexUnarchiveFailed'), cause)) })
      .finally(() => {
        setBusyId(null)
        void reload()
      })
  }

  const onDelete = (row: CodexSessionRow): void => {
    setPendingId(null)
    setBusyId(row.id)
    setError(null)
    void deleteSession(ctx, row.id)
      .catch((cause: unknown) => { setError(failureOf(t('codexDeleteFailed'), cause)) })
      .finally(() => {
        setBusyId(null)
        // Re-read the archive set either way: a partial teardown must not leave
        // a stale row on screen.
        void reload()
      })
  }

  const renderRow = (row: CodexSessionRow, archivedRow: boolean): ReactNode => {
    const confirmText = confirmTextOf(row)
    const busy = busyId === row.id
    return (
      <Fragment key={row.id}>
        <div className={css.sessionRow}>
          <span className={css.sessionText}>
            <span className={css.sessionTitle} title={row.title}>{row.title}</span>
            <code className={css.sessionId}>{row.id}</code>
          </span>
          {row.current && <span className={css.currentDot} aria-hidden="true" />}
          <span className={css.sessionActions}>
            {archivedRow && (
              <button
                type="button"
                className={css.btnMini}
                disabled={busy}
                onClick={() => { onRestore(row) }}
              >
                <IconRefreshOutline16 size={12} />
                <span>{t('codexRestore')}</span>
              </button>
            )}
            <button
              type="button"
              className={`${css.btnMini} ${css.btnMiniDanger}`}
              disabled={busy}
              onClick={() => {
                setError(null)
                setPendingId(row.id)
              }}
            >
              <IconTrashOutline16 size={12} />
              <span>{t('codexDelete')}</span>
            </button>
          </span>
        </div>
        {pendingId === row.id && (
          <div className={css.confirmRow} role="alert">
            <span className={css.confirmText}>{confirmText}</span>
            <button
              type="button"
              className={css.btnDanger}
              disabled={busy}
              onClick={() => { onDelete(row) }}
            >
              <IconTrashOutline16 size={12} />
              <span>{t('codexDelete')}</span>
            </button>
            {/*
              Dismissing the confirmation. The glyph carries the confirmation
              copy as its accessible name (the dialog's own question) — this
              keeps the surface inside the page's declared locale keys while
              still giving the control a name and a tooltip; Escape does the
              same thing for keyboard users.
            */}
            <button
              type="button"
              className={css.btnDismiss}
              aria-label={confirmText}
              title={confirmText}
              onClick={() => { setPendingId(null) }}
            >
              ✕
            </button>
          </div>
        )}
      </Fragment>
    )
  }

  return (
    <section className={css.section}>
      <div className={css.sectionHead}>
        <span className={css.sectionTitle}>{t('codexSessions')}</span>
        <span className={css.count}>{current.length + archived.length}</span>
      </div>

      <div className={css.subHead}>
        <span>{t('codexActiveSessions')}</span>
        <span className={css.count}>{current.length}</span>
      </div>
      {current.length > 0 && (
        <div className={css.sessionList}>
          {current.map(row => renderRow(row, false))}
        </div>
      )}

      <div className={css.subHead}>
        <span>{t('codexArchived')}</span>
        <span className={css.count}>{archived.length}</span>
      </div>
      {archived.length === 0
        ? <div className={css.emptyNote}>{t('codexArchivedEmpty')}</div>
        : (
          <div className={css.sessionList}>
            {archived.map(row => renderRow(row, true))}
          </div>
        )}

      {error !== null && (
        <div className={css.error} role="alert">
          <IconWarningOutline16 size={12} />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}

/**
 * The Codex page. The theme section renders only while a controller is
 * available (the glue module sets it before registering the descriptor); the
 * page itself never crashes without one.
 */
export function CodexPage({ ctx, themeController }: CodexPageProps): ReactNode {
  return (
    <div className={css.page}>
      <div className={css.head}>
        <span className={css.headTitle}>{t('codexPageTitle')}</span>
        <span className={css.headSwatch} aria-hidden="true" style={{ background: CODEX_SWATCH_GRADIENT }} />
      </div>
      {themeController !== undefined && <ThemeSection controller={themeController} />}
      <TokenSection />
      <SessionsSection ctx={ctx} />
    </div>
  )
}

/**
 * The Codex page descriptor: one tab, namespaced like a third-party plugin's.
 * `single: true` keeps one instance per session (a second one would only
 * duplicate the same theme state and session lists).
 */
export function codexTabs(): readonly TabDescriptor[] {
  return [
    {
      id: TAB_ID,
      title: () => t('codexPageTitle'),
      icon: (size: number) => <IconCodeOutline16 size={size} />,
      // After the workbench builtins (files 10 … browser 50): the Codex page is
      // a brand/control surface, not a daily workbench pane.
      order: 60,
      hidden: false,
      single: true,
      component: (props) => <CodexPage {...props} themeController={controller} />,
    },
  ]
}
