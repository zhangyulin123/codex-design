/**
 * Codex theme engine (client half).
 *
 * Registers the `codex` theme with the DSH theme service and keeps it applied
 * across the Host's own preference re-adoption, so the whole Harness UI —
 * including this plugin's sidebar, which only ever consumes `--dsw-*` tokens
 * (see the skin contract in docs/external-plugin-guide.md §12) — renders in the
 * terminal-native Codex palette: near-black canvas, layered dark surfaces,
 * 1px hairlines instead of shadows, grayscale text and one signature green
 * accent.
 *
 * Three levers, in the order they were needed to make "apply" actually stick on
 * real Harness builds (each one is load-bearing — see the standalone
 * codex-design plugin's history, now merged here):
 *
 *  1. `theme.register({id, colorScheme, tokens})` — the supported path. Token
 *     keys are CSS VARIABLE NAMES (`--dsw-*`): the presenter runs
 *     `body.style.setProperty(name, value)` for every entry, so semantic names
 *     such as `background` would set wrong (or ignored) properties and silently
 *     restyle nothing.
 *  2. an `!important` stylesheet + inline custom properties on `<html>` — a
 *     belt-and-braces alias layer for hosts whose presenter does not cover
 *     every semantic token. It is disabled (not removed) when codex is off.
 *  3. a re-assert guard — the Host owns a durable built-in preference and
 *     re-adopts it on its own schedule, which can revert the UI long after our
 *     scheduled re-applies finish. The guard re-applies codex on every
 *     `theme/change` and on a slow poll while the resolved preference drifts.
 *
 * The palette is an inspired reading of the OpenAI Codex design language — not
 * an official token set.
 */
import { isDarkScheme } from '../theme.ts'

/** Registered theme id (also the persisted preference value). */
export const CODEX_THEME_ID = 'codex'

/** `<html>` marker attribute while codex is applied (styling hook + tests). */
export const CODEX_ATTR = 'data-codex-design'

/** Stylesheet id of the alias levers (kept in the DOM, toggled by `disabled`). */
const OVERRIDE_STYLE_ID = 'codex-design-override'

/**
 * The Codex palette, keyed by DSH CSS variable name.
 *
 * The set is derived from the tokens this plugin actually consumes — the
 * sidebar's stylesheets and the theme-aware terminal/editor readers — so the
 * whole workbench, not just the chat shell, lands in the same palette. Token
 * completeness is guarded by tests/codex-theme.spec.ts.
 */
