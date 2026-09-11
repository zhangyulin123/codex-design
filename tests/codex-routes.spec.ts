/**
 * Host route tests for the Codex feature API:
 *  - 'codex.state.get' / 'codex.state.set' — the durable theme intent file
 *    (the client's restart-surviving record, kept out of localStorage because
 *    DSH Desktop serves the client from a random per-launch port),
 *  - 'codex.sessions.archived' / 'codex.sessions.unarchive' — the workspace
 *    registry's durable archive set (rc.1 has no unarchive surface, so this is
 *    the only restore path),
 *  - 'codex.sessions.delete' — the FALLBACK teardown, preferred only when the
 *    Host's own session controller is absent, and refusing to delete a session
 *    whose agent is still live.
 *
 * Every state path is pinned to a temp directory: these tests must never touch
 * the developer's real `~/.dsh`.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildCodexApi, CODEX_STATE_FILENAME, codexStatePath, readCodexDurableState, writeCodexDurableState } from '../src/codex-routes.ts'
import { SidebarError } from '../src/wire.ts'
import type { Context } from '../src/context-types.ts'

const temps: string[] = []

/** A disposable home directory for the durable state file. */
function tempHome(): string {
  const dir = mkdtempSync(join(tmpdir(), 'codex-routes-'))
  temps.push(dir)
  return dir
}

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop()!
    rmSync(dir, { recursive: true, force: true })
  }
  delete process.env.DSH_HOME
})

/** A context whose `get` serves only the faces the given keys name. */
function ctxWith(faces: Record<string, unknown>): Context {
  return {
    get: (key: string) => faces[key],
  } as unknown as Context
}

/** A workspace-registry double over one mutable archive set. */
function registryDouble(initial: string[]): {
  face: { requireState: () => { archivedSessionIds: string[] }; setState: (state: Record<string, unknown>) => Promise<void>; forgetSession: (id: string) => Promise<void> }
  archived: () => string[]
  forgot: string[]
} {
  let state = { archivedSessionIds: [...initial], workspaceIds: [] as string[] }
  const forgot: string[] = []
  return {
    face: {
      requireState: () => state,
      setState: async (next) => {
        state = next as typeof state
      },
      forgetSession: async (id: string) => {
        forgot.push(id)
      },
    },
    archived: () => state.archivedSessionIds,
    forgot,
  }
}

describe('codex.state.get / codex.state.set', () => {
  it('reports a fresh install as available-but-unknown (no state file yet)', async () => {
    const home = tempHome()
    const api = buildCodexApi(ctxWith({}), { stateHome: home })
    // `codex.state.get` is a SYNCHRONOUS handler: the /sidebar/api dispatcher
    // awaits whatever a handler returns (`writeOk(res, await handler(...))`), so
    // reads return their value directly and only the async handlers are promises.
    expect(api['codex.state.get']!({})).toEqual({ available: true, active: null })
  })

  it('round-trips the intent through the durable file', async () => {
    const home = tempHome()
    const api = buildCodexApi(ctxWith({}), { stateHome: home })

    // Both are synchronous handlers (see the note above).
    expect(api['codex.state.set']!({ active: true })).toEqual({ active: true })
    expect(api['codex.state.get']!({})).toEqual({ available: true, active: true })

    const file = codexStatePath(home)
    expect(existsSync(file)).toBe(true)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ active: true })

    api['codex.state.set']!({ active: false })
    expect(api['codex.state.get']!({})).toEqual({ available: true, active: false })
  })

  it('rejects a missing or non-boolean "active" with bad-request', () => {
    const api = buildCodexApi(ctxWith({}), { stateHome: tempHome() })
    expect(() => api['codex.state.set']!({})).toThrow(SidebarError)
    expect(() => api['codex.state.set']!({ active: 'yes' })).toThrow(/active/)
  })

  it('reads a malformed state file as "unknown" instead of throwing', () => {
    const home = tempHome()
    writeFileSync(codexStatePath(home), '{ not json', 'utf8')
    expect(readCodexDurableState(home)).toBeNull()
  })

  it('writes atomically and leaves no temp directories behind', () => {
    const home = tempHome()
    writeCodexDurableState({ active: true }, home)
    writeCodexDurableState({ active: false }, home)
    expect(readCodexDurableState(home)).toEqual({ active: false })
    // The temp dir is created beside the target and removed in `finally`.
    expect(existsSync(join(home, `${CODEX_STATE_FILENAME}.tmp-`))).toBe(false)
    expect(readFileSync(codexStatePath(home), 'utf8').endsWith('\n')).toBe(true)
  })
})

