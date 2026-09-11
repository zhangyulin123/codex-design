/**
 * Codex design-token file viewer (client half).
 *
 * A dedicated previewer for design-token / design-system documents: opening a
 * `DESIGN.md`, a `tokens.json`, a `design-tokens.css` or a theme `*.yaml`
 * renders a Codex-branded token board (swatch grid + monospace name/value
 * lists) instead of raw text. No CodeMirror and no lazy chunk: the viewer is a
 * plain parse + render over the `content` an `fsRead` match hands it.
 *
 * Matching — and the one place the service API does NOT let a plugin express
 * what the feature wants (docs/external-plugin-guide.md §5.4, service.ts's
 * `matchFileViewer`):
 *
 *  - The wanted rule is a FILE-NAME rule ("the base name mentions design/token
 *    and the file ends in .md/.json/.css/.yaml/.yml"). The registry has exactly
 *    two matching channels: `detect(path, head)` and `exts`. `detect` is the
 *    only one that ever sees the path, and it is consulted ONLY when head bytes
 *    are supplied — the built-in editor host supplies them only on the binary
 *    re-match of an fsRead result (EditorHost → planFsReadOutcome). A text
 *    `.md`/`.json` read never carries head bytes.
 *  - The precise variant (`exts: []` + `detect`) is therefore a PURE SNIFF
 *    descriptor: with no head it declines every path, and when it does fire on
 *    a binary re-match its `fsRead` strategy is degraded to the download UI by
 *    `planFsReadOutcome`. It would ship a viewer that never renders.
 *
 * So: the descriptor claims the five document extensions outright — the
 * smallest claim that actually renders — at priority 20 (above the built-in
 * markdown/html viewers at 0 and far above the catch-all `code` viewer at
 * -100), and carries the name rule in `detect` for the head-bearing flows.
 *
 * The over-claim is made harmless by DELEGATION, in this order:
 *
 *  - the descriptor claims the extensions, but the component only renders the
 *    Codex board for a file whose NAME says so (`design` / `token(s)` in the
 *    base name) AND whose content actually yields token pairs;
 *  - every other claimed file re-renders the built-in viewer's own behavior —
 *    `LazyTextEditor` with the `viewerId` the built-in would have passed
 *    ('markdown' / 'html' / 'code'), which is exactly what `TextEditor` keys
 *    its preview / edit / save modes off. A `.md` therefore keeps the full
 *    Markdown preview (GFM, Mermaid, TOC), and a `.json` / `.css` / `.yaml`
 *    config keeps CodeMirror editing — the workbench loses nothing.
 *
 * This is why the viewer can be registered by default instead of asking the
 * user to switch it off in the Side card settings.
 */
import { useMemo, type ComponentType, type ReactNode } from 'react'
import { IconListPenOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from '../locales.ts'
import { lazyChunkComponent } from '../lazy-chunk.tsx'
import { baseName, extOf } from '../paths.ts'
import type { FileViewerDescriptor, FileViewerProps } from '../service.ts'
import css from './codex-page.module.css'

/**
 * The built-in text editor, reached the sanctioned lazy way (the same wrapper
 * `builtins/viewers.tsx` uses): the CodeMirror chunk is fetched only when a
 * claimed file is actually opened. Importing the CHUNK itself is what the
 * purity gate forbids; importing this wrapper is not.
 */
const LazyTextEditor = lazyChunkComponent<FileViewerProps>(
  'editor',
  (mod) => mod.TextEditor as ComponentType<FileViewerProps> | undefined,
)

/** One parsed design-token pair (a CSS custom property or a key/value entry). */
export interface CodexTokenPair {
  readonly name: string
  readonly value: string
}

/**
 * The document extensions this viewer claims. `exts` is the only channel the
 * service consults on the extension-only first pass (see the module comment) —
 * a file-name predicate has no home there.
 */
const DESIGN_TOKEN_EXTS: readonly string[] = ['md', 'json', 'css', 'yaml', 'yml']

/** Above the built-in markdown/html (0) and the catch-all code viewer (-100). */
const DESIGN_TOKEN_PRIORITY = 20

/** Upper bound on one document's pairs, so a pathological file stays renderable. */
const PAIR_LIMIT = 400

/**
 * The file-name rule: `design` or `token(s)` in the base name of a document
 * whose extension is one of the token formats (case-insensitive).
 */
export function isDesignTokenPath(path: string): boolean {
  const base = baseName(path).toLowerCase()
  if (!/(?:design|tokens?)/.test(base)) return false
  return /\.(?:md|json|css|ya?ml)$/.test(base)
}

/**
 * The `viewerId` a delegated file must be rendered under, so the built-in
 * editor behaves exactly as it would have without this viewer. `TextEditor`
 * picks its preview/edit modes from this value (see its `markdown` / `html`
 * derivations), so passing our own id would silently downgrade a `.md` file to
 * a plain text editor.
 */
export function delegateViewerId(path: string): string {
  const ext = extOf(path)
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'html' || ext === 'htm') return 'html'
  return 'code'
}