export const CODEX_TOKENS: Record<string, string> = {
  // ── Surfaces ────────────────────────────────────────────────────────────
  '--dsw-alias-bg-base': '#0b0d10',
  '--dsw-alias-bg-layer-1': '#12151a',
  '--dsw-alias-bg-layer-2': '#16191f',
  '--dsw-alias-bg-layer-3': '#1a1f27',
  '--dsw-alias-bg-overlay': '#1a1f27',
  '--dsw-alias-bg-module-platform': '#0e1116',
  '--dsw-alias-bg-skeleton': '#1a1f27',
  '--dsw-alias-bg-multi-select': 'rgba(62,207,142,0.16)',
  '--dsw-specific-sidebar-fill': '#0e1116',
  '--dsw-specific-sidebar-nav-item-hover': '#16191f',
  '--dsw-specific-sidebar-nav-item-active': '#1a1f27',
  '--dsw-specific-sidebar-nav-item-active-accent': 'rgba(62,207,142,0.16)',
  '--dsw-specific-bubble': '#16191f',
  '--dsw-specific-bubble-highlight': '#1a1f27',
  '--dsw-specific-input-major': '#12151a',
  '--dsw-specific-login-input': '#12151a',
  '--dsw-specific-menu': '#1a1f27',
  '--dsw-specific-selector': '#16191f',
  '--dsw-specific-tip': '#16191f',
  '--dsw-alias-toast-bg': '#16191f',
  '--dsw-alias-tooltip-bg': '#1a1f27',
  // ── Masks (flat, no glow) ───────────────────────────────────────────────
  '--dsw-alias-bg-mask-1': 'rgba(6,8,10,0.6)',
  '--dsw-alias-bg-mask-2': 'rgba(6,8,10,0.7)',
  '--dsw-alias-bg-mask-3': 'rgba(6,8,10,0.82)',
  '--dsw-alias-bg-mask-drop': 'rgba(6,8,10,0.5)',
  '--dsw-alias-bg-mask-photo': 'rgba(6,8,10,0.5)',
  // ── Hairlines (Codex builds depth from 1px strokes, not shadows) ────────
  '--dsw-alias-hairline': '#1a202a',
  '--dsw-alias-border-l1': '#1a202a',
  '--dsw-alias-border-l2': '#232a33',
  '--dsw-alias-border-l2-darkmode-thin': '#232a33',
  '--dsw-alias-border-l3': '#2c343f',
  '--dsw-alias-border-l4': '#38424e',
  '--dsw-alias-border-inverted': '#e6e9ee',
  '--dsw-alias-border-inverted2': '#b7bec8',
  // ── Text ────────────────────────────────────────────────────────────────
  '--dsw-alias-label-primary': '#e6e9ee',
  '--dsw-alias-label-primary-bluish': '#e6e9ee',
  '--dsw-alias-label-primary-dimmed': '#b7bec8',
  '--dsw-alias-label-primary-foreground': '#06130c',
  '--dsw-alias-label-primary-inverted': '#06130c',
  '--dsw-alias-label-secondary': '#b7bec8',
  '--dsw-alias-label-tertiary': '#8b929d',
  '--dsw-alias-label-caption': '#5f6670',
  '--dsw-alias-label-dimmed': '#5f6670',
  // ── Accent: the signature terminal green ────────────────────────────────
  '--dsw-alias-accent': '#3ecf8e',
  '--dsw-alias-accent-ink': '#06130c',
  '--dsw-alias-accent-soft': 'rgba(62,207,142,0.12)',
  '--dsw-alias-brand-primary': '#3ecf8e',
  '--dsw-alias-brand-primary-invert': '#06130c',
  '--dsw-alias-brand-primary-new-colorprimary-new-color': '#3ecf8e',
  '--dsw-alias-brand-text': '#06130c',
  '--dsw-alias-button-primary-fill': '#3ecf8e',
  '--dsw-alias-button-primary-hover': '#2eb97a',
  '--dsw-alias-button-primary-dimmed': 'rgba(62,207,142,0.5)',
  '--dsw-alias-button-contrast-fill': '#e6e9ee',
  '--dsw-alias-button-elevated-fill': '#1a1f27',
  '--dsw-alias-button-floating-fill': '#16191f',
  '--dsw-alias-button-floating-hover': '#1a1f27',
  '--dsw-alias-button-info-fill': '#56d4dd',
  '--dsw-alias-button-info-hover': '#3ecf8e',
  '--dsw-alias-button-info-label': '#06130c',
  '--dsw-alias-button-tool-bar-fill': '#16191f',
  '--dsw-alias-button-tool-bar-fill-invisible': 'transparent',
  '--dsw-alias-button-tool-bar-hover': '#1a1f27',
  '--dsw-alias-button-ghost-active-fill': 'rgba(62,207,142,0.12)',
  '--dsw-alias-button-ghost-active-hover': 'rgba(62,207,142,0.18)',
  '--dsw-alias-button-ghost-active-border': 'rgba(62,207,142,0.4)',
  // ── Interaction ─────────────────────────────────────────────────────────
  '--dsw-alias-interactive-bg-hover': '#16191f',
  '--dsw-alias-interactive-bg-active': '#1a1f27',
  '--dsw-alias-interactive-bg-hover-accent': 'rgba(62,207,142,0.12)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgba(248,113,113,0.12)',
  '--dsw-alias-interactive-bg-hover-solid': '#1a1f27',
  // ── States ──────────────────────────────────────────────────────────────
  '--dsw-alias-danger': '#f87171',
  '--dsw-alias-state-success-primary': '#4ade80',
  '--dsw-alias-state-success-secondary': '#3ecf8e',
  '--dsw-alias-state-success-tertiary': 'rgba(62,207,142,0.5)',
  '--dsw-alias-state-error-primary': '#f87171',
  '--dsw-alias-state-error-secondary': '#fca5a5',
  '--dsw-alias-state-warn-primary': '#fbbf24',
  '--dsw-alias-state-warn-secondary': '#f5c451',
  '--dsw-alias-state-warn-tertiary': 'rgba(251,191,36,0.5)',
  '--dsw-alias-state-warn-label': '#f5c451',
  '--dsw-alias-state-business-primary': '#56d4dd',
  '--dsw-alias-state-business-tertiary': 'rgba(86,212,221,0.5)',
  // ── Markdown / code ─────────────────────────────────────────────────────
  '--dsw-alias-markdown-code-block': '#06080a',
  '--dsw-alias-markdown-code-block-banner': '#12151a',
  '--dsw-alias-markdown-inline-code': '#12151a',
  '--dsw-alias-markdown-citation': '#56d4dd',
  '--dsw-alias-markdown-placeholder': '#5f6670',
  '--dsw-alias-markdown-tag': '#12151a',
  '--dsw-alias-markdown-code-segment-selected': 'rgba(62,207,142,0.18)',
  '--dsw-alias-markdown-code-segment-unselected': 'transparent',
  // ── Scrollbars ──────────────────────────────────────────────────────────
  '--dsw-alias-scrollbar-bg-l1': '#1a1f27',
  '--dsw-alias-scrollbar-bg-l2': '#232a33',
  '--dsw-alias-scrollbar-hover-l1': '#2c343f',
  '--dsw-alias-scrollbar-hover-l2': '#38424e',
  // ── Mono-first code typography ──────────────────────────────────────────
  // Scope note: Codex is monospace-first, but only the CODE surfaces are
  // switched here. The app's UI font family and the `--dsw-font-*-size`
  // primitives stay untouched — overriding those reflows every chat surface.
  '--dsw-font-mono': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  '--ds-font-family-code': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
}

