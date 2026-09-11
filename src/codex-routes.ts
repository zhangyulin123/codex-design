/**
 * Codex feature host half.
 *
 * The merged codex-design plugin keeps three host-side capabilities that the
 * sidebar's own API does not cover, all reached through the same fenced
 * `/sidebar/api/*` route family as every other method:
 *
 *  - `codex.state.get` / `codex.state.set` — the durable "Codex theme is
 *    active" flag. It lives in a tiny JSON file under the DSH home because
 *    DSH Desktop serves the client from a random per-launch loopback port:
 *    browser localStorage is origin-scoped (port included), so it is empty on
 *    every launch and cannot carry a theme preference across restarts.
 *  - `codex.sessions.unarchive` — archive is one-way in the core UI (an
 *    archived session disappears from every grouping surface and no surface
 *    offers a restore). This removes one id from the workspace registry's
 *    durable archive set, which re-publishes the workspace feed so the session
 *    reappears without a reload.
 *  - `codex.sessions.delete` — a FALLBACK session teardown. The Codex session
 *    surfaces prefer the Harness's own `ctx.sessions.delete()`; some builds
 *    ship a client whose `session.delete` remote is not wired
 *    ("remote.session.delete is not a function"), so this mirrors the same
 *    host-side teardown (dispose the owned agent first, then drop persistence
 *    and unaccount the session from every workspace) instead of touching
 *    files by hand.
 *
 * Nothing here writes to the DSH source checkout: the only file this module
 * owns is `$DSH_HOME/codex-design-state.json`, plus the best-effort removal of
 * a stale session projection cache entry after a fallback delete.
 */
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from './context-types.ts'
import { requireString, SidebarError } from './wire.ts'

/** Durable-state file name under the DSH home (unchanged since the standalone codex-design plugin). */
export const CODEX_STATE_FILENAME = 'codex-design-state.json'

/** The persisted Codex-theme intent. */
export interface CodexDurableState {
  /** Whether the Codex theme should be re-applied on the next launch. */
  active: boolean
}

/** The DSH home directory (honours DSH_HOME, else ~/.dsh). */
function defaultDshHome(): string {
  return process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh')
}

/** Absolute path of the durable Codex-theme state file. */
export function codexStatePath(home: string = defaultDshHome()): string {
  return join(home, CODEX_STATE_FILENAME)
}

/**
 * Read the persisted intent, or `null` when no state file exists yet (a fresh
 * install — the client then keeps its localStorage signal as the tie-breaker).
 * A malformed file reads as `null` rather than throwing: a corrupt preference
 * must never block the boot.
 */
export function readCodexDurableState(home: string = defaultDshHome()): CodexDurableState | null {
  try {
    const parsed = JSON.parse(readFileSync(codexStatePath(home), 'utf8')) as { active?: unknown }
    return { active: parsed.active === true }
  } catch {
    return null
  }
}

/**
 * Persist the intent atomically: write into a private temp directory on the
 * same filesystem, fsync-by-rename it over the target, then verify the bytes
 * actually landed. A torn write here would silently flip the user's theme, so
 * the verification failure is surfaced instead of swallowed.
 */
