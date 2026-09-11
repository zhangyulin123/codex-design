/**
 * codex-design — host (server) half.
 *
 * Registers two same-origin routes:
 *  - /codex-design/state              durable "codex theme active" flag (GET/PUT):
 *                                     a tiny JSON file under the DSH home, so it
 *                                     survives DSH Desktop's random per-launch
 *                                     loopback port (browser localStorage is
 *                                     origin-scoped, port included, and empty on
 *                                     every launch).
 *  - /codex-design/session/unarchive  removes one session from the workspace
 *                                     registry's durable archive set — the
 *                                     profile ships no unarchive UI.
 *
 * Session DELETION is deliberately NOT implemented here. Current Harness builds
 * own it end to end (the row menu's "删除会话" and `ctx.sessions.delete()`): the
 * Host disposes owned agents, drops persistence and unaccounts the session from
 * every workspace and the archive set. The browser half only shortcuts to that
 * native API, so no file surgery and no ghost sessions exist here.
 */
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'codex-design'
export const inject = ['webServer']

const STATE_FILENAME = 'codex-design-state.json'
export const STATE_ROUTE_PATH = '/codex-design/state'
// Same-origin POST endpoint that restores (unarchives) one session so it
// reappears in every grouping surface. Core exposes only archiveSession and no
// unarchive UI, so this removes the id from the registry's archive set directly.
export const UNARCHIVE_ROUTE_PATH = '/codex-design/session/unarchive'
// FALLBACK delete endpoint. The browser prefers the Harness's native
// `ctx.sessions.delete()`, but some builds ship a client whose session-delete
// remote is not wired ("remote.session.delete is not a function"), so this
// mirrors the exact same host-side teardown — persistence delete + registry
// forgetSession — rather than touching files by hand.
export const SESSION_ROUTE_PATH = '/codex-design/session'

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

// Drop the session's summary from the session projection cache. The cached
// summary is what the session list reads, so a stale one can keep a deleted
// session visible. Best-effort across the candidate harness homes.
function removeProjectionCache(sp, id) {
  const candidates = []
  if (sp && sp.root) candidates.push(dirname(sp.root))
  candidates.push(process.env.DSH_HOME)
  candidates.push(join(homedir(), '.dsh'))
  for (const home of candidates) {
    if (!home) continue
    try {
      rmSync(join(home, 'storages', 'session_projcache', 'sessions', `${id}.json`), { force: true })
    } catch {
      /* ignore */
    }
  }
}

// DELETE /codex-design/session?id=<sessionId>
// Fallback session deletion: the SAME teardown the Harness's native delete
// performs (drop persistence, unaccount from every workspace and the archive
// set), not a hand-rolled file surgery. Returns { ok } for the browser.
async function handleSessionDelete(ctx, req, res, url) {
  const id = url.searchParams.get('id')
  if (!id) {
    sendJson(res, 400, { ok: false, error: 'missing-id' })
    return
  }
  try {
    const sp = ctx.get('sessionPersistence')
    const registry = ctx.get('workspaceRegistry')
    let deleted = false
    if (sp && typeof sp.delete === 'function') deleted = Boolean(await sp.delete(String(id)))
    if (registry && typeof registry.forgetSession === 'function') {
      await registry.forgetSession(String(id))
    }
    removeProjectionCache(sp, String(id))
    sendJson(res, 200, { ok: true, deletedId: String(id), deleted })
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
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
        path: SESSION_ROUTE_PATH,
        handler: async (req, res) => {
          if (req.method !== 'DELETE') {
            sendJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }
          await handleSessionDelete(ctx, req, res, new URL(req.url, 'http://localhost'))
        }
      }),
    'codex-design: session-delete fallback route'
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
}