/**
 * Tokens the sidebar consumes but this palette deliberately leaves to the app
 * (typography primitives, elevation and blur are theme-neutral), so the
 * completeness guard can distinguish "missing" from "inherited on purpose".
 */
export const CODEX_INHERITED_TOKENS: readonly string[] = [
  '--dsw-font-s-13',
  '--dsw-font-s-14',
  '--dsw-font-s-strong-14',
  '--dsw-font-xs-13',
  '--dsw-font-xs-strong-13',
  '--dsw-font-xxs-12',
  '--dsw-font-xxs-strong-12',
  '--dsw-font-xxxs-11',
  '--dsw-font-xxxs-11-font-size',
  '--dsw-font-xxxs-11-line-height',
  '--dsw-font-xxxs-strong-11',
  '--dsw-font-markdown-code-block-small',
  '--dsw-shadow-lv2',
  '--dsw-shadow-lv3',
  '--dsw-mask-blur',
  '--ds-transition-duration-slow',
  '--ds-ease-in-out',
]

/** The alias-lever subset (kept small: these are the tokens a stale presenter was observed to drop). */
export const CODEX_ALIAS_LEVER: Record<string, string> = {
  '--dsw-alias-bg-base': '#0b0d10',
  '--dsw-alias-bg-layer-1': '#12151a',
  '--dsw-alias-bg-layer-2': '#16191f',
  '--dsw-alias-bg-layer-3': '#1a1f27',
  '--dsw-alias-bg-overlay': '#1a1f27',
  '--dsw-alias-bg-module-platform': '#0e1116',
  '--dsw-alias-hairline': '#1a202a',
  '--dsw-alias-border-l1': '#1a202a',
  '--dsw-alias-border-l2': '#232a33',
  '--dsw-alias-border-l3': '#2c343f',
  '--dsw-alias-accent': '#3ecf8e',
  '--dsw-alias-accent-ink': '#06130c',
  '--dsw-alias-accent-soft': 'rgba(62,207,142,0.12)',
  '--dsw-alias-brand-primary': '#3ecf8e',
  '--dsw-alias-label-primary': '#e6e9ee',
  '--dsw-alias-label-secondary': '#b7bec8',
  '--dsw-alias-label-tertiary': '#8b929d',
  '--dsw-alias-button-primary-fill': '#3ecf8e',
  '--dsw-alias-button-primary-hover': '#2eb97a',
  '--dsw-alias-danger': '#f87171',
  '--dsw-alias-state-success-primary': '#4ade80',
  '--dsw-alias-state-error-primary': '#f87171',
  '--dsw-alias-state-warn-primary': '#fbbf24',
  '--dsw-specific-sidebar-fill': '#0e1116',
}

