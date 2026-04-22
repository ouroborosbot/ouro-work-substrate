import { describe, expect, it, vi } from "vitest"
import {
  buildVaultRegistrationPayload,
  createVaultAccount,
  deriveMasterKey,
  deriveMasterPasswordHash,
  deriveStretchedMasterKey,
} from "../bitwarden-registration"

describe("bitwarden registration", () => {
  it("builds a Bitwarden-compatible registration payload without exposing the password", async () => {
    const payload = await buildVaultRegistrationPayload({
      agentName: "slugger",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
    })

    expect(payload.name).toBe("slugger")
    expect(payload.email).toBe("slugger@ouro.bot")
    expect(payload.kdf).toBe(0)
    expect(payload.kdfIterations).toBe(600000)
    expect(payload.masterPasswordHash).not.toContain("Correct")
    expect(payload.key).toMatch(/^2\./)
    expect(payload.keys.encryptedPrivateKey).toMatch(/^2\./)
    expect(payload.keys.publicKey.length).toBeGreaterThan(100)
  })

  it("uses expand-only stretching for the master key", async () => {
    const master = await deriveMasterKey("password", "slugger@ouro.bot", 2)
    const hash = await deriveMasterPasswordHash(master, "password")
    const stretched = deriveStretchedMasterKey(master)

    expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(stretched.byteLength).toBe(64)
    expect(stretched.subarray(0, 32).equals(stretched.subarray(32))).toBe(false)
  })

  it("posts account registration to the identity endpoint", async () => {
    let capturedUrl = ""
    let capturedBody: Record<string, unknown> | null = null
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response("{}", { status: 200 })
    }) as typeof fetch

    const result = await createVaultAccount({
      agentName: "slugger",
      serverUrl: "https://vault.example.com/",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
      fetchImpl,
    })

    expect(result.success).toBe(true)
    expect(capturedUrl).toBe("https://vault.example.com/identity/accounts/register")
    expect(capturedBody?.email).toBe("slugger@ouro.bot")
  })

  it("uses global fetch when no fetch implementation is injected", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }))
    try {
      const result = await createVaultAccount({
        agentName: "slugger",
        serverUrl: "https://vault.example.com/",
        email: "slugger@ouro.bot",
        masterPassword: "Correct Horse Battery Staple! 2026",
      })

      expect(result.success).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith("https://vault.example.com/identity/accounts/register", expect.objectContaining({
        method: "POST",
      }))
    } finally {
      fetchMock.mockRestore()
    }
  })

  it("surfaces vault registration errors from JSON or HTTP status", async () => {
    const jsonFailure = await createVaultAccount({
      agentName: "slugger",
      serverUrl: "https://vault.example.com",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
      fetchImpl: (async () => new Response(JSON.stringify({ message: "registration closed" }), { status: 400 })) as typeof fetch,
    })
    expect(jsonFailure.success).toBe(false)
    expect(jsonFailure.error).toContain("registration closed")

    const textFailure = await createVaultAccount({
      agentName: "slugger",
      serverUrl: "https://vault.example.com",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
      fetchImpl: (async () => new Response("not json", { status: 503, statusText: "Service Unavailable" })) as typeof fetch,
    })
    expect(textFailure.error).toContain("HTTP 503 Service Unavailable")

    const statusFallback = await createVaultAccount({
      agentName: "slugger",
      serverUrl: "https://vault.example.com",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
      fetchImpl: (async () => new Response(JSON.stringify({}), { status: 409, statusText: "Conflict" })) as typeof fetch,
    })
    expect(statusFallback.error).toContain("HTTP 409 Conflict")
  })

  it("reports network failures when the vault cannot be reached", async () => {
    const result = await createVaultAccount({
      agentName: "slugger",
      serverUrl: "https://vault.example.com/",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
      fetchImpl: (async () => {
        throw new Error("socket closed")
      }) as typeof fetch,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("cannot reach vault registration endpoint")
    expect(result.error).toContain("socket closed")

    const stringFailure = await createVaultAccount({
      agentName: "slugger",
      serverUrl: "https://vault.example.com/",
      email: "slugger@ouro.bot",
      masterPassword: "Correct Horse Battery Staple! 2026",
      fetchImpl: (async () => {
        throw "offline"
      }) as typeof fetch,
    })
    expect(stringFailure.error).toContain("offline")
  })
})