describe('codex.sessions.archived / codex.sessions.unarchive', () => {
  it('reads the archive set from the workspace registry', async () => {
    const registry = registryDouble(['a', 'b'])
    const api = buildCodexApi(ctxWith({ workspaceRegistry: registry.face }), { stateHome: tempHome() })
    expect(api['codex.sessions.archived']!({})).toEqual({ available: true, ids: ['a', 'b'] })
  })

  it('degrades to an empty unavailable list without a registry', async () => {
    const api = buildCodexApi(ctxWith({}), { stateHome: tempHome() })
    expect(api['codex.sessions.archived']!({})).toEqual({ available: false, ids: [] })
  })

  it('removes exactly one id from the archive set (restore)', async () => {
    const registry = registryDouble(['a', 'b'])
    const api = buildCodexApi(ctxWith({ workspaceRegistry: registry.face }), { stateHome: tempHome() })

    await expect(api['codex.sessions.unarchive']!({ sessionId: 'a' })).resolves.toEqual({ unarchived: true })
    expect(registry.archived()).toEqual(['b'])
    // A session that was never archived is a no-op, not an error.
    await expect(api['codex.sessions.unarchive']!({ sessionId: 'zzz' })).resolves.toEqual({ unarchived: false })
    // async handler: a rejected promise, not a synchronous throw.
    await expect(api['codex.sessions.unarchive']!({})).rejects.toThrow(/sessionId/)
  })
})

describe('codex.sessions.delete (fallback teardown)', () => {
  it('prefers the host session controller and reports the deletion', async () => {
    const deleted: string[] = []
    const registry = registryDouble([])
    const api = buildCodexApi(
      ctxWith({
        sessionController: { delete: async ({ sessionId }: { sessionId: string }) => { deleted.push(sessionId) } },
        sessionPersistence: { root: join(tempHome(), 'persist') },
        workspaceRegistry: registry.face,
      }),
      { stateHome: tempHome() },
    )

    await expect(api['codex.sessions.delete']!({ sessionId: 's1' })).resolves.toEqual({ deleted: true })
    expect(deleted).toEqual(['s1'])
    // The native path owns the teardown; the mirror must not run.
    expect(registry.forgot).toEqual([])
  })

  it('mirrors the teardown when the controller is absent: dispose, drop persistence, unaccount', async () => {
    const home = tempHome()
    process.env.DSH_HOME = home
    // A stale projection cache entry must be dropped so the deleted session
    // cannot stay visible in the list.
    const cacheDir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(join(cacheDir, 's2.json'), '{}', 'utf8')

    const disposed: string[] = []
    const persisted: string[] = []
    const registry = registryDouble([])
    const api = buildCodexApi(
      ctxWith({
        agents: { disposeOwned: async (id: string) => { disposed.push(id) }, get: () => undefined },
        sessions: { get: () => undefined },
        sessionPersistence: { delete: async (id: string) => { persisted.push(id); return true }, root: join(home, 'root') },
        workspaceRegistry: registry.face,
      }),
      { stateHome: tempHome() },
    )

    await expect(api['codex.sessions.delete']!({ sessionId: 's2' })).resolves.toEqual({ deleted: true })
    expect(disposed).toEqual(['s2'])
    expect(persisted).toEqual(['s2'])
    expect(registry.forgot).toEqual(['s2'])
    expect(existsSync(join(cacheDir, 's2.json'))).toBe(false)
  })

  it('refuses to delete a session while its agent is still live', async () => {
    const api = buildCodexApi(
      ctxWith({
        agents: { disposeOwned: async () => {}, get: () => ({ id: 's3' }) },
        sessions: { get: () => undefined },
        sessionPersistence: { delete: async () => true },
      }),
      { stateHome: tempHome() },
    )
    await expect(api['codex.sessions.delete']!({ sessionId: 's3' })).rejects.toThrow(/仍在运行/)
  })

  it('requires a session id', async () => {
    const api = buildCodexApi(ctxWith({}), { stateHome: tempHome() })
    // async handler: a rejected promise, not a synchronous throw.
    await expect(api['codex.sessions.delete']!({})).rejects.toThrow(/sessionId/)
  })
})
