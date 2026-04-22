import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { parseVaultControlArgs } from "../args"

describe("vault control args", () => {
  it("requires an admin token file by default", () => {
    expect(() => parseVaultControlArgs(["--vault-server-url", "https://vault.example.com"]))
      .toThrow("Missing --admin-token-file")
  })

  it("reads token files and explicit config", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-vault-control-"))
    const tokenFile = path.join(dir, "token")
    fs.writeFileSync(tokenFile, "secret-token\n", "utf-8")
    const parsed = parseVaultControlArgs([
      "vault-server-url=https://vault.example.com",
      `admin-token-file=${tokenFile}`,
      "allowed-email-domain=ouro.bot",
      "port=8090",
      "rate-limit-max=4",
    ])

    expect(parsed.adminToken).toBe("secret-token")
    expect(parsed.vaultServerUrl).toBe("https://vault.example.com")
    expect(parsed.port).toBe(8090)
    expect(parsed.rateLimitMax).toBe(4)
  })

  it("allows unauthenticated local development explicitly", () => {
    const parsed = parseVaultControlArgs([
      "--vault-server-url", "http://127.0.0.1:8080",
      "--allow-unauthenticated-local",
    ])

    expect(parsed.allowUnauthenticatedLocal).toBe(true)
  })
})

