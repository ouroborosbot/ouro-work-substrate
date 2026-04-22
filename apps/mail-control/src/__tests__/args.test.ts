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

  it("allows explicit unauthenticated local development", () => {
    const parsed = parseMailControlArgs([
      "--store", "/tmp/registry.json",
      "--allow-unauthenticated-local",
    ])

    expect(parsed.allowUnauthenticatedLocal).toBe(true)
  })
})