/**
 * Whether this open is a design-token document worth the Codex board.
 *
 * The NAME rule decides first — that is what keeps a document that merely
 * DISCUSSES tokens (this repo's own guides quote `--dsw-*` snippets) out of the
 * board — and the content must then corroborate it, so a `design-notes.md` with
 * no tokens keeps its Markdown preview instead of showing an empty board.
 */
export function isTokenDocument(props: Pick<FileViewerProps, 'path' | 'content'>): boolean {
  if (!isDesignTokenPath(props.path)) return false
  return parseTokenPairs(props.content ?? '', props.path).length > 0
}

/** Bare color keywords worth painting (kept short — the palette uses hex/rgba). */
const NAMED_COLORS = /^(?:black|white|red|green|blue|gray|grey|silver|maroon|olive|lime|aqua|teal|navy|fuchsia|purple|orange|yellow|pink|brown|gold|cyan|magenta|transparent|currentcolor)$/i

/**
 * Whether a token value can be painted as a swatch. `transparent` counts: the
 * swatch then shows only its hairline, which is exactly what transparent means.
 */
export function isColorValue(value: string): boolean {
  const text = value.trim()
  if (text === '') return false
  if (text.startsWith('#')) return /^#[0-9a-f]{3,8}$/i.test(text)
  if (NAMED_COLORS.test(text)) return true
  return /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.test(text)
    || /^(?:linear|radial|conic)-gradient\(/i.test(text)
}

/** Strip a trailing `!important` from a CSS declaration value. */
function stripImportant(value: string): string {
  return value.replace(/!\s*important\s*$/i, '').trim()
}

/** Strip one layer of matching quotes, and a trailing comma (JSON-ish sweeps). */
function unquote(value: string): string {
  const text = value.trim().replace(/,$/, '').trim()
  const quoted = (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))
  return quoted ? text.slice(1, -1).trim() : text
}

/** Record one pair (first occurrence wins: the same token is often repeated). */
function put(out: Map<string, string>, name: string, raw: string): void {
  const key = name.trim()
  if (key === '' || out.size >= PAIR_LIMIT || out.has(key)) return
  out.set(key, raw.trim())
}

/** `--name: value` declarations (CSS files, and token listings in any document). */
const CSS_PROPERTY = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}\n]+)/g

function scanCssProperties(text: string, out: Map<string, string>): void {
  CSS_PROPERTY.lastIndex = 0
  for (let match = CSS_PROPERTY.exec(text); match !== null; match = CSS_PROPERTY.exec(text)) {
    const name = match[1]
    const value = match[2]
    if (name === undefined || value === undefined) continue
    put(out, name, stripImportant(value))
  }
}

/** Walk a parsed JSON value, naming nested entries with dotted paths. */
function walkJson(node: unknown, prefix: string, out: Map<string, string>, depth: number): void {
  if (out.size >= PAIR_LIMIT || depth > 4 || node === null) return
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    if (prefix !== '') put(out, prefix, String(node))
    return
  }
  if (Array.isArray(node) || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    walkJson(value, prefix === '' ? key : `${prefix}.${key}`, out, depth + 1)
  }
}

function scanJson(text: string, out: Map<string, string>): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return
  }
  walkJson(parsed, '', out, 0)
}

/**
 * `name: value` map lines whose value is a COLOR — the shape token documents
 * use in YAML and in the front matter of a design markdown. Values that are not
 * colors are skipped so prose keys never masquerade as tokens.
 */
const MAP_LINE = /^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*(.+?)\s*$/

function scanColorMap(text: string, out: Map<string, string>): void {
  for (const line of text.split(/\r?\n/)) {
    const match = MAP_LINE.exec(line)
    if (match === null) continue
    const name = match[1]
    const value = match[2]
    if (name === undefined || value === undefined) continue
    const cleaned = unquote(value)
    if (isColorValue(cleaned)) put(out, name, cleaned)
  }
}

