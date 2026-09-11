/**
 * Codex theme guards.
 *
 * Two contracts are pinned here:
 *
 *  1. **Token completeness** — the Codex palette must cover every `--dsw-*` /
 *     `--ds-*` design token this plugin's own surfaces consume (the sidebar
 *     chrome, the Codex page, the editor/terminal token readers). A token the
 *     sidebar reads but the palette does not define falls through to the app's
 *     default value, which shows up as a stray blue/white patch under the Codex
 *     theme — exactly the class of regression this scan catches statically.
 *     Tokens the palette deliberately leaves to the app (typography primitives,
 *     elevation, blur) are declared in CODEX_INHERITED_TOKENS.
 *  2. **Controller behavior** — apply / restore / hydrate / re-assert / dispose,
 *     including the durable host write, the DOM levers and the idempotence that
 *     keeps the Host's own preference re-adoption from burying the theme.
 */
// @vitest-environment jsdom
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CODEX_ALIAS_LEVER,
  CODEX_ATTR,
  CODEX_INHERITED_TOKENS,
  CODEX_SWATCH_GRADIENT,
  CODEX_THEME_ID,
  CODEX_TOKENS,
  createCodexThemeController,
  setCodexDomActive,
  type CodexStateApi,
  type CodexThemeFace,
} from '../src/client/codex/theme.ts'

/**
 * Plugin root for the source scan.
 *
 * This spec runs under `@vitest-environment jsdom` (the controller half needs a
 * `document`). In that environment `import.meta.url` — and the global `URL` that
 * resolves it — are jsdom's, not Node's, so `fileURLToPath(new URL('..', …))`
 * throws `The URL must be of scheme file` and the whole guard suite failed to
 * LOAD instead of running. Vitest executes with the package directory as cwd, so
 * resolve from there and VERIFY the candidate really is the plugin root: a wrong
 * cwd then fails loudly here rather than silently scanning nothing.
 */
function pluginRoot(): string {
  const root = resolve(process.cwd())
  if (!existsSync(join(root, 'src', 'client'))) {
    throw new Error(`codex-theme.spec: ${root} is not the plugin root (no src/client); run vitest from the package directory`)
  }
  return root
}

const ROOT = pluginRoot()

/** Every source file under src/client, excluding nothing (the scan is name-based). */
function clientSources(dir = join(ROOT, 'src', 'client')): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...clientSources(full))
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/** Token names referenced by the plugin's own sources, plus the bare prefixes. */
function consumedTokens(): { names: Set<string>; prefixes: Set<string> } {
  const names = new Set<string>()
  const prefixes = new Set<string>()
  for (const file of clientSources()) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/--(?:dsw|ds)-[a-z0-9-]*/g)) {
      const token = match[0]
      // A trailing dash means the name was interpolated in a template literal
      // (`var(--dsw-alias-label-${state})`): keep the PREFIX and require that
      // the palette covers at least one concrete token under it.
      if (token.endsWith('-')) prefixes.add(token.slice(0, -1))
      else names.add(token)
    }
  }
  // Prefixes found this way are also matched as plain names by the regex above
  // (e.g. `--dsw-alias-` is a name too) — drop them from the exact set.
  for (const prefix of prefixes) names.delete(prefix)
  return { names, prefixes }
}

