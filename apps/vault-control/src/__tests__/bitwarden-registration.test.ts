import { describe, expect, it } from "vitest"
import { buildVaultRegistrationPayload, createVaultAccount, deriveMasterKey, deriveStretchedMasterKey } from "../bitwarden-registration"

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
    const stretched = deriveStretchedMasterKey(master)

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
})

