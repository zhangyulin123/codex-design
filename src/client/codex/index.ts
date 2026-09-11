/**
 * Codex feature registration (client half).
 *
 * Wires the three Codex capabilities into the merged plugin:
 *
 *  1. the **theme** — applied through the DSH theme service and kept applied
 *     against the Host's own preference re-adoption (see theme.ts), with the
 *     control row contributed to DSH's Settings → General;
 *  2. the **Codex sidebar page** — registered as a normal tab through the same
 *     `ctx.betterSidebar` service external plugins use (eating our own dogfood),
 *     which is where the absorbed session-management surfaces live;
 *  3. the **Codex design-token viewer** — a file viewer for design-token /
 *     design-system documents, registered the same way.
 *
 * The theme service is reached through a SCOPED `ctx.inject`, never through the
 * plugin's own hard `inject` list: a host without the theme service must still
 * get the whole sidebar (the theme surfaces then simply stay dormant) instead of
 * losing the plugin entirely.
 */
import type { Context } from '../../context-types.ts'
import { api } from '../api.ts'
import type { BetterSidebarService } from '../service.ts'
import { createCodexThemeController, type CodexThemeFace } from './theme.ts'
import { CodexThemeRow } from './settings.tsx'
import { codexTabs, setCodexThemeController } from './panel.tsx'
import { codexViewers } from './viewer.tsx'

/**
 * Register every Codex surface.
 * @param ctx - the client context (slots + locale are hard deps of the client half).
 * @param service - the sidebar registry the plugin itself uses.
 * @returns a disposer unregistering everything (HMR / fiber disposal).
 */
export function registerCodex(ctx: Context, service: BetterSidebarService): () => void {
  const controller = createCodexThemeController(api)
  // The Codex page reads the controller through this setter (the descriptor is
  // built by codexTabs() without arguments) — set before registration so the
  // first render already sees it.
  setCodexThemeController(controller)

  const disposers: (() => void)[] = []
  // The Codex page and the token viewer are ordinary registrations: identical
  // contract, identical lifecycle to a third-party plugin's.
  for (const tab of codexTabs()) disposers.push(service.registerTab(tab))
  for (const viewer of codexViewers()) disposers.push(service.registerFileViewer(viewer))

  // Settings → General: the Codex theme control row, after the built-in
  // Appearance (order 10) and Font-size (order 11) rows.
  const offSlot = ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register(
      {
        name: 'settings.general.item',
        id: 'codex-theme',
        order: 20,
        registrant: 'codex-design',
        inject: () => ({ controller }),
      },
      CodexThemeRow
    ))

  // Theme wiring, scoped on the optional `theme` service. The callback re-runs
  // whenever the service (re)mounts, so a HMR/contribution remount re-registers
  // the theme instead of leaving a dangling definition.
  const themeFiber = ctx.inject(['theme'], (fctx) => {
    fctx.effect(() => {
      const theme = fctx.get('theme') as CodexThemeFace | undefined
      if (theme === undefined || typeof theme.register !== 'function') return () => {}
      const inner: (() => void)[] = []
      inner.push(controller.registerTheme(theme))
      // Re-assert on every theme change: a Host reset must not bury codex.
      const off = ctx.on('theme/change', () => { controller.reassert(theme) })
      inner.push(off)
      inner.push(controller.startGuard(() => fctx.get('theme') as CodexThemeFace | undefined))
      // The Host restores its own persisted (built-in) preference
      // asynchronously, after plugin load — re-apply a few times to win it.
      inner.push(controller.scheduleBootReapply())
      void controller.hydrate()
      return () => {
        for (const dispose of inner) {
          try {
            dispose()
          } catch {
            // A partially disposed wiring must not break plugin teardown.
          }
        }
      }
    }, 'codex-design: codex theme wiring')
  })

  return () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // Already unregistered (duplicate teardown): ignore.
      }
    }
    offSlot()
    void themeFiber.dispose()
    controller.dispose()
  }
}
