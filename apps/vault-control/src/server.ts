import * as http from "node:http"
import { createVaultAccount } from "./bitwarden-registration"
import { InMemoryRateLimiter } from "./rate-limit"
import { logEvent } from "./log"

export interface VaultControlOptions {
  vaultServerUrl: string
  adminToken?: string
  allowedEmailDomain: string
  rateLimitWindowMs?: number
  rateLimitMax?: number
  allowUnauthenticatedLocal?: boolean
  fetchImpl?: typeof fetch
}

interface CreateVaultRequest {
  agentId?: unknown
  email?: unknown
  masterPassword?: unknown
}

function json(response: http.ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
  })
  response.end(text)
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

function bearerToken(request: http.IncomingMessage): string | null {
  const header = request.headers.authorization
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

function validateAgentId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,62}$/.test(value)) {
    throw new Error("agentId must be 2-63 characters of letters, numbers, underscore, or hyphen")
  }
  return value
}

function validateEmail(value: unknown, allowedDomain: string): string {
  if (typeof value !== "string") throw new Error("email must be a string")
  const normalized = value.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new Error("email must be valid")
  if (!normalized.endsWith(`@${allowedDomain}`)) throw new Error(`email must be under ${allowedDomain}`)
  return normalized
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 16) {
    throw new Error("masterPassword must be at least 16 characters")
  }
  return value
}

function remoteKey(request: http.IncomingMessage, email: string): string {
  return `${request.socket.remoteAddress ?? "unknown"}:${email}`
}

function errorStatus(reason: string): number {
  if (reason.includes("must") || reason.includes("valid") || reason.includes("Unexpected")) return 400
  return 500
}

export function createVaultControlServer(options: VaultControlOptions): http.Server {
  const limiter = new InMemoryRateLimiter(options.rateLimitWindowMs ?? 60_000, options.rateLimitMax ?? 20)
  return http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        json(response, 200, { ok: true, service: "ouro-vault-control" })
        return
      }
      if (request.method !== "POST" || request.url !== "/v1/vaults") {
        json(response, 404, { ok: false, error: "not found" })
        return
      }
      if (!options.allowUnauthenticatedLocal) {
        const supplied = bearerToken(request)
        if (!options.adminToken || supplied !== options.adminToken) {
          json(response, 401, { ok: false, error: "unauthorized" })
          return
        }
      }

      const body = JSON.parse(await readBody(request)) as CreateVaultRequest
      const agentId = validateAgentId(body.agentId)
      const email = validateEmail(body.email, options.allowedEmailDomain)
      const masterPassword = validatePassword(body.masterPassword)
      const rate = limiter.take(remoteKey(request, email))
      response.setHeader("x-ratelimit-remaining", String(rate.remaining))
      response.setHeader("x-ratelimit-reset", String(rate.resetAt))
      if (!rate.allowed) {
        json(response, 429, { ok: false, error: "rate limited" })
        return
      }

      const result = await createVaultAccount({
        agentName: agentId,
        serverUrl: options.vaultServerUrl,
        email,
        masterPassword,
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      })
      if (!result.success) {
        logEvent({
          level: "warn",
          component: "vault-control",
          event: "create_failed",
          message: "vault account creation failed",
          meta: { agentId, email, reason: result.error },
        })
        json(response, 502, { ok: false, email, serverUrl: result.serverUrl, error: result.error })
        return
      }
      logEvent({
        component: "vault-control",
        event: "create_succeeded",
        message: "vault account created",
        meta: { agentId, email },
      })
      json(response, 201, { ok: true, email, serverUrl: result.serverUrl })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logEvent({
        level: "error",
        component: "vault-control",
        event: "request_error",
        message: "vault control request failed",
        meta: { reason },
      })
      json(response, errorStatus(reason), { ok: false, error: reason })
    }
  })
}

export function startVaultControlServer(options: VaultControlOptions & { host: string; port: number }): http.Server {
  const server = createVaultControlServer(options)
  server.listen(options.port, options.host)
  logEvent({
    component: "vault-control",
    event: "started",
    message: "vault control server started",
    meta: { host: options.host, port: options.port, allowedEmailDomain: options.allowedEmailDomain },
  })
  return server
}
