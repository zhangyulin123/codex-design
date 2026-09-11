/**
 * Session-management data layer for the Codex surfaces (client half).
 *
 * The core UI offers no session management beyond the row menu's own actions:
 * archiving hides a session from every grouping surface with no way back, and
 * some builds ship a client whose `session.delete` remote is unwired. This
 * module is the single place the Codex session page / archived list read from
 * and write through, so both surfaces share one behavior:
 *
 *  - DELETION prefers the Harness's OWN `ctx.sessions.delete(id)` — the exact
 *    call the row menu's "删除会话" makes, so the Host performs the complete
 *    teardown (dispose the owned agent, drop persistence, unaccount the session
 *    from every workspace and the archive set). Only when that remote is
 *    unwired does it fall back to the plugin's own `codex.sessions.delete`
 *    route, which mirrors the same host-side teardown.
 *  - UNARCHIVE always goes through the plugin's own route: rc.1's workspace
 *    controller exposes `archiveSession` and no unarchive, and the archive set
 *    is host-durable. The response re-publishes the workspace feed, so the
 *    session reappears in its own workspace grouping without a reload.
 *  - The ARCHIVE list is read from the host (`codex.sessions.archived`) and
 *    cross-referenced with the client session feed for titles, dropping ids
 *    whose session no longer exists (a ghost left by an earlier partial delete)
 *    so the list never shows an undeletable row.
 */
import type { Context } from '../../context-types.ts'
import { api, SidebarApiError } from '../api.ts'

/** One session row of the Codex session page. */
export interface CodexSessionRow {
  id: string
  /** Display title (falls back to the id when the summary carries none). */
  title: string
  /** Whether the id sits in the durable archive set. */
  archived: boolean
  /** Whether this is the session the app currently has selected. */
  current: boolean
}

/** Read the client session store snapshot (undefined while unavailable). */
function snapshotOf(ctx: Context): {
  current?: string
  ids?: readonly string[]
  byId?: Record<string, { title?: string; displayTitle?: string }>
} | undefined {
  try {
    const sessions = ctx.get('sessions') as
      | { list?: { getSnapshot?: () => { current?: string; ids?: readonly string[]; byId?: Record<string, { title?: string; displayTitle?: string }> } } }
      | undefined
    return sessions?.list?.getSnapshot?.()
  } catch {
    return undefined
  }
}

/** The title the UI shows for one summary (mirrors the row's own display rule). */
function titleOf(summary: { title?: string; displayTitle?: string } | undefined): string | undefined {
  if (summary === undefined) return undefined
  return summary.displayTitle !== undefined ? summary.displayTitle : summary.title
}

/** Subscribe to the client session feed; returns a no-op disposer when absent. */
export function subscribeSessions(ctx: Context, listener: () => void): () => void {
  try {
    const sessions = ctx.get('sessions') as { list?: { subscribe?: (fn: () => void) => () => void } } | undefined
    const off = sessions?.list?.subscribe?.(listener)
    return typeof off === 'function' ? off : () => {}
  } catch {
    return () => {}
  }
}

/** Every listed session, title-resolved and archive-flagged (archived ids ride the archive set). */
export function listSessions(ctx: Context, archivedIds: readonly string[]): CodexSessionRow[] {
  const snapshot = snapshotOf(ctx)
  if (snapshot === undefined) return []
  const archived = new Set(archivedIds.map(String))
  const byId = snapshot.byId ?? {}
  const ids = snapshot.ids ?? Object.keys(byId)
  const rows: CodexSessionRow[] = []
  for (const id of ids) {
    const key = String(id)
    if (archived.has(key)) continue
    rows.push({
      id: key,
      title: titleOf(byId[key]) ?? key,
      archived: false,
      current: snapshot.current === key,
    })
  }
  return rows
}

/**
 * The archived rows: the durable archive set cross-referenced with the session
 * feed. Ids whose session is gone are dropped (they are undeletable ghosts).
 */
export function listArchivedSessions(ctx: Context, archivedIds: readonly string[]): CodexSessionRow[] {
  const snapshot = snapshotOf(ctx)
  const byId = snapshot?.byId ?? {}
  return archivedIds
    .map(String)
    .filter(id => snapshot === undefined || byId[id] !== undefined)
    .map(id => ({
      id,
      title: titleOf(byId[id]) ?? id,
      archived: true,
      current: snapshot?.current === id,
    }))
}

/** Read the host-authoritative archive set. */
export async function fetchArchivedIds(): Promise<{ available: boolean; ids: string[] }> {
  try {
    const result = await api.codexSessionsArchived()
    return { available: result.available, ids: result.ids }
  } catch {
    return { available: false, ids: [] }
  }
}

/**
 * Whether the native session-delete remote is actually wired in this build.
 * Some builds ship a client whose `sessions.delete` reaches an unwired
 * `session.delete` remote ("this.remote.session.delete is not a function").
 */
function nativeDeleteOf(ctx: Context): ((id: string) => Promise<unknown>) | undefined {
  try {
    const sessions = ctx.get('sessions') as { delete?: (id: string) => Promise<unknown> } | undefined
    const fn = sessions?.delete
    return typeof fn === 'function' ? fn.bind(sessions) : undefined
  } catch {
    return undefined
  }
}

/**
 * Delete one session permanently, preferring the Harness's own API and falling
 * back to the plugin's mirror route.
 * @throws the underlying failure when both paths fail.
 */
export async function deleteSession(ctx: Context, id: string): Promise<void> {
  const native = nativeDeleteOf(ctx)
  let nativeError: unknown
  if (native !== undefined) {
    try {
      await native(id)
      return
    } catch (error) {
      nativeError = error
    }
  }
  try {
    await api.codexSessionsDelete(id)
    return
  } catch (error) {
    if (error instanceof SidebarApiError) throw error
    throw nativeError ?? error
  }
}

/** Restore one archived session through the plugin's host route. */
export async function unarchiveSession(id: string): Promise<boolean> {
  const result = await api.codexSessionsUnarchive(id)
  return result.unarchived
}
