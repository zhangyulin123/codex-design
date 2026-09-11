/**
 * Settings → General → "Codex theme" row.
 *
 * Registered into the DSH settings shell's `settings.general.item` slot — the
 * same slot the built-in Appearance and Font-size rows use, ordered after them
 * — so the Codex palette is applied and restored from the place users already
 * look for theme switches. The row is purely a control surface: all state lives
 * in the theme controller (see theme.ts).
 */
import { useSyncExternalStore, type ReactNode } from 'react'
import { t } from '../locales.ts'
import { CODEX_SWATCH_GRADIENT, type CodexThemeController } from './theme.ts'
import css from './settings.module.css'

/** Props injected by the registration in ./index.ts. */
export interface CodexThemeRowProps {
  controller: CodexThemeController
}

/**
 * The Codex theme row. The apply button stays ENABLED while codex reads as
 * active on purpose: the Host can silently revert the resolved theme, so the
 * user must always be able to force a re-apply.
 */
export function CodexThemeRow({ controller }: CodexThemeRowProps): ReactNode {
  const active = useSyncExternalStore(controller.store.subscribe, controller.store.getSnapshot)
  return (
    <div className={css.row}>
      <div className={css.swatch} aria-hidden="true" style={{ background: CODEX_SWATCH_GRADIENT }} />
      <div className={css.info}>
        <div className={css.name}>
          {t('codexThemeTitle')}
          {active ? <span className={css.tag}>{t('codexThemeActive')}</span> : null}
        </div>
        <div className={css.desc}>{t('codexThemeDesc')}</div>
      </div>
      <div className={css.actions}>
        <button type="button" className={css.btnPrimary} onClick={() => { controller.apply() }}>
          {t('codexThemeApply')}
        </button>
        <button type="button" className={css.btnGhost} onClick={() => { controller.restore() }}>
          {t('codexThemeRestore')}
        </button>
      </div>
    </div>
  )
}