afterEach(() => {
  document.documentElement.removeAttribute(CODEX_ATTR)
  document.documentElement.removeAttribute('style')
  for (const style of document.querySelectorAll('style')) style.remove()
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('Codex palette token coverage', () => {
  it('defines only CSS custom properties with non-empty values', () => {
    for (const [name, value] of Object.entries(CODEX_TOKENS)) {
      expect(name, name).toMatch(/^--(?:dsw|ds)-[a-z0-9-]+$/)
      expect(value.trim(), name).not.toBe('')
    }
  })

  it('covers every token this plugin consumes, or declares it deliberately inherited', () => {
    const { names } = consumedTokens()
    const inherited = new Set(CODEX_INHERITED_TOKENS)
    const missing = [...names]
      .filter(name => CODEX_TOKENS[name] === undefined && !inherited.has(name))
      .sort()
    expect(missing, 'tokens the sidebar reads but the Codex palette neither defines nor declares inherited').toEqual([])
  })

  it('covers every interpolated token prefix with at least one concrete token', () => {
    const { prefixes } = consumedTokens()
    const uncovered = [...prefixes]
      .filter(prefix => !Object.keys(CODEX_TOKENS).some(name => name.startsWith(`${prefix}-`)))
      .sort()
    expect(uncovered, 'interpolated token prefixes with no concrete palette entry').toEqual([])
  })

  it('defines the tokens the Codex look actually depends on', () => {
    // The accent trio is what the sidebar paints active/selected states with;
    // without them codex renders in the app's default blue.
    expect(CODEX_TOKENS['--dsw-alias-accent']).toBe('#3ecf8e')
    expect(CODEX_TOKENS['--dsw-alias-accent-ink']).toBeTruthy()
    expect(CODEX_TOKENS['--dsw-alias-accent-soft']).toBeTruthy()
    // Depth comes from 1px hairlines layered over near-black surfaces.
    expect(CODEX_TOKENS['--dsw-alias-hairline']).toBeTruthy()
    expect(CODEX_TOKENS['--dsw-alias-danger']).toBeTruthy()
    // Codex is monospace-first on its code surfaces.
    expect(CODEX_TOKENS['--dsw-font-mono']).toContain('monospace')
    expect(CODEX_TOKENS['--ds-font-family-code']).toContain('monospace')
    // The sidebar's own fill token must not fall back to the app default.
    expect(CODEX_TOKENS['--dsw-specific-sidebar-fill']).toBe('#0e1116')
  })

  it('keeps the alias lever a faithful subset of the palette it backs up', () => {
    // The lever is the belt-and-braces `!important` layer for hosts whose
    // presenter drops a token; a lever value that disagrees with the palette
    // would make the UI depend on which lever won.
    for (const [name, value] of Object.entries(CODEX_ALIAS_LEVER)) {
      expect(CODEX_TOKENS[name], name).toBe(value)
    }
    expect(Object.keys(CODEX_ALIAS_LEVER).length).toBeGreaterThan(0)
  })

  it('ships a swatch gradient for the settings row and the Codex page', () => {
    expect(CODEX_SWATCH_GRADIENT).toContain('#0b0d10')
    expect(CODEX_SWATCH_GRADIENT).toContain('#3ecf8e')
  })

  it('declares no token in both the palette and the inherited list (no contradiction)', () => {
    for (const name of CODEX_INHERITED_TOKENS) {
      expect(CODEX_TOKENS[name], name).toBeUndefined()
    }
  })
})

/** A theme-service double recording every preference write. */
function fakeTheme(): { face: CodexThemeFace; calls: string[]; registrations: string[]; preference: () => string } {
  const calls: string[] = []
  const registrations: string[] = []
  let preference = 'system'
  return {
    calls,
    registrations,
    preference: () => preference,
    face: {
      getTheme: () => ({ preference }),
      setTheme: (id) => {
        preference = id
        calls.push(id)
      },
      register: (definition) => {
        registrations.push(definition.id)
        return () => {}
      },
    },
  }
}

/** A durable-state API double. */
function fakeApi(state: { available: boolean; active: boolean | null }): { api: CodexStateApi; writes: boolean[] } {
  const writes: boolean[] = []
  return {
    writes,
    api: {
      codexStateGet: async () => ({ ...state }),
      codexStateSet: async (active: boolean) => {
        writes.push(active)
        return { active }
      },
    },
  }
}

const overrideSheet = (): HTMLStyleElement | null =>
  document.getElementById('codex-design-override') as HTMLStyleElement | null

describe('Codex theme controller', () => {
  it('registers the codex theme definition (dark scheme, palette tokens)', () => {
    const theme = fakeTheme()
    const controller = createCodexThemeController(fakeApi({ available: true, active: false }).api)
    const dispose = controller.registerTheme(theme.face)
    expect(theme.registrations).toEqual([CODEX_THEME_ID])
    dispose()
  })

  it('applies the theme: service preference, DOM levers and the durable write', () => {
    const theme = fakeTheme()
    const { api, writes } = fakeApi({ available: true, active: false })
    const controller = createCodexThemeController(api)
    controller.registerTheme(theme.face)

    controller.apply()

    expect(theme.preference()).toBe(CODEX_THEME_ID)
    expect(controller.store.getSnapshot()).toBe(true)
    expect(controller.isActive()).toBe(true)
    expect(document.documentElement.hasAttribute(CODEX_ATTR)).toBe(true)
    // The alias lever is a stylesheet plus inline custom properties on <html>.
    expect(overrideSheet()?.disabled).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--dsw-alias-bg-base')).toBe('#0b0d10')
    expect(writes).toEqual([true])
    expect(window.localStorage.getItem('dsh.codex-theme.active')).toBe('1')
  })

  it('restores the system follow: clears the service preference, the levers and the flag', () => {
    const theme = fakeTheme()
    const { api, writes } = fakeApi({ available: true, active: true })
    const controller = createCodexThemeController(api)
    controller.registerTheme(theme.face)
    controller.apply()

    controller.restore()

    expect(theme.preference()).toBe('system')
    expect(controller.store.getSnapshot()).toBe(false)
    expect(document.documentElement.hasAttribute(CODEX_ATTR)).toBe(false)
    expect(overrideSheet()?.disabled).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--dsw-alias-bg-base')).toBe('')
    expect(writes).toEqual([true, false])
    expect(window.localStorage.getItem('dsh.codex-theme.active')).toBeNull()
  })

  it('hydrates the persisted intent from the host and converges the DOM', async () => {
    const theme = fakeTheme()
    const controller = createCodexThemeController(fakeApi({ available: true, active: true }).api)
    controller.registerTheme(theme.face)

    await controller.hydrate()

    expect(controller.isActive()).toBe(true)
    expect(theme.preference()).toBe(CODEX_THEME_ID)
    expect(document.documentElement.hasAttribute(CODEX_ATTR)).toBe(true)
  })

  it('hydrating a persisted "off" clears an applied theme', async () => {
    const theme = fakeTheme()
    const controller = createCodexThemeController(fakeApi({ available: true, active: false }).api)
    controller.registerTheme(theme.face)
    controller.apply()

    await controller.hydrate()

    expect(controller.isActive()).toBe(false)
    expect(theme.preference()).toBe('system')
    expect(document.documentElement.hasAttribute(CODEX_ATTR)).toBe(false)
  })

  it('re-asserts codex on a host theme change only while the intent is on', () => {
    const theme = fakeTheme()
    const controller = createCodexThemeController(fakeApi({ available: true, active: true }).api)
    controller.registerTheme(theme.face)
    controller.apply()
    theme.calls.length = 0

    // A Host reset moves the preference away -> the re-assert puts it back.
    theme.face.setTheme('system')
    theme.calls.length = 0
    controller.reassert(theme.face)
    expect(theme.calls).toEqual([CODEX_THEME_ID])

    // An explicit user "restore system" must stick against the re-assert.
    controller.restore()
    theme.calls.length = 0
    controller.reassert(theme.face)
    expect(theme.calls).toEqual([])
  })

  it('the drift guard re-applies codex when the resolved preference is not codex', () => {
    vi.useFakeTimers()
    const theme = fakeTheme()
    const controller = createCodexThemeController(fakeApi({ available: true, active: true }).api)
    controller.registerTheme(theme.face)
    controller.apply()
    const stop = controller.startGuard(() => theme.face)
    theme.calls.length = 0

    theme.face.setTheme('system')
    theme.calls.length = 0
    vi.advanceTimersByTime(1600)

    expect(theme.calls).toEqual([CODEX_THEME_ID])
    stop()
  })

  it('dispose removes the stylesheet and clears the DOM levers', () => {
    const theme = fakeTheme()
    const controller = createCodexThemeController(fakeApi({ available: true, active: true }).api)
    controller.registerTheme(theme.face)
    controller.apply()
    expect(existsSync(join(ROOT, 'src', 'client', 'codex', 'theme.ts'))).toBe(true)

    controller.dispose()

    expect(overrideSheet()).toBeNull()
    expect(document.documentElement.hasAttribute(CODEX_ATTR)).toBe(false)
  })

  it('setCodexDomActive is idempotent across repeated activations', () => {
    setCodexDomActive(true)
    setCodexDomActive(true)
    expect(document.querySelectorAll('style#codex-design-override')).toHaveLength(1)
    setCodexDomActive(false)
    setCodexDomActive(false)
    expect(document.documentElement.style.getPropertyValue('--dsw-alias-accent')).toBe('')
  })
})