export function writeCodexDurableState(state: CodexDurableState, home: string = defaultDshHome()): void {
  const path = codexStatePath(home)
  const parent = dirname(path)
  mkdirSync(parent, { recursive: true })
  let mode = 0o600
  try {
    mode = statSync(path).mode & 0o777
  } catch {
    // Target does not exist yet: keep the private default mode.
  }
  const content = `${JSON.stringify({ active: state.active === true }, null, 2)}\n`
  const tempDir = mkdtempSync(join(parent, `${basename(path)}.tmp-`))
  const temporary = join(tempDir, basename(path))
  try {
    writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx', mode })
    renameSync(temporary, path)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
  if (readFileSync(path, 'utf8') !== content) {
    throw new SidebarError('fs-error', `codex state: write verification failed: ${path}`, 500)
  }
}

/** The workspace-registry face this module needs (durable archive set). */
interface WorkspaceRegistryFace {
  requireState(): { archivedSessionIds: readonly unknown[] }
  setState(state: Record<string, unknown>): Promise<void> | void
}

/** The session-controller face this module needs (the native delete path). */
interface SessionControllerFace {
  delete(request: { sessionId: string }): Promise<unknown>
}

/** The live-agent registry face this module needs (fallback teardown). */
interface AgentsFace {
  disposeOwned?(sessionId: string): Promise<void> | void
  get?(sessionId: string): unknown
}

/** The session-persistence face this module needs (fallback teardown). */
interface SessionPersistenceFace {
  delete?(sessionId: string): Promise<unknown> | unknown
}

/** The session-store face this module needs (fallback teardown liveness check). */
interface SessionStoreFace {
  get?(sessionId: string): unknown
}

/** The workspace registry, tolerant of hosts that do not provide one. */
function workspaceRegistryOf(ctx: Context): WorkspaceRegistryFace | undefined {
  const registry = ctx.get('workspaceRegistry') as WorkspaceRegistryFace | undefined
  return registry !== undefined && typeof registry.requireState === 'function' ? registry : undefined
}

/**
 * Remove one session id from the workspace registry's durable archive set.
 * `setState` persists through the domain global and emits `domain/changed`, so
 * the workspace feed publishes the `archived` increment and every grouping
 * surface updates without a reload. Best-effort: a missing registry is a no-op.
 * @returns whether the id was actually present (i.e. the archive set changed).
 */
async function removeSessionFromArchive(ctx: Context, id: string): Promise<boolean> {
  const registry = workspaceRegistryOf(ctx)
  if (registry === undefined) return false
  const state = registry.requireState()
  const archived = state.archivedSessionIds
  if (!archived.some(entry => String(entry) === id)) return false
  await registry.setState({
    ...(state as unknown as Record<string, unknown>),
    archivedSessionIds: archived.filter(entry => String(entry) !== id),
  })
  return true
}

/**
 * Drop the session's summary from the projection cache. The cached summary is
 * what the session list reads, so a stale one can keep a deleted session
 * visible. Best-effort across the candidate harness homes, and only reached
 * from the fallback delete path (the native controller already re-projects).
 */
function removeProjectionCache(sp: SessionPersistenceFace | undefined, id: string): void {
  const candidates: string[] = []
  const root = (sp as { root?: unknown } | undefined)?.root
  if (typeof root === 'string' && root !== '') candidates.push(dirname(root))
  if (process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== '') candidates.push(process.env.DSH_HOME)
  candidates.push(join(homedir(), '.dsh'))
  for (const home of candidates) {
    try {
      rmSync(join(home, 'storages', 'session_projcache', 'sessions', `${id}.json`), { force: true })
    } catch {
      // Best-effort only: a locked or absent cache entry must not fail the delete.
    }
  }
}

/**
 * Delete one session, preferring the Host's OWN session-controller command —
 * literally the code the client's `session.delete` remote would run — so an
 * owned/live agent is disposed FIRST (a live session otherwise refuses
 * deletion), persistence is dropped, and the session is unaccounted from every
 * workspace and the archive set. Only when that service is absent does this
 * mirror the teardown by hand.
 * @returns whether a durable deletion happened (false = the session was live).
 */
async function deleteSession(ctx: Context, sessionId: string): Promise<{ deleted: boolean }> {
  const controller = ctx.get('sessionController') as SessionControllerFace | undefined
  if (controller !== undefined && typeof controller.delete === 'function') {
    await controller.delete({ sessionId })
    removeProjectionCache(ctx.get('sessionPersistence') as SessionPersistenceFace | undefined, sessionId)
    return { deleted: true }
  }
  // Mirror the same teardown when the controller service is unavailable: dispose
  // the owned agent first, then drop persistence and unaccount the session.
  const sp = ctx.get('sessionPersistence') as SessionPersistenceFace | undefined
  const agents = ctx.get('agents') as AgentsFace | undefined
  if (agents !== undefined && typeof agents.disposeOwned === 'function') {
    await agents.disposeOwned(sessionId)
  }
  const liveInAgents = agents !== undefined && typeof agents.get === 'function' && agents.get(sessionId) !== undefined
  const store = ctx.get('sessions') as SessionStoreFace | undefined
  const liveInStore = store !== undefined && typeof store.get === 'function' && store.get(sessionId) !== undefined
  if (liveInAgents || liveInStore) {
    throw new SidebarError('method-error', '该会话仍在运行，请先停止它再删除')
  }
  let deleted = false
  if (sp !== undefined && typeof sp.delete === 'function') {
    deleted = Boolean(await sp.delete(sessionId))
  }
  const registry = ctx.get('workspaceRegistry') as
    | (WorkspaceRegistryFace & { forgetSession?(sessionId: string): Promise<void> | void })
    | undefined
  if (registry !== undefined && typeof registry.forgetSession === 'function') {
    await registry.forgetSession(sessionId)
  }
  removeProjectionCache(sp, sessionId)
  return { deleted }
}

/**
 * One API method of the Codex feature set (mirror of the host's own ApiMethod
 * shape — kept local so this module does not depend on the route dispatcher).
 */
type CodexApiMethod = (payload: unknown) => Promise<unknown> | unknown

/**
 * Options of {@link buildCodexApi}.
 */
export interface CodexApiOptions {
  /**
   * DSH home holding the durable theme file. Defaults to `$DSH_HOME` /
   * `~/.dsh`; tests pin it to a temp directory so they never touch the real
   * user home.
   */
  stateHome?: string
}

/**
 * Build the Codex API method table, merged into the plugin's `/sidebar/api`
 * dispatcher (see `buildApi` in src/index.ts). Payload shapes mirror the
 * client wrappers in src/client/api.ts.
 */
export function buildCodexApi(ctx: Context, options: CodexApiOptions = {}): Record<string, CodexApiMethod> {
  const home = options.stateHome
  return {
    // Read the persisted theme intent. `available: false` means the host half
    // is not answering (the client keeps polling), which is distinct from
    // "known and currently off" (`active: false`).
    'codex.state.get': () => {
      const state = home === undefined ? readCodexDurableState() : readCodexDurableState(home)
      return { available: true, active: state === null ? null : state.active }
    },
    // Persist the theme intent (survives restarts and port churn).
    'codex.state.set': (payload) => {
      const record = payload as { active?: unknown } | null
      if (typeof record?.active !== 'boolean') {
        throw new SidebarError('bad-request', 'missing or invalid "active"')
      }
      if (home === undefined) writeCodexDurableState({ active: record.active })
      else writeCodexDurableState({ active: record.active }, home)
      return { active: record.active }
    },
    // The durable archive set, read straight from the workspace registry. The
    // client mirrors it for the Codex session surfaces: rc.1's workspace
    // controller exposes `archiveSession` but no unarchive, and the projection
    // reaches the browser through the remote feed rather than a client
    // service, so the host answers this one directly.
    'codex.sessions.archived': () => {
      const registry = workspaceRegistryOf(ctx)
      if (registry === undefined) return { available: false, ids: [] as string[] }
      const state = registry.requireState()
      return { available: true, ids: state.archivedSessionIds.map(entry => String(entry)) }
    },
    // Restore one archived session (the core UI offers no unarchive surface).
    'codex.sessions.unarchive': async (payload) => {
      const sessionId = requireString(payload, 'sessionId')
      return { unarchived: await removeSessionFromArchive(ctx, sessionId) }
    },
    // Fallback session teardown (see deleteSession). The primary path is the
    // Harness's own ctx.sessions.delete() on the client.
    'codex.sessions.delete': async (payload) => {
      const sessionId = requireString(payload, 'sessionId')
      return deleteSession(ctx, sessionId)
    },
  }
}
