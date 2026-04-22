import * as http from "node:http"
import { describe, expect, it } from "vitest"
import { ensureMailboxRegistry } from "@ouro/work-protocol"
import { createMailIngressHealthServer, parsePrivateMailEnvelope } from "../server"
import { StaticRegistryProvider } from "../registry"

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      resolve(typeof address === "object" && address ? address.port : 0)
    })
  })
}

describe("mail ingress server", () => {
  it("serves a compact health endpoint", async () => {
    const registry = ensureMailboxRegistry({ agentId: "slugger", ownerEmail: "ari@mendelow.me" }).registry
    const server = createMailIngressHealthServer(new StaticRegistryProvider(registry))
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      const body = await response.json() as Record<string, unknown>
      expect(body).toEqual(expect.objectContaining({
        ok: true,
        service: "ouro-mail-ingress",
        domain: "ouro.bot",
        mailboxes: 1,
        sourceGrants: 1,
      }))
    } finally {
      server.close()
    }
  })

  it("parses mail into a private envelope with untrusted content warning", async () => {
    const parsed = await parsePrivateMailEnvelope(Buffer.from([
      "From: Ari <ari@mendelow.me>",
      "To: slugger@ouro.bot",
      "Subject: Plans",
      "",
      "Please check this itinerary.",
    ].join("\r\n"), "utf-8"))

    expect(parsed.privateEnvelope.from).toEqual(["ari@mendelow.me"])
    expect(parsed.privateEnvelope.subject).toBe("Plans")
    expect(parsed.privateEnvelope.snippet).toBe("Please check this itinerary.")
    expect(parsed.privateEnvelope.untrustedContentWarning).toContain("untrusted external data")
  })
})