/** The theme service face this module uses (the `theme` service provided by @deepseek-ai/dsh-client-ui-theme). */
export interface CodexThemeFace {
  /** Current immutable snapshot; `preference` is the resolved theme id. */
  getTheme(): { preference?: string } | undefined
  /** Switch the theme preference (throws for an unregistered id). */
  setTheme(id: string): void
  /** Register a theme definition; throws on a duplicate id. */
  register(definition: {
    id: string
    colorScheme: 'dark'
    tokens: Record<string, string>
  }): () => void
}

/** The durable-state API this module uses (see src/client/api.ts). */
export interface CodexStateApi {
  codexStateGet(): Promise<{ available: boolean; active: boolean | null }>
  codexStateSet(active: boolean): Promise<unknown>
}

/** Read-only state store for React (`useSyncExternalStore`). */
export interface CodexAppliedStore {
  getSnapshot(): boolean
  subscribe(listener: () => void): () => void
}

/** The controller surface the Codex surfaces (settings row, sidebar pages) drive. */
export interface CodexThemeController {
  /** Whether the Codex palette is currently applied. */
  readonly store: CodexAppliedStore
  /** Register the theme with the service (idempotent per activation). */
  registerTheme(theme: CodexThemeFace): () => void
  /** Hydrate the persisted intent and converge the DOM to it. */
  hydrate(): Promise<void>
  /** Apply codex and persist the intent. */
  apply(): void
  /** Restore the system light/dark follow and persist the intent. */
  restore(): void
  /** Re-apply on Host theme change (wired to `theme/change`). */
  reassert(theme: CodexThemeFace | undefined): void
  /** Slow drift guard: re-apply while the resolved preference is not codex. */
  startGuard(getTheme: () => CodexThemeFace | undefined): () => void
  /** Delayed re-applies that win the race against the Host's boot-time restore. */
  scheduleBootReapply(): () => void
  /** Read the persisted intent without waiting for hydration ('' = unknown). */
  isActive(): boolean
  /** Dispose DOM levers (fiber disposal / HMR). */
  dispose(): void
}

/** The palette's two-tone swatch gradient (settings row / Codex page preview). */
export const CODEX_SWATCH_GRADIENT = 'linear-gradient(135deg,#0b0d10 60%,#3ecf8e)'

/** Install the alias-lever stylesheet (disabled until codex is applied). */
function installOverrideStyle(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(OVERRIDE_STYLE_ID) !== null) return
  const declarations = Object.entries(CODEX_ALIAS_LEVER)
    .map(([name, value]) => `${name}:${value}!important`)
    .join(';')
  const style = document.createElement('style')
  style.id = OVERRIDE_STYLE_ID
  // Plain `data-plugin` marker: tsdown's CSS-module pipeline only rewrites
  // imported .module.css files, and this sheet is constructed at runtime.
  style.dataset.plugin = 'codex-design'
  style.textContent = `:root{${declarations}}:root[${CODEX_ATTR}]{color-scheme:dark}`
  style.disabled = true
  document.head.appendChild(style)
}

