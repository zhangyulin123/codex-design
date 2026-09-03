window.__ModuleLoader__.load({
  id: 'codex-design',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings.codexDesignDemo'
    const THEME_ID = 'codex'
    const OVERRIDE_ID = 'codex-theme-override'
    const STORAGE_KEY = 'dsh.codex-theme.active'
    const STATE_ROUTE_PATH = '/codex-design/state'
    const CATPPUCCIN_ROUTE = '/catppuccin/state'

    const en = {
      themeTitle: 'Codex theme',
      themeDesc: 'Apply the terminal-native Codex palette (near-black canvas, signature green accent) to the whole Harness UI.',
      themeApply: 'Apply Codex theme',
      themeOff: 'Follow system light / dark',
      themeActive: 'Codex theme is active'
    }

    const zh = {
      themeTitle: 'Codex 主题',
      themeDesc: '把终端原生的 Codex 配色（近黑画布 + 标志性绿色点缀）应用到整个 Harness 界面。',
      themeApply: '应用 Codex 主题',
      themeOff: '恢复系统 亮/暗 跟随',
      themeActive: 'Codex 主题已生效'
    }

    // Codex palette, mapped onto the SAME semantic theme-token names the host
    // theme presenter understands (the set dsh-catppuccin uses, which provably
    // restyles the UI). Registering a theme with these + setTheme('codex') is
    // how the host actually applies a third-party theme.
    const CODEX_TOKENS = {
      autoAccept: '#3ecf8e',
      bashBorder: '#56d4dd',
      claude: '#3ecf8e',
      toolNameMutate: '#f5c451',
      toolNameExec: '#56d4dd',
      claudeShimmer: '#4ade80',
      claudeBlue_FOR_SYSTEM_SPINNER: '#3ecf8e',
      claudeBlueShimmer_FOR_SYSTEM_SPINNER: '#4ade80',
      permission: '#3ecf8e',
      permissionShimmer: '#4ade80',
      planMode: '#3ecf8e',
      ide: '#3ecf8e',
      promptBorder: '#232a33',
      promptBorderShimmer: '#3ecf8e',
      text: '#e6e9ee',
      inverseText: '#06130c',
      inactive: '#8b929d',
      inactiveShimmer: '#b7bec8',
      subtle: '#5f6670',
      suggestion: '#3ecf8e',
      remember: '#3ecf8e',
      background: '#0b0d10',
      success: '#4ade80',
      error: '#f87171',
      warning: '#fbbf24',
      merged: '#3ecf8e',
      warningShimmer: '#f5c451',
      diffAdded: 'rgba(62,207,142,0.16)',
      diffRemoved: 'rgba(248,113,113,0.16)',
      diffAddedDimmed: 'rgba(62,207,142,0.08)',
      diffRemovedDimmed: 'rgba(248,113,113,0.08)',
      diffAddedWord: 'rgba(62,207,142,0.24)',
      diffRemovedWord: 'rgba(248,113,113,0.24)',
      toolCardBackground: '#12151a',
      toolCardBackgroundDim: '#06080a',
      toolDotExec: '#4ade80',
      toolDotRead: '#56d4dd',
      toolDotWrite: '#3ecf8e',
      toolDotWeb: '#56d4dd',
      toolDotTask: '#a78bfa',
      syntaxKeyword: '#3ecf8e',
      syntaxString: '#4ade80',
      syntaxComment: '#5f6670',
      syntaxNumber: '#f5c451',
      syntaxFunction: '#56d4dd',
      syntaxType: '#f5c451',
      syntaxVariable: '#e6e9ee',
      syntaxOperator: '#56d4dd',
      syntaxPunctuation: '#8b929d',
      syntaxConstant: '#f5c451',
      red_FOR_SUBAGENTS_ONLY: '#f87171',
      blue_FOR_SUBAGENTS_ONLY: '#56d4dd',
      green_FOR_SUBAGENTS_ONLY: '#4ade80',
      yellow_FOR_SUBAGENTS_ONLY: '#fbbf24',
      purple_FOR_SUBAGENTS_ONLY: '#a78bfa',
      orange_FOR_SUBAGENTS_ONLY: '#f5c451',
      pink_FOR_SUBAGENTS_ONLY: '#f87171',
      cyan_FOR_SUBAGENTS_ONLY: '#56d4dd',
      professionalBlue: '#56d4dd',
      chromeYellow: '#f5c451',
      clawd_body: '#3ecf8e',
      clawd_background: '#06080a',
      userMessageBackgroundHover: 'rgba(62,207,142,0.08)',
      messageActionsBackground: '#12151a',
      selectionBg: 'rgba(62,207,142,0.24)',
      bashMessageBackgroundColor: 'rgba(6,8,10,0.6)',
      memoryBackgroundColor: 'rgba(6,8,10,0.6)',
      rate_limit_fill: '#3ecf8e',
      rate_limit_empty: '#1a1f27',
      fastMode: '#3ecf8e',
      fastModeShimmer: '#4ade80',
      briefLabelYou: '#f5c451',
      briefLabelClaude: '#3ecf8e',
      rainbow_red: '#f87171',
      rainbow_orange: '#f5c451',
      rainbow_yellow: '#fbbf24',
      rainbow_green: '#4ade80',
      rainbow_blue: '#56d4dd',
      rainbow_indigo: '#a78bfa',
      rainbow_violet: '#a78bfa',
      rainbow_red_shimmer: '#e08b8b',
      rainbow_orange_shimmer: '#f2b97e',
      rainbow_yellow_shimmer: '#f4d190',
      rainbow_green_shimmer: '#79d9a7',
      rainbow_blue_shimmer: '#86cfe0',
      rainbow_indigo_shimmer: '#c3b3f2',
      rainbow_violet_shimmer: '#c3b3f2',
      subagentBullet: '#3ecf8e',
      subagentDescription: '#b7bec8',
      subagentModel: '#8b929d',
      subagentElapsed: '#8b929d',
      subagentToolName: '#3ecf8e',
      subagentStatusRunning: '#3ecf8e',
      subagentStatusCompleted: '#4ade80',
      subagentStatusFailed: '#f87171'
    }

    // Alias-layer override (stylesheet !important + inline) as a secondary lever
    // in case the host's presenter doesn't cover every semantic token.
    const ALIAS_TOKENS = {
      '--dsw-alias-bg-base': '#0b0d10',
      '--dsw-alias-bg-layer-1': '#12151a',
      '--dsw-alias-bg-layer-2': '#16191f',
      '--dsw-alias-bg-layer-3': '#1a1f27',
      '--dsw-alias-bg-overlay': '#1a1f27',
      '--dsw-alias-bg-module-platform': '#0e1116',
      '--dsw-alias-border-l1': '#1a202a',
      '--dsw-alias-border-l2': '#232a33',
      '--dsw-alias-border-l3': '#2c343f',
      '--dsw-alias-brand-primary': '#3ecf8e',
      '--dsw-alias-label-primary': '#e6e9ee',
      '--dsw-alias-label-secondary': '#b7bec8',
      '--dsw-alias-label-tertiary': '#8b929d',
      '--dsw-alias-button-primary-fill': '#3ecf8e',
      '--dsw-alias-button-primary-hover': '#2eb97a',
      '--dsw-alias-state-success-primary': '#4ade80',
      '--dsw-alias-state-error-primary': '#f87171',
      '--dsw-alias-state-warn-primary': '#fbbf24'
    }

    const css = `
      .cdd-themeRow{display:flex;align-items:center;gap:14px;padding:4px 0}
      .cdd-themeSwatch{width:30px;height:30px;flex-shrink:0;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:linear-gradient(135deg,#0b0d10 60%,#3ecf8e)}
      .cdd-themeInfo{display:flex;flex-direction:column;gap:4px;min-width:0}
      .cdd-themeName{font-size:14px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary)}
      .cdd-themeDesc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);max-width:560px}
      .cdd-themeActions{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto}
      .cdd-themeBtn{display:inline-flex;align-items:center;justify-content:center;height:30px;padding:0 12px;border-radius:15px;font:500 13px/1 system-ui,sans-serif;border:1px solid transparent;cursor:pointer}
      .cdd-themeBtn--primary{background:#3ecf8e;color:#06130c}
      .cdd-themeBtn--primary:hover{background:#2eb97a}
      .cdd-themeBtn--ghost{background:transparent;color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l3)}
      .cdd-themeBtn--ghost:hover{background:var(--dsw-alias-bg-layer-2)}
      .cdd-themeTag{font:600 11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:1.2px;text-transform:uppercase;background:#3ecf8e;color:#06130c;border-radius:999px;padding:3px 10px}
    `

    function installStyles() {
      if (document.querySelector('style[data-plugin-css="codex-design"]')) return
      const style = document.createElement('style')
      style.dataset.plugin = 'codex-design'
      style.dataset.pluginCss = 'codex-design'
      style.textContent = css
      document.head.appendChild(style)
    }

    function ensureOverrideStyle() {
      if (document.getElementById(OVERRIDE_ID)) return
      const decl = Object.entries(ALIAS_TOKENS)
        .map(([k, v]) => `${k}:${v}!important`)
        .join(';')
      const style = document.createElement('style')
      style.id = OVERRIDE_ID
      style.dataset.plugin = 'codex-design'
      style.textContent = `:root{${decl}}:root[data-cdx-codex]{color-scheme:dark}`
      style.disabled = true
      document.head.appendChild(style)
    }

    function setCodexActive(active) {
      const style = document.getElementById(OVERRIDE_ID)
      if (style) style.disabled = !active
      if (active) {
        document.documentElement.setAttribute('data-cdx-codex', '')
        for (const [k, v] of Object.entries(ALIAS_TOKENS)) {
          document.documentElement.style.setProperty(k, v)
        }
      } else {
        document.documentElement.removeAttribute('data-cdx-codex')
        for (const k of Object.keys(ALIAS_TOKENS)) {
          document.documentElement.style.removeProperty(k)
        }
      }
    }

    // Tiny change-notifier so the settings row re-renders on our own intent.
    const listeners = new Set()
    function notify() {
      for (const l of listeners) l()
    }
    function subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    }

    let durableActive = null
    async function readDurableRemote() {
      try {
        const response = await fetch(STATE_ROUTE_PATH, { headers: { accept: 'application/json' }, credentials: 'same-origin' })
        if (!response.ok) return { available: false, active: null }
        const payload = await response.json()
        if (payload.ok !== true) return { available: false, active: null }
        const state = payload.state
        return { available: true, active: state === null || state === undefined ? null : Boolean(state.active) }
      } catch {
        return { available: false, active: null }
      }
    }
    async function persistDurable(active) {
      try {
        if (active) window.localStorage.setItem(STORAGE_KEY, '1')
        else window.localStorage.removeItem(STORAGE_KEY)
      } catch {}
      try {
        await fetch(STATE_ROUTE_PATH, {
          method: 'PUT',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ active: Boolean(active) })
        })
      } catch {}
    }
    // Ask dsh-catppuccin to stop re-asserting its flavour (so it no longer fights
    // codex for the theme preference): write its localStorage flavour to "off"
    // (read on every theme/change) and PUT to its durable state route (survives
    // restart). Its server sanitizeState accepts flavour "off" (follow system).
    function quietCatppuccin() {
      try {
        window.localStorage.setItem('dsh.catppuccin.flavor', 'off')
      } catch {}
      try {
        void fetch(CATPPUCCIN_ROUTE, {
          method: 'PUT',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ flavor: 'off' })
        }).catch(() => {})
      } catch {}
    }

    function readStored() {
      if (durableActive !== null) return durableActive
      try {
        return window.localStorage.getItem(STORAGE_KEY) === '1'
      } catch {
        return false
      }
    }
    function writeStored(active) {
      durableActive = Boolean(active)
      void persistDurable(Boolean(active))
      notify()
    }

    function CodexThemeRow({ t, onCodex, onSystem }) {
      const active = React.useSyncExternalStore(subscribe, readStored)
      return React.createElement('div', { className: 'cdd-themeRow' },
        React.createElement('div', { className: 'cdd-themeSwatch', 'aria-hidden': 'true' }),
        React.createElement('div', { className: 'cdd-themeInfo' },
          React.createElement('div', { className: 'cdd-themeName' },
            t('themeTitle'),
            active ? React.createElement('span', { className: 'cdd-themeTag', style: { marginLeft: 8 } }, ' ' + t('themeActive')) : null
          ),
          React.createElement('div', { className: 'cdd-themeDesc' }, t('themeDesc'))
        ),
        React.createElement('div', { className: 'cdd-themeActions' },
          React.createElement('button', {
            type: 'button',
            className: 'cdd-themeBtn cdd-themeBtn--primary',
            onClick: () => onCodex(),
            disabled: active
          }, t('themeApply')),
          React.createElement('button', {
            type: 'button',
            className: 'cdd-themeBtn cdd-themeBtn--ghost',
            onClick: () => onSystem(),
            disabled: !active
          }, t('themeOff'))
        )
      )
    }

    const inject = ['slots', 'locale', 'theme']
    function apply(ctx) {
      installStyles()
      ensureOverrideStyle()
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'codex-design: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      const theme = ctx.get('theme')

      // Register the selectable codex theme (semantic tokens that the host
      // presenter applies), synchronously, so setTheme('codex') always resolves.
      const disposeTheme = theme.register({
        id: THEME_ID,
        colorScheme: 'dark',
        tokens: CODEX_TOKENS
      })
      ctx.effect(() => () => disposeTheme(), 'codex-design: dispose codex theme')

      // Apply the theme + override + quiet catppuccin when codex is intended.
      // Quiet catppuccin FIRST (synchronous localStorage write to "off"), so
      // when setTheme('codex') fires theme/change, catppuccin reads "off" and
      // does not re-assert its flavour — no fight even in the same session.
      const applyCodex = () => {
        quietCatppuccin()
        try {
          theme.setTheme(THEME_ID)
        } catch {
          /* ignore */
        }
        setCodexActive(true)
      }
      const clearCodex = () => {
        try {
          theme.setTheme('system')
        } catch {
          /* ignore */
        }
        setCodexActive(false)
      }

      // Re-assert codex on theme/change so a late host reset cannot bury it
      // (catppuccin is silenced, so this cannot ping-pong).
      const reassert = () => {
        if (readStored()) {
          try {
            theme.setTheme(THEME_ID)
          } catch {
            /* ignore */
          }
          setCodexActive(true)
        }
      }
      ctx.effect(() => {
        const off = ctx.on('theme/change', reassert)
        return () => off()
      }, 'codex-design: theme/change reassert')

      // Base initial state on our persisted intent.
      if (readStored()) applyCodex()
      else setCodexActive(false)

      // Hydrate persisted intent from the Host file (survives port churn).
      const hydrate = async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const res = await readDurableRemote()
          if (res.available) {
            durableActive = res.active
            if (durableActive) applyCodex()
            else setCodexActive(false)
            notify()
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
        }
      }
      void hydrate()

      ctx.slots.inject('settings.general.item', () =>
        ctx.slots.register(
          {
            name: 'settings.general.item',
            id: 'codex-theme',
            order: 30,
            locale: NS,
            inject: () => ({
              onCodex: () => {
                writeStored(true)
                applyCodex()
              },
              onSystem: () => {
                writeStored(false)
                clearCodex()
              }
            })
          },
          CodexThemeRow
        )
      )
    }

    exports.name = 'codex-design'
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