/** Fenced code blocks (an unterminated fence runs to the end of the document). */
const FENCE = /```([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g

function scanFences(text: string, out: Map<string, string>): void {
  FENCE.lastIndex = 0
  for (let match = FENCE.exec(text); match !== null; match = FENCE.exec(text)) {
    const lang = (match[1] ?? '').toLowerCase()
    const body = match[2] ?? ''
    if (lang.startsWith('json')) {
      scanJson(body, out)
    } else {
      scanCssProperties(body, out)
      scanColorMap(body, out)
    }
  }
}

/** A leading `---` YAML block (the front matter of a design markdown). */
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/

/**
 * Parse the token pairs a document carries, by extension:
 *  - `.css`: `--name: value;` declarations;
 *  - `.json`: every primitive under its dotted path;
 *  - `.yaml`/`.yml`: `--name: value` declarations plus color-map lines;
 *  - anything else claimed (markdown): front matter + fenced blocks, plus the
 *    unambiguous `--name: value` form anywhere in the document.
 */
export function parseTokenPairs(text: string, path: string): CodexTokenPair[] {
  const out = new Map<string, string>()
  const ext = extOf(path)
  if (ext === 'json') {
    scanJson(text, out)
  } else if (ext === 'css') {
    scanCssProperties(text, out)
  } else if (ext === 'yaml' || ext === 'yml') {
    scanCssProperties(text, out)
    scanColorMap(text, out)
  } else {
    const front = FRONT_MATTER.exec(text)
    if (front?.[1] !== undefined) scanColorMap(front[1], out)
    scanFences(text, out)
    scanCssProperties(text, out)
  }
  return [...out].map(([name, value]) => ({ name, value }))
}

/**
 * The token board itself: a color swatch grid (each cell carrying its monospace
 * name and value) followed by a monospace name/value list for the remaining,
 * non-paintable tokens (font stacks, sizes, …).
 */
export function CodexTokenBoard({ path, title, content }: FileViewerProps): ReactNode {
  const text = content ?? ''
  const pairs = useMemo(() => parseTokenPairs(text, path), [text, path])
  const colors = useMemo(() => pairs.filter(pair => isColorValue(pair.value)), [pairs])
  const rest = useMemo(() => pairs.filter(pair => !isColorValue(pair.value)), [pairs])

  return (
    <div className={css.viewer}>
      <div className={css.viewerHead}>
        <span className={css.viewerTitle}>{t('codexViewerTitle')}</span>
        {pairs.length > 0 && <span className={css.viewerCount}>{pairs.length}</span>}
        <code className={css.viewerPath} title={path}>{title}</code>
      </div>
      <div className={css.viewerBody}>
        {pairs.length === 0
          ? (
            <>
              <div className={css.viewerEmpty}>{t('codexViewerEmpty')}</div>
              <pre className={css.viewerRaw}>{text}</pre>
            </>
          )
          : (
            <>
              {colors.length > 0 && (
                <div className={css.viewerGrid}>
                  {colors.map(pair => (
                    <div key={pair.name} className={css.viewerCell}>
                      <span className={css.viewerSwatch} aria-hidden="true" style={{ background: pair.value }} />
                      <code className={css.viewerName} title={pair.name}>{pair.name}</code>
                      <code className={css.viewerValue} title={pair.value}>{pair.value}</code>
                    </div>
                  ))}
                </div>
              )}
              {rest.length > 0 && (
                <div className={css.viewerList}>
                  {rest.map(pair => (
                    <div key={pair.name} className={css.viewerListRow}>
                      <code className={css.viewerName} title={pair.name}>{pair.name}</code>
                      <code className={css.viewerValue} title={pair.value}>{pair.value}</code>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
      </div>
    </div>
  )
}

/**
 * The Codex design-token viewer descriptor. A single viewer, matching the
 * design-token documents described in the module comment; anything else it
 * claims delegates back to the built-in viewer's behavior.
 */
export function codexViewers(): readonly FileViewerDescriptor[] {
  return [
    {
      id: 'codex-design:tokens',
      title: () => t('codexViewerTitle'),
      icon: (size: number) => <IconListPenOutline16 size={size} />,
      exts: DESIGN_TOKEN_EXTS,
      priority: DESIGN_TOKEN_PRIORITY,
      fetchStrategy: 'fsRead',
      // The file-name rule, consulted on the head-bearing (binary re-match)
      // paths — see the module comment for why it cannot be the only channel.
      detect: (path: string) => isDesignTokenPath(path),
      // Claim, then delegate: a design-token document renders the board, every
      // other claimed file renders exactly what the built-in viewer would have.
      component: (props) => (
        isTokenDocument(props)
          ? <CodexTokenBoard {...props} />
          : <LazyTextEditor {...props} viewerId={delegateViewerId(props.path)} />
      ),
    },
  ]
}
