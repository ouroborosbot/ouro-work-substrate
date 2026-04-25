import * as http from "node:http"
import * as fs from "node:fs"
import { TripNotFoundError, type TripLedgerStore } from "./store"
import { logEvent } from "./log"

export interface TripControlOptions {
  store: TripLedgerStore
  adminToken?: string
  adminTokenFile?: string
  host: string
  port: number
  rateLimitWindowMs?: number
  rateLimitMax?: number
  allowUnauthenticatedLocal?: boolean
}

interface Bucket {
  count: number
  resetAt: number
}

class PayloadTooLargeError extends Error {
  readonly statusCode = 413
}

function takeRateLimit(buckets: Map<string, Bucket>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

function json(response: http.ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
  })
  response.end(text)
}

function bearerToken(request: http.IncomingMessage): string | null {
  const header = request.headers.authorization
  if (!header) return null
  return header.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
}

function expectedAdminToken(options: Pick<TripControlOptions, "adminToken" | "adminTokenFile">): string | undefined {
  if (options.adminTokenFile) return fs.readFileSync(options.adminTokenFile, "utf-8").trim()
  return options.adminToken
}

function readBody(request: http.IncomingMessage, maxBytes = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let tooLarge = false
    request.on("data", (chunk: Buffer) => {
      /* v8 ignore next -- extra data events after rejection only drain an already-failed request. */
      if (tooLarge) return
      total += chunk.byteLength
      if (total > maxBytes) {
        tooLarge = true
        reject(new PayloadTooLargeError("request body too large"))
        request.resume()
        return
      }
      chunks.push(chunk)
    })
    /* v8 ignore next 3 -- low-level request stream errors require a broken client socket. */
    request.on("error", (error) => {
      if (!tooLarge) reject(error)
    })
    request.on("end", () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString("utf-8"))
    })
  })
}

function validateAgentId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,62}$/.test(value)) {
    throw new Error("agentId must be 2-63 characters of letters, numbers, underscore, or hyphen")
  }
  return value
}

function validateTripId(value: unknown): string {
  if (typeof value !== "string" || !/^trip_[a-zA-Z0-9._-]{1,128}$/.test(value)) {
    throw new Error("tripId must be the canonical trip_ id form (alphanumeric / dot / underscore / dash, ≤128 chars after the prefix)")
  }
  return value
}

function validateOptionalLabel(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string" || value.length > 64) throw new Error("label must be a short string")
  return value
}

function validateEncryptedPayload(value: unknown): { algorithm: "RSA-OAEP-SHA256+A256GCM"; keyId: string; wrappedKey: string; iv: string; authTag: string; ciphertext: string } {
  if (!value || typeof value !== "object") throw new Error("payload must be an EncryptedPayload object")
  const record = value as Record<string, unknown>
  if (record.algorithm !== "RSA-OAEP-SHA256+A256GCM") {
    throw new Error("payload algorithm must be RSA-OAEP-SHA256+A256GCM")
  }
  for (const field of ["keyId", "wrappedKey", "iv", "authTag", "ciphertext"] as const) {
    if (typeof record[field] !== "string" || (record[field] as string).length === 0) {
      throw new Error(`payload.${field} must be a non-empty string`)
    }
  }
  return {
    algorithm: "RSA-OAEP-SHA256+A256GCM",
    keyId: record.keyId as string,
    wrappedKey: record.wrappedKey as string,
    iv: record.iv as string,
    authTag: record.authTag as string,
    ciphertext: record.ciphertext as string,
  }
}

function errorStatus(error: unknown, reason: string): number {
  if (error instanceof PayloadTooLargeError) return error.statusCode
  if (error instanceof TripNotFoundError) return error.statusCode
  if (reason.includes("must") || reason.includes("required") || reason.includes("Unexpected") || reason.includes("JSON")) return 400
  return 500
}

