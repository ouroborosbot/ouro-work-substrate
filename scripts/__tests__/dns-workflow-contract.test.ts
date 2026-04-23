import * as fs from "node:fs"
import * as path from "node:path"
import { describe, expect, it } from "vitest"

function readRepoFile(...parts: string[]): string {
  return fs.readFileSync(path.resolve(process.cwd(), ...parts), "utf-8")
}

function readJsonFile(...parts: string[]): unknown {
  return JSON.parse(readRepoFile(...parts))
}

describe("DNS workflow production contract", () => {
  it("documents workflow bindings as non-secret config over ordinary vault items", () => {
    const operations = readRepoFile("docs", "operations.md")
    const architecture = readRepoFile("docs", "architecture.md")
    const corpus = `${operations}\n${architecture}`

    expect(operations).toContain("## DNS Workflow Binding")
    expect(operations).toContain("domain")
    expect(operations).toContain("driver")
    expect(operations).toContain("credentialItem")
    expect(operations).toContain("resource allowlist")
    expect(operations).toContain("current-record backup")
    expect(operations).toContain("dry-run")
    expect(operations).toContain("apply")
    expect(operations).toContain("verify")
    expect(operations).toContain("rollback")
    expect(operations).toContain("Notes are for humans and agents")
    expect(operations).toContain("code must not parse notes")
    expect(operations).toContain("Porkbun is the current `ouro.bot` DNS driver")

    expect(corpus).toContain("vault item / credential")
    expect(corpus).toContain("no assumed use")
    expect(corpus).toContain("workflow binding")
    expect(corpus).not.toContain("DNS credential")
    expect(corpus).not.toContain("ops credential")
    expect(corpus).not.toContain("Porkbun credential")
    expect(corpus).not.toContain("credential authority")
  })

  it("commits an ouro.bot DNS binding with driver, vault item reference, allowlist, desired records, and certificate handling", () => {
    const bindingPath = path.resolve(process.cwd(), "infra", "dns", "ouro.bot.binding.json")
    expect(fs.existsSync(bindingPath)).toBe(true)

    const binding = readJsonFile("infra", "dns", "ouro.bot.binding.json") as {
      workflow?: unknown
      domain?: unknown
      driver?: unknown
      credentialItem?: unknown
      resources?: { records?: Array<{ type?: unknown; name?: unknown }> }
      desired?: { records?: Array<{ type?: unknown; name?: unknown; content?: unknown; priority?: unknown; ttl?: unknown }> }
      certificate?: { host?: unknown; source?: unknown; storeItem?: unknown; acmeChallengeRecord?: { type?: unknown; name?: unknown } }
    }

    expect(binding.workflow).toBe("dns")
    expect(binding.domain).toBe("ouro.bot")
    expect(binding.driver).toBe("porkbun")
    expect(binding.credentialItem).toBe("ops/registrars/porkbun/accounts/ari@mendelow.me")
    expect(binding).not.toHaveProperty("credentialItemNoteQuery")
    expect(binding).not.toHaveProperty("authority")
    expect(binding).not.toHaveProperty("kind")

    expect(binding.resources?.records).toEqual(expect.arrayContaining([
      { type: "A", name: "mx1" },
      { type: "MX", name: "@" },
      { type: "TXT", name: "@" },
      { type: "TXT", name: "_dmarc" },
      { type: "TXT", name: "_acme-challenge.mx1" },
      { type: "CNAME", name: "selector1-azurecomm-prod-net._domainkey" },
      { type: "CNAME", name: "selector2-azurecomm-prod-net._domainkey" },
    ]))
    expect(binding.desired?.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "A", name: "mx1", content: "20.10.114.197", ttl: 600 }),
      expect.objectContaining({ type: "MX", name: "@", content: "mx1.ouro.bot", priority: 10, ttl: 600 }),
      expect.objectContaining({ type: "TXT", name: "@", content: "v=spf1 include:spf.protection.outlook.com -all", ttl: 600 }),
      expect.objectContaining({ type: "TXT", name: "@", content: "ms-domain-verification=4722d1d1-c4c6-4fd6-a28d-cc4ccfb3a54c", ttl: 600 }),
      expect.objectContaining({
        type: "CNAME",
        name: "selector1-azurecomm-prod-net._domainkey",
        content: "selector1-azurecomm-prod-net._domainkey.azurecomm.net",
        ttl: 600,
      }),
      expect.objectContaining({
        type: "CNAME",
        name: "selector2-azurecomm-prod-net._domainkey",
        content: "selector2-azurecomm-prod-net._domainkey.azurecomm.net",
        ttl: 600,
      }),
      expect.objectContaining({ type: "TXT", name: "_dmarc" }),
    ]))
    expect(binding.certificate).toMatchObject({
      host: "mx1.ouro.bot",
      source: "porkbun-ssl",
      storeItem: "runtime/mail/certificates/mx1.ouro.bot",
      acmeChallengeRecord: { type: "TXT", name: "_acme-challenge.mx1" },
    })
  })
})
