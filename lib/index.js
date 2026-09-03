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
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'codex-design'
export const inject = ['webServer']

const STATE_FILENAME = 'codex-design-state.json'
export const STATE_ROUTE_PATH = '/codex-design/state'

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
}
