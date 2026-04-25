import { describe, expect, it } from "vitest"
import { parseTripControlArgs } from "../args"

describe("parseTripControlArgs", () => {
  it("parses the minimum valid arg set: --store + --admin-token", () => {
    const parsed = parseTripControlArgs(["--store", "/tmp/x", "--admin-token", "secret"])
    expect(parsed).toMatchObject({
      storePath: "/tmp/x",
      adminToken: "secret",
      host: "0.0.0.0",
      port: 8080,
      rateLimitWindowMs: 60_000,
      rateLimitMax: 60,
      allowUnauthenticatedLocal: false,
    })
    expect(parsed.adminTokenFile).toBeUndefined()
  })

  it("parses --admin-token-file as an alternative to --admin-token", () => {
    const parsed = parseTripControlArgs(["--store", "/tmp/x", "--admin-token-file", "/tmp/token"])
    expect(parsed.adminTokenFile).toBe("/tmp/token")
    expect(parsed.adminToken).toBeUndefined()
  })

  it("accepts --allow-unauthenticated-local without an admin token", () => {
    const parsed = parseTripControlArgs(["--store", "/tmp/x", "--allow-unauthenticated-local"])
    expect(parsed.allowUnauthenticatedLocal).toBe(true)
    expect(parsed.adminToken).toBeUndefined()
    expect(parsed.adminTokenFile).toBeUndefined()
  })

  it("overrides defaults for host, port, and rate limit window/max", () => {
    const parsed = parseTripControlArgs([
      "--store", "/tmp/x",
      "--admin-token", "s",
      "--host", "127.0.0.1",
      "--port", "0",
      "--rate-limit-window-ms", "1000",
      "--rate-limit-max", "5",
    ])
    expect(parsed.host).toBe("127.0.0.1")
    expect(parsed.port).toBe(0)
    expect(parsed.rateLimitWindowMs).toBe(1000)
    expect(parsed.rateLimitMax).toBe(5)
  })

  it("requires --store", () => {
    expect(() => parseTripControlArgs(["--admin-token", "s"])).toThrow(/--store/)
  })

  it("requires either an admin token, an admin-token-file, or --allow-unauthenticated-local", () => {
    expect(() => parseTripControlArgs(["--store", "/tmp/x"])).toThrow(/admin-token/)
  })

  it("rejects non-integer port values", () => {
    expect(() => parseTripControlArgs(["--store", "/tmp/x", "--admin-token", "s", "--port", "not-a-number"])).toThrow(/--port/)
  })

  it("rejects negative integer flag values", () => {
    expect(() => parseTripControlArgs(["--store", "/tmp/x", "--admin-token", "s", "--rate-limit-max", "-1"])).toThrow(/--rate-limit-max/)
  })

  it("parses Azure-only configuration (no --store) with optional --azure-managed-identity-client-id and --registry-container", () => {
    const parsed = parseTripControlArgs([
      "--azure-account-url", "https://acct.blob.core.windows.net",
      "--azure-managed-identity-client-id", "00000000-0000-0000-0000-000000000000",
      "--registry-container", "tripsv1",
      "--admin-token", "s",
    ])
    expect(parsed.storePath).toBeUndefined()
    expect(parsed.azureAccountUrl).toBe("https://acct.blob.core.windows.net")
    expect(parsed.azureManagedIdentityClientId).toBe("00000000-0000-0000-0000-000000000000")
    expect(parsed.registryContainer).toBe("tripsv1")
  })

  it("falls back to the default registry container when --registry-container is not provided", () => {
    const parsed = parseTripControlArgs([
      "--azure-account-url", "https://acct.blob.core.windows.net",
      "--admin-token", "s",
    ])
    expect(parsed.registryContainer).toBe("trips")
    expect(parsed.azureManagedIdentityClientId).toBeUndefined()
  })

  it("rejects when neither --store nor --azure-account-url is provided", () => {
    expect(() => parseTripControlArgs(["--admin-token", "s"])).toThrow(/--store|--azure-account-url/)
  })
})
