import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { parseMailControlArgs } from "../args"

describe("mail control args", () => {
  it("requires an authenticated store by default", () => {
    expect(() => parseMailControlArgs(["--store", "/tmp/registry.json"])).toThrow("Missing --admin-token-file")
    expect(() => parseMailControlArgs(["--admin-token-file", "/tmp/missing"])).toThrow("Missing --azure-account-url")
  })

  it("parses azure storage and token-file settings", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-"))
    const tokenFile = path.join(dir, "token")
    fs.writeFileSync(tokenFile, "control-token\n", "utf-8")
    const parsed = parseMailControlArgs([
      "azure-account-url=https://storage.blob.core.windows.net",
      `admin-token-file=${tokenFile}`,
      "registry-container=mail",
      "registry-blob=registry/prod.json",
      "port=9090",
    ])

    expect(parsed.azureAccountUrl).toBe("https://storage.blob.core.windows.net")
    expect(parsed.adminToken).toBe("control-token")
    expect(parsed.registryContainer).toBe("mail")
    expect(parsed.registryBlob).toBe("registry/prod.json")
    expect(parsed.port).toBe(9090)
  })

  it("parses optional host, domain, identity, and rate limits", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-"))
    const tokenFile = path.join(dir, "token")
    fs.writeFileSync(tokenFile, "control-token", "utf-8")
    const parsed = parseMailControlArgs([
      "--store", path.join(dir, "registry.json"),
      "--admin-token-file", tokenFile,
      "--azure-managed-identity-client-id", "identity-client-id",
      "--registry-domain", "OURO.BOT",
      "--allowed-email-domain", "OURO.BOT",
      "--host", "127.0.0.1",
      "--rate-limit-window-ms", "500",
      "--rate-limit-max", "3",
      "unknown=value",
    ])

    expect(parsed.storePath).toContain("registry.json")
    expect(parsed.azureManagedIdentityClientId).toBe("identity-client-id")
    expect(parsed.registryDomain).toBe("OURO.BOT")
    expect(parsed.allowedEmailDomain).toBe("ouro.bot")
    expect(parsed.host).toBe("127.0.0.1")
    expect(parsed.rateLimitWindowMs).toBe(500)
    expect(parsed.rateLimitMax).toBe(3)
  })

  it("allows explicit unauthenticated local development", () => {
    const parsed = parseMailControlArgs([
      "--store", "/tmp/registry.json",
      "--allow-unauthenticated-local",
    ])

    expect(parsed.allowUnauthenticatedLocal).toBe(true)
  })

  it("rejects invalid numeric arguments", () => {
    expect(() => parseMailControlArgs([
      "--store", "/tmp/registry.json",
      "--allow-unauthenticated-local",
      "--port", "70000",
    ])).toThrow("--port must be a TCP port")
    expect(() => parseMailControlArgs([
      "--store", "/tmp/registry.json",
      "--allow-unauthenticated-local",
      "--rate-limit-max", "-1",
    ])).toThrow("--rate-limit-max must be a non-negative integer")
    expect(() => parseMailControlArgs([
      "--store=/tmp/registry.json",
      "--allow-unauthenticated-local",
    ])).toThrow("Missing --azure-account-url or --store")
    expect(() => parseMailControlArgs([
      "--store", "/tmp/registry.json",
      "--allow-unauthenticated-local",
      "--port",
    ])).toThrow("--port must be a non-negative integer")
  })
})