/** Converge the DOM levers (stylesheet + inline vars + marker) to `active`. */
export function setCodexDomActive(active: boolean): void {
  if (typeof document === 'undefined') return
  // Only ACTIVATING must materialize the sheet: deactivating has to leave the
  // document as it found it, otherwise a caller that clears the levers right
  // after removing the sheet (controller.dispose) recreates it and leaks a node.
  if (active) installOverrideStyle()
  const style = document.getElementById(OVERRIDE_STYLE_ID) as HTMLStyleElement | null
  if (style !== null) style.disabled = !active
  const root = document.documentElement
  if (active) {
    root.setAttribute(CODEX_ATTR, '')
    for (const [name, value] of Object.entries(CODEX_ALIAS_LEVER)) root.style.setProperty(name, value)
  } else {
    root.removeAttribute(CODEX_ATTR)
    for (const name of Object.keys(CODEX_ALIAS_LEVER)) root.style.removeProperty(name)
  }
}

/** Remove the alias-lever stylesheet entirely (fiber disposal). */
function removeOverrideStyle(): void {
  if (typeof document === 'undefined') return
  document.getElementById(OVERRIDE_STYLE_ID)?.remove()
}

/**
 * Ask other theme plugins (dsh-catppuccin) to stop re-asserting their flavour,
 * so two theme plugins no longer fight over the preference: write its
 * localStorage flavour to "off" (it reads that on every theme/change) and PUT
 * its durable state route (which accepts "off" = follow system). Best-effort:
 * a missing plugin leaves both calls failing silently.
 */
function quietCatppuccin(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem('dsh.catppuccin.flavor', 'off')
  } catch {
    // Private-mode / disabled storage: the durable PUT below still lands.
  }
  try {
    void fetch('/catppuccin/state', {
      method: 'PUT',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ flavor: 'off' }),
    }).catch(() => {})
  } catch {
    // A blocked fetch must never break applying the theme.
  }
}

/** localStorage signal (browser-side tie-breaker while the host state hydrates). */
const STORAGE_KEY = 'dsh.codex-theme.active'

/** Read the localStorage tie-breaker. */
function readStored(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Write the localStorage tie-breaker. */
function writeStored(active: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (active) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignored: the durable host write is the authoritative record.
  }
}

/** Minimum spacing between "ask catppuccin to stand down" attempts. */
const QUIET_CATPPUCCIN_INTERVAL_MS = 30_000

/**
 * Create the Codex theme controller: the durable intent, the DOM levers and the
 * re-assert guards. One controller per client activation (no module-level
 * singleton).
 */
