import * as fs from "node:fs"
import * as http from "node:http"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { createMailControlServer, startMailControlServer } from "../server"
import { FileMailRegistryStore } from "../store"

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      resolve(typeof address === "object" && address ? address.port : 0)
    })
  })
}

describe("mail control server", () => {
  it("serves health and rejects unknown routes", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-server-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const health = await fetch(`http://127.0.0.1:${port}/health`)
      expect(await health.json()).toEqual(expect.objectContaining({
        ok: true,
        service: "ouro-mail-control",
        domain: "ouro.bot",
        mailboxes: 0,
        sourceGrants: 0,
      }))
      const missing = await fetch(`http://127.0.0.1:${port}/missing`, { method: "POST" })
      expect(missing.status).toBe(404)
    } finally {
      server.close()
    }
  })

  it("requires bearer auth for mailbox creation", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-server-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, { method: "POST" })
      expect(response.status).toBe(401)
      const malformed = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: { authorization: "Token nope" },
      })
      expect(malformed.status).toBe(401)
    } finally {
      server.close()
    }
  })

  it("rejects mutation when no expected token is configured", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-no-token-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      })
      expect(response.status).toBe(401)
    } finally {
      server.close()
    }
  })

  it("creates agent mailboxes and returns generated private keys once", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-server-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agentId: "slugger",
          ownerEmail: "ari@mendelow.me",
          source: "hey",
        }),
      })
      const body = await response.json() as Record<string, unknown>
      expect(response.status).toBe(200)
      expect(body.mailboxAddress).toBe("slugger@ouro.bot")
      expect(body.sourceAlias).toBe("me.mendelow.ari.slugger@ouro.bot")
      expect(Object.keys(body.generatedPrivateKeys as Record<string, string>)).toHaveLength(2)

      const second = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger", ownerEmail: "ari@mendelow.me", source: "hey" }),
      })
      const secondBody = await second.json() as Record<string, unknown>
      expect(secondBody.generatedPrivateKeys).toEqual({})
    } finally {
      server.close()
    }
  })

  it("allows explicit unauthenticated local setup", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-local-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      allowedEmailDomain: "ouro.bot",
      allowUnauthenticatedLocal: true,
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: "slugger" }),
      })
      expect(response.status).toBe(200)
    } finally {
      server.close()
    }
  })

  it("validates request bodies and rate limits callers", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-validate-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const invalid = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger", ownerEmail: "not-mail" }),
      })
      expect(invalid.status).toBe(400)

      const badOwnerType = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger", ownerEmail: 42 }),
      })
      expect(badOwnerType.status).toBe(400)

      const badAgent = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "!" }),
      })
      expect(badAgent.status).toBe(400)

      const badSource = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger", source: "x".repeat(65) }),
      })
      expect(badSource.status).toBe(400)

      const invalidJson = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: "{",
      })
      expect(invalidJson.status).toBe(400)

      const tooLarge = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: "x".repeat(1024 * 1024 + 1),
      })
      expect(tooLarge.status).toBe(413)
    } finally {
      server.close()
    }
  })

  it("surfaces unexpected store errors without leaking control flow", async () => {
    const server = createMailControlServer({
      store: {
        async read() {
          return { registry: { schemaVersion: 1, domain: "ouro.bot", mailboxes: [], sourceGrants: [] }, revision: "0:0:72" }
        },
        async ensureMailbox() {
          throw "store offline"
        },
      },
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger" }),
      })
      const body = await response.json() as Record<string, unknown>
      expect(response.status).toBe(500)
      expect(body.error).toBe("store offline")
    } finally {
      server.close()
    }
  })

  it("rate limits callers after the allowed window count", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-rate-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
      rateLimitMax: 1,
    })
    const port = await listen(server)
    try {
      const first = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger" }),
      })
      expect(first.status).toBe(200)
      const limited = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "clio" }),
      })
      expect(limited.status).toBe(429)
    } finally {
      server.close()
    }
  })

  it("defaults delegated sources and persists source tags", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-source-"))
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agentId: "slugger",
          ownerEmail: "ari@mendelow.me",
          sourceTag: "calendar",
        }),
      })
      const body = await response.json() as Record<string, unknown>
      expect(body.sourceAlias).toBe("me.mendelow.ari.calendar.slugger@ouro.bot")
    } finally {
      server.close()
    }
  })

  it("reads token files at request time so rotations do not require process restart", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-token-"))
    const tokenFile = path.join(dir, "token")
    fs.writeFileSync(tokenFile, "first", "utf-8")
    const server = createMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminTokenFile: tokenFile,
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      fs.writeFileSync(tokenFile, "second", "utf-8")
      const response = await fetch(`http://127.0.0.1:${port}/v1/mailboxes/ensure`, {
        method: "POST",
        headers: {
          authorization: "Bearer second",
          "content-type": "application/json",
        },
        body: JSON.stringify({ agentId: "slugger" }),
      })
      expect(response.status).toBe(200)
    } finally {
      server.close()
    }
  })

  it("starts on an explicit host and port", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-start-"))
    const server = startMailControlServer({
      store: new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot"),
      adminToken: "secret",
      allowedEmailDomain: "ouro.bot",
      host: "127.0.0.1",
      port: 0,
    })
    try {
      await new Promise((resolve) => server.once("listening", resolve))
      expect(server.address()).toEqual(expect.objectContaining({ address: "127.0.0.1" }))
    } finally {
      server.close()
    }
  })
})
