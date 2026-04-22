import * as http from "node:http"
import type { MailRegistryStore } from "./store"
import { logEvent } from "./log"

export interface MailControlOptions {
  store: MailRegistryStore
  adminToken?: string
  allowedEmailDomain: string
  rateLimitWindowMs?: number
  rateLimitMax?: number
  allowUnauthenticatedLocal?: boolean
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function takeRateLimit(key: string, windowMs: number, max: number): boolean {
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

function readBody(request: http.IncomingMessage, maxBytes = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    request.on("data", (chunk: Buffer) => {
      total += chunk.byteLength
      if (total > maxBytes) {
        reject(new Error("request body too large"))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on("error", reject)
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
  })
}

function validateAgentId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,62}$/.test(value)) {
    throw new Error("agentId must be 2-63 characters of letters, numbers, underscore, or hyphen")
  }
  return value
}

function validateOptionalEmail(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string") throw new Error("ownerEmail must be a string")
  const normalized = value.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new Error("ownerEmail must be valid")
  return normalized
}

function validateOptionalText(value: unknown, fallback?: string): string | undefined {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value !== "string" || value.length > 64) throw new Error("source fields must be short strings")
  return value
}

export function createMailControlServer(options: MailControlOptions): http.Server {
  return http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        const { registry, revision } = await options.store.read()
        json(response, 200, {
          ok: true,
          service: "ouro-mail-control",
          domain: registry.domain,
          mailboxes: registry.mailboxes.length,
          sourceGrants: registry.sourceGrants.length,
          revision,
        })
        return
      }
      if (request.method !== "POST" || request.url !== "/v1/mailboxes/ensure") {
        json(response, 404, { ok: false, error: "not found" })
        return
      }
      if (!options.allowUnauthenticatedLocal && (!options.adminToken || bearerToken(request) !== options.adminToken)) {
        json(response, 401, { ok: false, error: "unauthorized" })
        return
      }
      const rateKey = `${request.socket.remoteAddress ?? "unknown"}`
      if (!takeRateLimit(rateKey, options.rateLimitWindowMs ?? 60_000, options.rateLimitMax ?? 60)) {
        json(response, 429, { ok: false, error: "rate limited" })
        return
      }
      const body = JSON.parse(await readBody(request)) as Record<string, unknown>
      const ownerEmail = validateOptionalEmail(body.ownerEmail)
      const source = validateOptionalText(body.source, ownerEmail ? "hey" : undefined)
      const sourceTag = validateOptionalText(body.sourceTag)
      const result = await options.store.ensureMailbox({
        agentId: validateAgentId(body.agentId),
        ...(ownerEmail ? { ownerEmail } : {}),
        ...(source ? { source } : {}),
        ...(sourceTag ? { sourceTag } : {}),
      })
      logEvent({
        component: "mail-control",
        event: "mailbox_ensured",
        message: "mailbox registry ensured",
        meta: {
          agentId: body.agentId,
          addedMailbox: result.addedMailbox,
          addedSourceGrant: result.addedSourceGrant,
          generatedPrivateKeys: Object.keys(result.generatedPrivateKeys).length,
        },
      })
      json(response, 200, {
        ok: true,
        mailboxAddress: result.mailboxAddress,
        sourceAlias: result.sourceAlias,
        addedMailbox: result.addedMailbox,
        addedSourceGrant: result.addedSourceGrant,
        generatedPrivateKeys: result.generatedPrivateKeys,
        revision: result.revision,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logEvent({
        level: "error",
        component: "mail-control",
        event: "request_error",
        message: "mail control request failed",
        meta: { reason },
      })
      json(response, reason.includes("must") || reason.includes("Unexpected") ? 400 : 500, { ok: false, error: reason })
    }
  })
}

export function startMailControlServer(options: MailControlOptions & { host: string; port: number }): http.Server {
  const server = createMailControlServer(options)
  server.listen(options.port, options.host)
  logEvent({
    component: "mail-control",
    event: "started",
    message: "mail control server started",
    meta: { host: options.host, port: options.port, allowedEmailDomain: options.allowedEmailDomain },
  })
  return server
}
