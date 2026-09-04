/**
 * codex-design — host (server) half.
 *
 * Registers a same-origin durable-state route (/codex-design/state). The
 * browser client GETs (read) and PUTs (write) this route to persist whether the
 * Codex theme is active. The state is a tiny JSON file under the DSH home, so
 * it survives DSH Desktop's random per-launch loopback port — browser
 * localStorage is origin-scoped (including the port) and always starts empty.
 *
 * This mirrors dsh-catppuccin's durable-state route.
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'codex-design'
export const inject = ['webServer']

const STATE_FILENAME = 'codex-design-state.json'
export const STATE_ROUTE_PATH = '/codex-design/state'
// Same-origin DELETE endpoint that permanently removes one session's persisted
// log directory (the authoritative conversation data). The profile keeps no
// "delete session" RPC, so this deletes the on-disk JSONL artifact directly.
export const SESSION_ROUTE_PATH = '/codex-design/session'
// Same-origin POST endpoint that restores (unarchives) one session so it
// reappears in every grouping surface. Core exposes only archiveSession, so this
// removes the id from the workspace registry's durable archive set directly.
export const UNARCHIVE_ROUTE_PATH = '/codex-design/session/unarchive'

function defaultDshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function stateFilePath(home = defaultDshHome()) {
  return join(home, STATE_FILENAME)
}

function readDurableState(home = defaultDshHome()) {
  try {
    const parsed = JSON.parse(readFileSync(stateFilePath(home), 'utf8'))
    return { active: Boolean(parsed.active) }
  } catch {
    return null
  }
}

function writeDurableState(state, home = defaultDshHome()) {
  const path = stateFilePath(home)
  const parent = dirname(path)
  mkdirSync(parent, { recursive: true })
  let mode = 0o600
  try {
    mode = statSync(path).mode & 0o777
  } catch {
    // target does not exist yet -> keep the default mode
  }
  const content = `${JSON.stringify({ active: Boolean(state && state.active) }, null, 2)}\n`
  const tempDir = mkdtempSync(join(parent, `${basename(path)}.tmp-`))
  const temporary = join(tempDir, basename(path))
  try {
    writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' })
    renameSync(temporary, path)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
  if (readFileSync(path, 'utf8') !== content) {
    throw new Error(`codex-design state: write verification failed: ${path}`)
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function handleGet(_req, res) {
  try {
    sendJson(res, 200, { ok: true, state: readDurableState() })
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

async function handlePut(req, res) {
  let raw
  try {
    raw = await readRequestBody(req)
  } catch {
    sendJson(res, 400, { ok: false, error: 'body-read' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid-json' })
    return
  }
  try {
    writeDurableState(parsed)
    sendJson(res, 200, { ok: true })
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

// Resolve the session persistence backend that stores the per-session JSONL log
// directories. It is registered as `ctx.sessionPersistence` by the JSONL backend
// and exposes `root / list() / locate(meta)`.
function sessionPersistence(ctx) {
  let sp
  try {
    sp = ctx.get('sessionPersistence')
  } catch {
    return null
  }
  return sp && typeof sp.list === 'function' && typeof sp.locate === 'function' ? sp : null
}

// DELETE /codex-design/session?id=<sessionId>
// Permanently deletes the session's on-disk artifact directory. Returns
// { ok } so the client can reload and drop the row from the sidebar.
async function handleSessionDelete(ctx, req, res, url) {
  const id = url.searchParams.get('id')
  if (!id) {
    sendJson(res, 400, { ok: false, error: 'missing-id' })
    return
  }
  const sp = sessionPersistence(ctx)
  if (!sp) {
    sendJson(res, 503, { ok: false, error: 'session-persistence-unavailable' })
    return
  }
  let deleted = false
  try {
    const headers = await sp.list()
    const meta = (headers || []).find((h) => String(h.id) === String(id))
    if (meta) {
      const located = sp.locate({ id: meta.id, cwd: meta.cwd })
      if (!located || !located.path) {
        sendJson(res, 200, { ok: false, error: 'cannot-resolve-session-path' })
        return
      }
      // The log path is <root>/<projectKey>/<encodedId>/session.jsonl.zstd; the
      // directory that owns it is the whole per-session artifact. Remove it all.
      const sessionDir = dirname(located.path)
      rmSync(sessionDir, { recursive: true, force: true })
      deleted = true
    } else {
      // list() can skip a session (blank/header-only log, or a partially torn one),
      // but the session directory may still occupy disk. Fall back to a direct
      // filesystem scan for a directory whose leaf name is the session id.
      const byScan = findSessionDirByScan(sp.root, String(id))
      if (byScan) {
        rmSync(byScan, { recursive: true, force: true })
        deleted = true
      }
    }
    // A session is referenced in MORE places than its log. To make it truly
    // disappear (not a ghost that keeps showing in the sidebar), clean every one:
    //  1. drop it from the persistence coordinator's in-memory bookkeeping (so it
    //     does NOT re-materialize the log on the next flush — the session stays
    //     "alive" otherwise even though its file is gone)
    //  2. unaccount it from every workspace's sessionIds (durable, emits changes)
    //  3. drop it from the archive set
    //  4. delete its projection-cache summary file (the cached summary is what the
    //     session list reads, so it survives log deletion otherwise)
    // Each is idempotent and best-effort; the raw-log delete above is the primary.
    try {
      purgePersistenceState(sp, String(id), ctx)
    } catch {
      /* ignore */
    }
    try {
      await unaccountSessionFromWorkspaces(ctx, String(id))
    } catch {
      /* ignore */
    }
    try {
      await removeSessionFromArchive(ctx, String(id))
    } catch {
      /* ignore */
    }
    try {
      removeProjectionCache(sp, String(id))
    } catch {
      /* ignore */
    }
    sendJson(res, 200, { ok: true, deletedId: String(id), deleted })
  } catch (error) {
    // Windows may refuse to delete an open/in-use log (EBUSY/EPERM); surface it.
    sendJson(res, 200, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// Remove one session id from the workspace registry's durable archive set.
// setState persists through the domain global and emits domain/changed, so the
// workspace feed publishes the `archived` increment and the client's grouping
// surfaces update without a reload. Best-effort: a missing registry is a no-op.
async function removeSessionFromArchive(ctx, id) {
  const registry = ctx.get('workspaceRegistry')
  if (!registry || typeof registry.requireState !== 'function') return
  const state = registry.requireState()
  if (!state.archivedSessionIds.some((x) => String(x) === String(id))) return
  await registry.setState({
    ...state,
    archivedSessionIds: state.archivedSessionIds.filter((x) => String(x) !== String(id))
  })
}

// Remove one session id from every workspace's sessionIds account so it no longer
// appears under any project group. Uses the durable Workspace.detachSession path
// (table.update + domain/changed), so the sidebar updates without a reload.
// Idempotent: a workspace that does not account the id is a no-op.
async function unaccountSessionFromWorkspaces(ctx, id) {
  const registry = ctx.get('workspaceRegistry')
  if (!registry || typeof registry.list !== 'function') return
  for (const workspace of registry.list()) {
    try {
      await workspace.detachSession(id)
    } catch {
      /* per-workspace best-effort */
    }
  }
}

// Locate a session directory by filesystem scan: the id leaf name may sit under
// any project directory <root>/<projectKey>/<id>. Returns the absolute path or
// undefined. Used as a fallback when `list()` cannot surface the session.
function findSessionDirByScan(root, id) {
  if (!root) return undefined
  for (const proj of readdirSync(root, { withFileTypes: true })) {
    if (!proj.isDirectory()) continue
    const projPath = join(root, proj.name)
    let entries
    try {
      entries = readdirSync(projPath, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name === id) return join(projPath, entry.name)
    }
  }
  return undefined
}

// Drop a session from the persistence coordinator's in-memory bookkeeping so it
// does not re-materialize a log that was just deleted. `sp` is the JSONL backend
// instance; its `coordinator` holds `states` (keyed by id) and `live` (keyed by
// live Session). Best-effort and idempotent.
function purgePersistenceState(sp, id, ctx) {
  const coord = sp?.coordinator ?? sp?.backend
  if (!coord) return
  try {
    coord.states?.delete(id)
  } catch {
    /* ignore */
  }
  let session
  try {
    session = ctx.get('sessions')?.get?.(id)
  } catch {
    session = undefined
  }
  if (session) {
    try {
      coord.live?.delete(session)
    } catch {
      /* ignore */
    }
  }
  // Drop it from the live session store map so the session list stops emitting it.
  try {
    ctx.get('sessions')?.store?.delete(id)
  } catch {
    /* ignore */
  }
  try {
    coord.preparations?.invalidate?.(id)
  } catch {
    /* ignore */
  }
}

// Delete the session's entry from the session projection cache. The cached
// summary is what the session list reads, so without this the session survives
// log deletion as a ghost ("can still be archived, cannot be deleted"). Try the
// candidates `dirname(sp.root)` (the harness home), $DSH_HOME, and ~/.dsh —
// whichever actually has the cache directory.
function removeProjectionCache(sp, id) {
  const candidates = []
  if (sp && sp.root) candidates.push(dirname(sp.root))
  candidates.push(process.env.DSH_HOME)
  candidates.push(join(homedir(), '.dsh'))
  for (const home of candidates) {
    if (!home) continue
    const cacheFile = join(home, 'storages', 'session_projcache', 'sessions', `${id}.json`)
    try {
      rmSync(cacheFile, { force: true })
    } catch {
      /* ignore */
    }
  }
}

// POST /codex-design/session/unarchive  body: { id }
// Removes one session id from the workspace registry's durable archive set so it
// reappears in every grouping surface.
async function handleSessionUnarchive(ctx, req, res) {
  const raw = await readRequestBody(req)
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid-json' })
    return
  }
  const id = parsed?.id
  if (!id) {
    sendJson(res, 400, { ok: false, error: 'missing-id' })
    return
  }
  try {
    await removeSessionFromArchive(ctx, id)
    sendJson(res, 200, { ok: true, unarchivedId: String(id) })
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  ctx.effect(
    () =>
      webServer.register({
        kind: 'exact',
        path: STATE_ROUTE_PATH,
        handler: async (req, res) => {
          if (req.method === 'PUT') await handlePut(req, res)
          else handleGet(req, res)
        }
      }),
    'codex-design: durable-state route'
  )
  ctx.effect(
    () =>
      webServer.register({
        kind: 'exact',
        path: UNARCHIVE_ROUTE_PATH,
        handler: async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }
          await handleSessionUnarchive(ctx, req, res)
        }
      }),
    'codex-design: unarchive-session route'
  )
  ctx.effect(
    () =>
      webServer.register({
        kind: 'exact',
        path: SESSION_ROUTE_PATH,
        handler: async (req, res) => {
          if (req.method !== 'DELETE') {
            sendJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }
          const url = new URL(req.url, 'http://localhost')
          await handleSessionDelete(ctx, req, res, url)
        }
      }),
    'codex-design: delete-session route'
  )
}