export function createCodexThemeController(api: CodexStateApi): CodexThemeController {
  /** Durable intent once known; null while unknown (still hydrating). */
  let durableActive: boolean | null = null
  let applied = readStored()
  let disposed = false
  let hydrating: Promise<void> | null = null
  let applying = false
  let lastQuiet = 0
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        // A throwing subscriber must not break the others.
      }
    }
  }
  const setApplied = (next: boolean): void => {
    if (applied === next) return
    applied = next
    notify()
  }

  const store: CodexAppliedStore = {
    getSnapshot: () => applied,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  const applyCodex = (theme?: CodexThemeFace): void => {
    // Re-entrancy guard: the guard's poll and the theme/change reassert can
    // land in the same tick; a re-entrant apply would storm the presenter.
    if (applying) return
    applying = true
    try {
      // Throttled: the drift guard may legitimately re-apply every 1.5s while a
      // host keeps reverting the preference, and asking catppuccin to stand
      // down (a localStorage write plus a PUT) on every one of those would be a
      // request storm for no extra effect.
      const now = Date.now()
      if (now - lastQuiet >= QUIET_CATPPUCCIN_INTERVAL_MS) {
        lastQuiet = now
        quietCatppuccin()
      }
      if (theme !== undefined) {
        try {
          theme.setTheme(CODEX_THEME_ID)
        } catch {
          // Unregistered id (registration still in flight): the DOM levers
          // below carry the palette until the next reassert.
        }
      }
      setCodexDomActive(true)
      setApplied(true)
    } finally {
      applying = false
    }
  }

  const clearCodex = (theme?: CodexThemeFace): void => {
    if (theme !== undefined) {
      try {
        theme.setTheme('system')
      } catch {
        // A host without the "system" preference keeps its own default.
      }
    }
    setCodexDomActive(false)
    setApplied(false)
  }

  let themeFace: CodexThemeFace | undefined

  /** The durable intent when known, else the localStorage tie-breaker. */
  const isActive = (): boolean => (durableActive === null ? readStored() : durableActive)

  /** One shared hydration pass (the boot call and the drift guard both use it). */
  const hydrate = async (): Promise<void> => {
    if (hydrating !== null) return hydrating
    hydrating = (async () => {
      for (let attempt = 0; attempt < 20 && !disposed; attempt += 1) {
        let result: { available: boolean; active: boolean | null }
        try {
          result = await api.codexStateGet()
        } catch {
          result = { available: false, active: null }
        }
        if (disposed) return
        if (result.available) {
          // The durable record wins over the localStorage tie-breaker: it is
          // the value that survived the last session (and the port churn).
          durableActive = result.active
          if (result.active === true) applyCodex(themeFace)
          else clearCodex(themeFace)
          return
        }
        await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)))
      }
    })().finally(() => {
      hydrating = null
    })
    return hydrating
  }

  return {
    store,
    registerTheme: (theme) => {
      themeFace = theme
      const dispose = theme.register({
        id: CODEX_THEME_ID,
        colorScheme: 'dark',
        tokens: CODEX_TOKENS,
      })
      // Converge immediately to the known intent (the registration happens
      // before hydration on purpose, so setTheme never targets an unknown id).
      if (isActive()) applyCodex(theme)
      else setCodexDomActive(false)
      return () => {
        dispose()
      }
    },
    hydrate,
    apply: () => {
      durableActive = true
      writeStored(true)
      applyCodex(themeFace)
      void api.codexStateSet(true).catch(() => {})
    },
    restore: () => {
      durableActive = false
      writeStored(false)
      clearCodex(themeFace)
      void api.codexStateSet(false).catch(() => {})
    },
    reassert: (theme) => {
      if (theme !== undefined) themeFace = theme
      // Only the persisted intent re-asserts: a Host reset must not be able to
      // bury codex, while an explicit "restore system" must stick.
      if (isActive()) applyCodex(themeFace)
    },
    startGuard: (getTheme) => {
      const timer = setInterval(() => {
        if (disposed) return
        if (durableActive === null) {
          void hydrate()
          return
        }
        if (durableActive !== true) return
        let current: string | undefined
        try {
          current = getTheme()?.getTheme()?.preference
        } catch {
          current = undefined
        }
        if (current !== CODEX_THEME_ID) applyCodex(themeFace)
      }, 1500)
      return () => clearInterval(timer)
    },
    scheduleBootReapply: () => {
      const timers = [120, 400, 900, 1800, 3000, 5000, 8000].map(ms => setTimeout(() => {
        if (disposed) return
        if (isActive()) applyCodex(themeFace)
      }, ms))
      return () => {
        for (const timer of timers) clearTimeout(timer)
      }
    },
    isActive,
    dispose: () => {
      disposed = true
      listeners.clear()
      // Clear the levers FIRST, then drop the sheet: the reverse order let
      // setCodexDomActive(false) re-install the sheet it had just removed.
      setCodexDomActive(false)
      removeOverrideStyle()
    },
  }
}

/** Whether the Codex palette currently resolves to the dark scheme (preview hint). */
export function codexIsDark(): boolean {
  return isDarkScheme()
}
