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

    // Codex palette mapped onto the theme service's token vocabulary. In this
    // Harness version a theme token is a CSS VARIABLE NAME: the presenter runs
    // `body.style.setProperty(name, value)` for every entry, so the keys MUST be
    // `--dsw-*` names. (Older builds keyed tokens by semantic names such as
    // `background`/`text`; those now set wrong or ignored CSS properties and
    // silently restyle nothing — which is exactly why applying codex did nothing.)
    const CODEX_TOKENS = {
      '--dsw-specific-sidebar-fill': '#0e1116',
      '--dsw-alias-bg-base': '#0b0d10',
      '--dsw-alias-bg-layer-1': '#12151a',
      '--dsw-alias-bg-layer-2': '#16191f',
      '--dsw-alias-bg-layer-3': '#1a1f27',
      '--dsw-alias-bg-overlay': '#1a1f27',
      '--dsw-alias-bg-module-platform': '#0e1116',
      '--dsw-alias-bg-skeleton': '#1a1f27',
      '--dsw-alias-bg-multi-select': 'rgba(62,207,142,0.16)',
      '--dsw-alias-bg-mask-1': 'rgba(6,8,10,0.6)',
      '--dsw-alias-bg-mask-2': 'rgba(6,8,10,0.7)',
      '--dsw-alias-bg-mask-3': 'rgba(6,8,10,0.82)',
      '--dsw-alias-bg-mask-drop': 'rgba(6,8,10,0.5)',
      '--dsw-alias-bg-mask-photo': 'rgba(6,8,10,0.5)',
      '--dsw-alias-toast-bg': '#16191f',
      '--dsw-alias-tooltip-bg': '#1a1f27',
      '--dsw-alias-border-l1': '#1a202a',
      '--dsw-alias-border-l2': '#232a33',
      '--dsw-alias-border-l3': '#2c343f',
      '--dsw-alias-border-l4': '#38424e',
      '--dsw-alias-border-l2-darkmode-thin': '#232a33',
      '--dsw-alias-border-inverted': '#e6e9ee',
      '--dsw-alias-border-inverted2': '#b7bec8',
      '--dsw-alias-label-primary': '#e6e9ee',
      '--dsw-alias-label-primary-bluish': '#e6e9ee',
      '--dsw-alias-label-primary-dimmed': '#b7bec8',
      '--dsw-alias-label-primary-foreground': '#06130c',
      '--dsw-alias-label-primary-inverted': '#06130c',
      '--dsw-alias-label-secondary': '#b7bec8',
      '--dsw-alias-label-tertiary': '#8b929d',
      '--dsw-alias-label-caption': '#5f6670',
      '--dsw-alias-label-dimmed': '#5f6670',
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
      '--dsw-alias-button-tool-bar-fill': '#16191f',
      '--dsw-alias-button-tool-bar-fill-invisible': 'transparent',
      '--dsw-alias-button-tool-bar-hover': '#1a1f27',
      '--dsw-alias-button-ghost-active-fill': 'rgba(62,207,142,0.12)',
      '--dsw-alias-button-ghost-active-hover': 'rgba(62,207,142,0.18)',
      '--dsw-alias-button-ghost-active-border': 'rgba(62,207,142,0.4)',
      '--dsw-alias-interactive-bg-hover': '#16191f',
      '--dsw-alias-interactive-bg-active': '#1a1f27',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(62,207,142,0.12)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(248,113,113,0.12)',
      '--dsw-alias-interactive-bg-hover-solid': '#1a1f27',
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
      '--dsw-alias-markdown-code-block': '#06080a',
      '--dsw-alias-markdown-code-block-banner': '#12151a',
      '--dsw-alias-markdown-inline-code': '#12151a',
      '--dsw-alias-markdown-citation': '#56d4dd',
      '--dsw-alias-markdown-placeholder': '#5f6670',
      '--dsw-alias-markdown-tag': '#12151a',
      '--dsw-alias-markdown-code-segment-selected': 'rgba(62,207,142,0.18)',
      '--dsw-alias-markdown-code-segment-unselected': 'transparent',
      '--dsw-alias-scrollbar-bg-l1': '#1a1f27',
      '--dsw-alias-scrollbar-bg-l2': '#232a33',
      '--dsw-alias-scrollbar-hover-l1': '#2c343f',
      '--dsw-alias-scrollbar-hover-l2': '#38424e'
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
      .cdd-session-delete{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;flex-shrink:0;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:0;line-height:1;padding:0}
      .cdd-session-delete:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-2)}
      .cdd-session-delete svg{width:15px;height:15px;display:block}
      .cdx-archived-entry{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:15px;font:500 13px/1 system-ui,sans-serif;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}
      .cdx-archived-entry:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
      .cdx-archived-entry-label{white-space:nowrap}
      .cdx-archived-entry--icon{width:32px;height:32px;padding:0;justify-content:center;border-radius:9px;position:relative}
      .cdx-archived-entry--icon .cdx-archived-entry-label{display:none}
      .cdx-archived-entry-icon{display:inline-flex;align-items:center;justify-content:center}
      .cdx-archived-entry-icon svg{width:16px;height:16px;display:block}
      .cdx-archived-entry--icon .cdx-archived-fab-badge{position:absolute;top:-5px;right:-5px;min-width:15px;height:15px;font-size:10px;padding:0 3px;border:2px solid var(--dsw-alias-bg-layer-2)}
      .cdx-archived-fab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;border-radius:999px;background:#3ecf8e;color:#06130c;font:600 11px/1 system-ui,sans-serif;padding:0 4px}
      .cdx-archived-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:80px 20px 20px}
      .cdx-archived-panel{width:min(560px,100%);max-height:70vh;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;box-shadow:0 12px 32px rgba(0,0,0,.5)}
      .cdx-archived-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
      .cdx-archived-title{font:600 15px/1.4 system-ui,sans-serif;color:var(--dsw-alias-label-primary);flex:1}
      .cdx-archived-count{font:500 12px/1 system-ui,sans-serif;color:var(--dsw-alias-label-tertiary)}
      .cdx-archived-close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:16px}
      .cdx-archived-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .cdx-archived-list{overflow:auto;padding:8px}
      .cdx-archived-empty{padding:28px 16px;text-align:center;font:500 13px/1.5 system-ui,sans-serif;color:var(--dsw-alias-label-tertiary)}
      .cdx-archived-row{display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:8px}
      .cdx-archived-row:hover{background:var(--dsw-alias-bg-layer-2)}
      .cdx-archived-row-title{flex:1;min-width:0;font:500 13px/1.4 system-ui,sans-serif;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cdx-archived-row-id{font:400 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--dsw-alias-label-tertiary)}
      .cdx-archived-btn{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:13px;font:500 12px/1 system-ui,sans-serif;border:1px solid transparent;cursor:pointer;white-space:nowrap}
      .cdx-archived-btn--restore{background:#3ecf8e;color:#06130c}
      .cdx-archived-btn--restore:hover{background:#2eb97a}
      .cdx-archived-btn--delete{background:transparent;color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-border-l3)}
      .cdx-archived-btn--delete:hover{background:rgba(248,113,113,.12)}
      .cdx-confirm-overlay{position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px}
      .cdx-confirm-panel{width:min(420px,100%);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:20px;box-shadow:0 14px 40px rgba(0,0,0,.55)}
      .cdx-confirm-title{font:600 15px/1.4 system-ui,sans-serif;color:var(--dsw-alias-label-primary);margin-bottom:8px}
      .cdx-confirm-msg{font:500 13px/1.6 system-ui,sans-serif;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-height:40vh;overflow:auto}
      .cdx-confirm-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
      .cdx-confirm-btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border-radius:16px;font:500 13px/1 system-ui,sans-serif;border:1px solid transparent;cursor:pointer}
      .cdx-confirm-btn--ghost{background:transparent;color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}
      .cdx-confirm-btn--ghost:hover{background:var(--dsw-alias-bg-layer-2)}
      .cdx-confirm-btn--danger{background:var(--dsw-alias-state-error-primary,#f87171);color:#06130c}
      .cdx-confirm-btn--danger:hover{filter:brightness(1.1)}
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
          // The apply button stays enabled even while codex is "active": the Host
          // can silently revert the resolved theme, so the user must always be
          // able to force a re-apply.
          React.createElement('button', {
            type: 'button',
            className: 'cdd-themeBtn cdd-themeBtn--primary',
            onClick: () => onCodex()
          }, t('themeApply')),
          React.createElement('button', {
            type: 'button',
            className: 'cdd-themeBtn cdd-themeBtn--ghost',
            onClick: () => onSystem()
          }, t('themeOff'))
        )
      )
    }

    // --- Delete-session capability -----------------------------------------
    // The workspace session-row "More" menu is hardcoded in the core UI and has
    // no extension slot, so this plugin adds a small trash button to each session
    // row (next to the ellipsis) that permanently deletes that session via the
    // host route above. Rows are matched by the action button's aria-label, and
    // the session id is resolved from the client sessions store by title.
    const DELETE_ROUTE_PATH = '/codex-design/session'
    const UNARCHIVE_ROUTE_PATH = '/codex-design/session/unarchive'

    // Themed, non-blocking confirm/alert dialogs. Native window.confirm/alert
    // ignore the theme and jank the Electron webview (native modal), so replace
    // them with a DOM overlay matching the Codex palette.
    function confirmDialog(message, title) {
      return new Promise((resolve) => {
        const overlay = document.createElement('div')
        overlay.className = 'cdx-confirm-overlay'
        overlay.innerHTML =
          '<div class="cdx-confirm-panel" role="dialog" aria-modal="true">' +
            '<div class="cdx-confirm-title">' + (title || '确认操作') + '</div>' +
            '<div class="cdx-confirm-msg"></div>' +
            '<div class="cdx-confirm-actions">' +
              '<button type="button" class="cdx-confirm-btn cdx-confirm-btn--ghost">取消</button>' +
              '<button type="button" class="cdx-confirm-btn cdx-confirm-btn--danger">确定</button>' +
            '</div>' +
          '</div>'
        overlay.querySelector('.cdx-confirm-msg').textContent = message
        let settled = false
        const finish = (value) => {
          if (settled) return
          settled = true
          overlay.remove()
          resolve(value)
        }
        overlay.querySelector('.cdx-confirm-btn--ghost').addEventListener('click', () => finish(false))
        overlay.querySelector('.cdx-confirm-btn--danger').addEventListener('click', () => finish(true))
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) finish(false)
        })
        document.body.appendChild(overlay)
        overlay.querySelector('.cdx-confirm-btn--danger').focus()
      })
    }

    function alertDialog(message, title) {
      return new Promise((resolve) => {
        const overlay = document.createElement('div')
        overlay.className = 'cdx-confirm-overlay'
        overlay.innerHTML =
          '<div class="cdx-confirm-panel" role="dialog" aria-modal="true">' +
            '<div class="cdx-confirm-title">' + (title || '提示') + '</div>' +
            '<div class="cdx-confirm-msg"></div>' +
            '<div class="cdx-confirm-actions">' +
              '<button type="button" class="cdx-confirm-btn cdx-confirm-btn--danger">确定</button>' +
            '</div>' +
          '</div>'
        overlay.querySelector('.cdx-confirm-msg').textContent = message
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          overlay.remove()
          resolve()
        }
        overlay.querySelector('.cdx-confirm-btn--danger').addEventListener('click', finish)
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) finish()
        })
        document.body.appendChild(overlay)
        overlay.querySelector('.cdx-confirm-btn--danger').focus()
      })
    }

    function deleteLabel() {
      const lang = (document.documentElement.lang || '').toLowerCase()
      return lang.startsWith('zh') ? '删除会话' : 'Delete session'
    }

    function rowTitleFromActionButton(button) {
      const label = button.getAttribute('aria-label') || ''
      // The zh dictionary uses curly quotes: 会话“<title>”的操作
      const zh = /^会话“(.*)”的操作$/.exec(label)
      if (zh) return zh[1]
      const prefix = 'Session actions for '
      if (label.startsWith(prefix)) return label.slice(prefix.length)
      return ''
    }

    // Resolve a session id from a row title. Tolerant of whitespace/markup drift
    // between the rendered row title and the sessions store title, so the delete
    // button works even when exact equality fails (e.g. new or renamed sessions).
    function resolveSessionId(sessions, rowTitle) {
      const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim()
      const target = norm(rowTitle)
      if (!target) return null
      try {
        const snapshot = sessions?.list?.getSnapshot?.()
        const ids = snapshot?.ids || []
        const byId = snapshot?.byId || {}
        for (const id of ids) {
          if (byId[id] && byId[id].title === rowTitle) return String(id)
        }
        for (const id of ids) {
          if (byId[id] && norm(byId[id].title) === target) return String(id)
        }
        let found = null
        let count = 0
        for (const id of ids) {
          if (byId[id] && norm(byId[id].title).startsWith(target)) {
            found = String(id)
            count += 1
          }
        }
        return count === 1 ? found : null
      } catch {
        return null
      }
    }

    function deleteSvg() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
    }

    function archiveSvg() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>'
    }

    function installSessionDelete(sessions) {
      const deleteText = deleteLabel()
      const observe = () => {
        // The workspace toggles each row's menu from a button whose aria-label is
        // 会话“<title>”的操作 (zh, curly quotes) or "Session actions for <title>" (en).
        document.querySelectorAll('button[aria-label]').forEach((anchor) => {
          const prev = anchor.previousElementSibling
          if (prev && prev.classList && prev.classList.contains('cdd-session-delete')) return
          const anchorLabel = anchor.getAttribute('aria-label') || ''
          const isSessionAction = /^会话“.*”的操作$/.test(anchorLabel) || anchorLabel.startsWith('Session actions for ')
          if (!isSessionAction) return
          // React re-renders may drop our button; the sibling check re-adds it.
          anchor.dataset.cdxSessionRow = '1'
          const rowTitle = rowTitleFromActionButton(anchor)
          const del = document.createElement('button')
          del.type = 'button'
          del.className = 'cdd-session-delete'
          del.dataset.cdxDelete = '1'
          del.title = deleteText
          del.setAttribute('aria-label', deleteText)
          del.innerHTML = deleteSvg()
          del.addEventListener('click', async (event) => {
            event.stopPropagation()
            event.preventDefault()
            const name = rowTitle || rowTitleFromActionButton(anchor) || '该会话'
            const targetId = resolveSessionId(sessions, rowTitle)
            if (!targetId) {
              await alertDialog(deleteText + '：找不到该会话，请刷新后重试', deleteText)
              return
            }
            const message = '确定要删除会话「' + name + '」吗？该会话的对话记录会被永久删除，且无法恢复。\n\n（若该会话正在运行，请先停止它再删除。）'
            const ok = await confirmDialog(message, '删除会话')
            if (!ok) return
            try {
              const response = await fetch(DELETE_ROUTE_PATH + '?id=' + encodeURIComponent(targetId), {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { accept: 'application/json' }
              })
              const payload = await response.json().catch(() => ({ ok: false }))
              if (payload && payload.ok) window.location.reload()
              else await alertDialog(deleteText + '失败：' + (payload?.error || 'unknown'), deleteText)
            } catch {
              await alertDialog(deleteText + '请求失败', deleteText)
            }
          })
          anchor.insertAdjacentElement('beforebegin', del)
        })
      }
      let scheduled = false
      const observer = new MutationObserver(() => {
        if (scheduled) return
        scheduled = true
        setTimeout(() => {
          scheduled = false
          try {
            observe()
          } catch {
            /* ignore */
          }
        }, 60)
      })
      observer.observe(document.body, { childList: true, subtree: true })
      // First pass + a few retries in case React mounts rows after apply.
      try {
        observe()
      } catch {
        /* ignore */
      }
      for (let i = 0; i < 5; i += 1) {
        setTimeout(() => {
          try {
            observe()
          } catch {
            /* ignore */
          }
        }, 200 * (i + 1))
      }
      return () => observer.disconnect()
    }

    // --- Archived-sessions management --------------------------------------
    // Core has no "view archived"/unarchive UI: archiving hides a session from
    // every grouping surface. This plugin registers a "已归档" entry into the
    // OFFICIAL `sidebar.footer.action` slot (renders beside the settings button,
    // never over it) which opens a panel listing archived sessions with Restore
    // (unarchive) and Delete actions. The list mirrors the client workspaces
    // projection (archivedSessionIds) cross-referenced with the sessions store.
    function createArchivedManager(ctx) {
      let overlay = null
      const getSessions = () => {
        try {
          return ctx.get('sessions')
        } catch {
          return null
        }
      }
      const getWorkspaces = () => {
        try {
          return ctx.get('workspaces')
        } catch {
          return null
        }
      }
      const idList = () => {
        try {
          const archived = getWorkspaces()?.list?.getSnapshot?.()?.archivedSessionIds || []
          const byId = getSessions()?.list?.getSnapshot?.()?.byId || {}
          // Drop ids whose session/log no longer exists (a ghost left over from a
          // prior partial delete or an un-materialized session), so the archived
          // list never shows an undeletable entry.
          return archived.filter((id) => byId[id] !== undefined)
        } catch {
          return []
        }
      }
      const titleOf = (id) => {
        try {
          return getSessions()?.list?.getSnapshot?.()?.byId?.[id]?.title || String(id)
        } catch {
          return String(id)
        }
      }
      // React-friendly count store for the footer badge.
      const listeners = new Set()
      let cachedCount = idList().length
      const countStore = {
        getSnapshot: () => cachedCount,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        }
      }
      const emit = () => {
        const next = idList().length
        if (next === cachedCount) return
        cachedCount = next
        for (const listener of listeners) listener()
      }
      let unsub = null
      const subscribeWorkspaces = () => {
        let w
        try {
          w = ctx.get('workspaces')
        } catch {
          w = null
        }
        if (!w || !w.list || !w.list.subscribe) return false
        unsub = w.list.subscribe(() => {
          emit()
          if (overlay) renderList()
        })
        emit()
        return true
      }
      if (!subscribeWorkspaces()) {
        for (let i = 0; i < 10 && !unsub; i += 1) setTimeout(() => {
          if (!unsub) subscribeWorkspaces()
        }, 200 * (i + 1))
      }

      function renderList() {
        if (!overlay) return
        const list = overlay.querySelector('.cdx-archived-list')
        const count = overlay.querySelector('.cdx-archived-count')
        const ids = idList()
        if (count) count.textContent = ids.length + ' 个'
        if (ids.length === 0) {
          list.innerHTML = '<div class="cdx-archived-empty">暂无已归档会话</div>'
          return
        }
        list.innerHTML = ''
        for (const id of ids) {
          const row = document.createElement('div')
          row.className = 'cdx-archived-row'
          const title = document.createElement('div')
          title.className = 'cdx-archived-row-title'
          title.textContent = titleOf(id)
          const idEl = document.createElement('div')
          idEl.className = 'cdx-archived-row-id'
          idEl.textContent = id
          const restore = document.createElement('button')
          restore.type = 'button'
          restore.className = 'cdx-archived-btn cdx-archived-btn--restore'
          restore.textContent = '恢复'
          restore.addEventListener('click', () => {
            void unarchive(id)
          })
          const del = document.createElement('button')
          del.type = 'button'
          del.className = 'cdx-archived-btn cdx-archived-btn--delete'
          del.textContent = '删除'
          del.addEventListener('click', () => {
            void removeArchived(id, titleOf(id))
          })
          row.appendChild(title)
          row.appendChild(idEl)
          row.appendChild(restore)
          row.appendChild(del)
          list.appendChild(row)
        }
      }
      function close() {
        if (overlay) {
          overlay.remove()
          overlay = null
        }
      }
      function open() {
        if (overlay) return
        overlay = document.createElement('div')
        overlay.className = 'cdx-archived-overlay'
        overlay.innerHTML =
          '<div class="cdx-archived-panel" role="dialog" aria-label="已归档会话">' +
            '<div class="cdx-archived-head"><div class="cdx-archived-title">已归档会话</div>' +
              '<div class="cdx-archived-count"></div>' +
              '<button type="button" class="cdx-archived-close" aria-label="关闭">✕</button></div>' +
            '<div class="cdx-archived-list"></div>' +
          '</div>'
        overlay.querySelector('.cdx-archived-close').addEventListener('click', close)
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) close()
        })
        document.body.appendChild(overlay)
        renderList()
      }

      async function unarchive(id) {
        try {
          const response = await fetch(UNARCHIVE_ROUTE_PATH, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ id })
          })
          const payload = await response.json().catch(() => ({ ok: false }))
          if (payload && payload.ok) {
            // Reload so the workspace projector rebuilds grouping from scratch and
            // the session lands in its proper workspace (not "未分区").
            window.location.reload()
          } else {
            await alertDialog('恢复失败：' + (payload?.error || 'unknown'), '恢复会话')
          }
        } catch {
          await alertDialog('恢复请求失败', '恢复会话')
        }
      }
      async function removeArchived(id, name) {
        const ok = await confirmDialog('确定要永久删除已归档会话「' + name + '」吗？该会话的对话记录会被删除，且无法恢复。', '删除会话')
        if (!ok) return
        try {
          const response = await fetch(DELETE_ROUTE_PATH + '?id=' + encodeURIComponent(id), {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { accept: 'application/json' }
          })
          const payload = await response.json().catch(() => ({ ok: false }))
          if (payload && payload.ok) {
            // A full reload clears the workspace/session projection — deleting the
            // log AND removing it from the archive set while the app runs leaves a
            // ghost that can wedge the projection, so refresh for a clean state.
            window.location.reload()
          } else {
            await alertDialog('删除失败：' + (payload?.error || 'unknown'), '删除会话')
          }
        } catch {
          await alertDialog('删除请求失败', '删除会话')
        }
      }

      return {
        countStore,
        open,
        close,
        dispose: () => {
          if (unsub) {
            unsub()
            unsub = null
          }
          close()
        }
      }
    }

    // Renders the "已归档 (N)" entry inside the sidebar footer, beside settings.
    // `wide` is the sidebar's expanded/rail state: in the collapsed rail show a
    // compact archive icon, otherwise the labeled pill.
    function ArchivedFooterEntry({ archived, onOpen, wide }) {
      const count = React.useSyncExternalStore(archived.subscribe, archived.getSnapshot)
      const className = 'cdx-archived-entry' + (wide ? '' : ' cdx-archived-entry--icon')
      return React.createElement(
        'button',
        { type: 'button', className, onClick: onOpen, title: '已归档会话', 'aria-label': '已归档会话' },
        wide
          ? React.createElement(React.Fragment, null,
              React.createElement('span', { className: 'cdx-archived-entry-label' }, '已归档'),
              count > 0 ? React.createElement('span', { className: 'cdx-archived-fab-badge' }, String(count)) : null)
          : React.createElement(React.Fragment, null,
              React.createElement('span', { className: 'cdx-archived-entry-icon', dangerouslySetInnerHTML: { __html: archiveSvg() } }),
              count > 0 ? React.createElement('span', { className: 'cdx-archived-fab-badge' }, String(count)) : null)
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

      // Apply codex. The theme service owns a DURABLE built-in preference and its
      // settings sync ("adopt") can reset the preference to that built-in AFTER we
      // apply — reverting the whole UI to the default while our own flag still
      // reads "active" (which used to leave the apply button disabled). So codex is
      // re-applied on a short schedule after load to win that race, the apply
      // button is never disabled, and applyCodex guards its own re-entrancy so the
      // theme/change reassert cannot storm.
      let applying = false
      const applyCodex = () => {
        if (applying) return
        applying = true
        try {
          quietCatppuccin()
          try {
            theme.setTheme(THEME_ID)
          } catch {
            /* ignore */
          }
          setCodexActive(true)
        } finally {
          applying = false
        }
      }
      const clearCodex = () => {
        try {
          theme.setTheme('system')
        } catch {
          /* ignore */
        }
        setCodexActive(false)
      }

      // Re-assert codex on every theme/change so a Host reset cannot bury it
      // (catppuccin is silenced, and applyCodex guards its own re-entrancy).
      const reassert = () => {
        if (readStored()) applyCodex()
      }
      ctx.effect(() => {
        const off = ctx.on('theme/change', reassert)
        return () => off()
      }, 'codex-design: theme/change reassert')

      // Base initial state on our persisted intent.
      if (readStored()) applyCodex()
      else setCodexActive(false)

      // The Host restores its own persisted (built-in) preference asynchronously,
      // after plugin load. Re-apply a few times so codex wins the race.
      ctx.effect(() => {
        const timers = [120, 400, 900, 1800, 3000, 5000, 8000].map((ms) =>
          setTimeout(() => {
            if (readStored()) applyCodex()
          }, ms)
        )
        return () => {
          for (const timer of timers) clearTimeout(timer)
        }
      }, 'codex-design: delayed re-apply')

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

      // Delete-session: attach a trash button to each session row. Uses the same
      // client sessions store the workspace browser consumes for title -> id.
      // Acquired lazily (NOT via `inject`) so the plugin still loads even if the
      // sessions service resolves after this apply; retry a few times.
      let deleteInstalled = false
      const ensureSessionDelete = () => {
        if (deleteInstalled) return
        let sessions
        try {
          sessions = ctx.get('sessions')
        } catch {
          sessions = null
        }
        if (!sessions || !sessions.list) return
        deleteInstalled = true
        ctx.effect(() => installSessionDelete(sessions), 'codex-design: session-row delete')
      }
      ensureSessionDelete()
      for (let i = 0; i < 20; i += 1) setTimeout(ensureSessionDelete, 250 * (i + 1))

      // Archived-sessions footer entry: register into the OFFICIAL
      // `sidebar.footer.action` slot (beside settings, so it never overlaps it).
      // The manager reads sessions/workspaces lazily via ctx.get().
      const archivedManager = createArchivedManager(ctx)
      ctx.effect(() => () => archivedManager.dispose(), 'codex-design: archived manager dispose')
      ctx.slots.inject('sidebar.footer.action', () =>
        ctx.slots.register(
          {
            name: 'sidebar.footer.action',
            id: 'codex-archived',
            order: 50,
            inject: () => ({
              archived: archivedManager.countStore,
              onOpen: archivedManager.open
            })
          },
          ArchivedFooterEntry
        )
      )

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
