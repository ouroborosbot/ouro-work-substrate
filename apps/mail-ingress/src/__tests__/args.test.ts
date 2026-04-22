import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { ensureMailboxRegistry } from "@ouro/work-protocol"
import { parseMailIngressArgs, readRegistry } from "../args"

describe("mail ingress args", () => {
  it("parses explicit file store and registry arguments", () => {
    const parsed = parseMailIngressArgs([
      "--registry", "/tmp/registry.json",
      "--store", "/tmp/mailroom",
      "--smtp-port", "2526",
      "--http-port", "8081",
      "--host", "127.0.0.1",
    ])

    expect(parsed).toEqual(expect.objectContaining({
      registryPath: "/tmp/registry.json",
      storePath: "/tmp/mailroom",
      smtpPort: 2526,
      httpPort: 8081,
      host: "127.0.0.1",
      azureContainer: "mailroom",
    }))
  })

  it("parses key=value arguments for container app command lines", () => {
    const parsed = parseMailIngressArgs([
      "registry-base64=abc",
      "azure-account-url=https://storage.blob.core.windows.net",
      "azure-container=mail",
      "smtp-port=25",
    ])

    expect(parsed.registryBase64).toBe("abc")
    expect(parsed.azureAccountUrl).toBe("https://storage.blob.core.windows.net")
    expect(parsed.azureContainer).toBe("mail")
    expect(parsed.smtpPort).toBe(25)
  })

  it("reads registry JSON from file or base64", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-ingress-"))
    const registry = ensureMailboxRegistry({ agentId: "slugger" }).registry
    const file = path.join(dir, "registry.json")
    fs.writeFileSync(file, JSON.stringify(registry), "utf-8")

    expect(readRegistry({ registryPath: file }).mailboxes[0]?.canonicalAddress).toBe("slugger@ouro.bot")
    const encoded = Buffer.from(JSON.stringify(registry), "utf-8").toString("base64")
    expect(readRegistry({ registryBase64: encoded }).mailboxes[0]?.canonicalAddress).toBe("slugger@ouro.bot")
  })

  it("requires both routing and storage configuration", () => {
    expect(() => parseMailIngressArgs(["--store", "/tmp/mail"])).toThrow("Missing --registry")
    expect(() => parseMailIngressArgs(["--registry", "/tmp/registry.json"])).toThrow("Missing --store")
  })

  it("supports a dynamic Azure Blob registry", () => {
    const parsed = parseMailIngressArgs([
      "--registry-azure-account-url", "https://storage.blob.core.windows.net",
      "--azure-account-url", "https://storage.blob.core.windows.net",
      "--registry-container", "mail",
      "--registry-blob", "registry/prod.json",
      "--registry-refresh-ms", "5000",
    ])

    expect(parsed.registryAzureAccountUrl).toBe("https://storage.blob.core.windows.net")
    expect(parsed.registryContainer).toBe("mail")
    expect(parsed.registryBlob).toBe("registry/prod.json")
    expect(parsed.registryRefreshMs).toBe(5000)
  })
})