async function handleEnsureLedger(request: http.IncomingMessage, response: http.ServerResponse, options: TripControlOptions): Promise<void> {
  const body = JSON.parse(await readBody(request)) as Record<string, unknown>
  const agentId = validateAgentId(body.agentId)
  const label = validateOptionalLabel(body.label)
  const result = await options.store.ensureLedger({
    agentId,
    ...(label ? { label } : {}),
  })
  logEvent({
    component: "trip-control",
    event: "ledger_ensured",
    message: "agent trip ledger ensured",
    meta: {
      agentId,
      added: result.added,
      generatedPrivateKey: result.generatedPrivateKeyPem !== undefined,
    },
  })
  json(response, 200, {
    ok: true,
    ledger: result.ledger,
    added: result.added,
    ...(result.generatedPrivateKeyPem ? { generatedPrivateKeyPem: result.generatedPrivateKeyPem } : {}),
    registryRevision: result.registryRevision,
  })
}

async function handleUpsertTrip(request: http.IncomingMessage, response: http.ServerResponse, options: TripControlOptions): Promise<void> {
  const body = JSON.parse(await readBody(request)) as Record<string, unknown>
  const agentId = validateAgentId(body.agentId)
  const tripId = validateTripId(body.tripId)
  const payload = validateEncryptedPayload(body.payload)
  const result = await options.store.upsertTrip({ agentId, tripId, payload })
  logEvent({
    component: "trip-control",
    event: "trip_upserted",
    message: "trip ledger record upserted",
    meta: { agentId, tripId, keyId: payload.keyId },
  })
  json(response, 200, { ok: true, tripId, agentId, revision: result.revision })
}

async function handleGetTrip(request: http.IncomingMessage, response: http.ServerResponse, options: TripControlOptions): Promise<void> {
  const body = JSON.parse(await readBody(request)) as Record<string, unknown>
  const agentId = validateAgentId(body.agentId)
  const tripId = validateTripId(body.tripId)
  const result = await options.store.getTrip({ agentId, tripId })
  json(response, 200, { ok: true, tripId, agentId, payload: result.payload })
}

async function handleListTrips(request: http.IncomingMessage, response: http.ServerResponse, options: TripControlOptions): Promise<void> {
  const body = JSON.parse(await readBody(request)) as Record<string, unknown>
  const agentId = validateAgentId(body.agentId)
  const result = await options.store.listTrips({ agentId })
  json(response, 200, { ok: true, agentId: result.agentId, tripIds: result.tripIds })
}

const ROUTES: Record<string, (request: http.IncomingMessage, response: http.ServerResponse, options: TripControlOptions) => Promise<void>> = {
  "/v1/ledgers/ensure": handleEnsureLedger,
  "/v1/trips/upsert": handleUpsertTrip,
  "/v1/trips/get": handleGetTrip,
  "/v1/trips/list": handleListTrips,
}

export function createTripControlServer(options: TripControlOptions): http.Server {
  const buckets = new Map<string, Bucket>()
  return http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        const { registry, revision } = await options.store.readRegistry()
        json(response, 200, {
          ok: true,
          service: "ouro-trip-control",
          ledgers: registry.ledgers.length,
          revision,
        })
        return
      }
      /* v8 ignore next -- defensive: Node HTTP requests always carry a url string for accepted connections. */
      const route = request.url ? ROUTES[request.url] : undefined
      if (request.method !== "POST" || !route) {
        json(response, 404, { ok: false, error: "not found" })
        return
      }
      const expectedToken = expectedAdminToken(options)
      if (!options.allowUnauthenticatedLocal && (!expectedToken || bearerToken(request) !== expectedToken)) {
        json(response, 401, { ok: false, error: "unauthorized" })
        return
      }
      /* v8 ignore next -- accepted Node HTTP sockets carry a remoteAddress. */
      const rateKey = request.socket.remoteAddress ?? "unknown"
      if (!takeRateLimit(buckets, rateKey, options.rateLimitWindowMs ?? 60_000, options.rateLimitMax ?? 60)) {
        json(response, 429, { ok: false, error: "rate limited" })
        return
      }
      await route(request, response, options)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logEvent({
        level: "error",
        component: "trip-control",
        event: "request_error",
        message: "trip control request failed",
        meta: { reason },
      })
      json(response, errorStatus(error, reason), { ok: false, error: reason })
    }
  })
}

export function startTripControlServer(options: TripControlOptions): http.Server {
  const server = createTripControlServer(options)
  server.listen(options.port, options.host)
  logEvent({
    component: "trip-control",
    event: "started",
    message: "trip control server started",
    meta: { host: options.host, port: options.port },
  })
  return server
}
