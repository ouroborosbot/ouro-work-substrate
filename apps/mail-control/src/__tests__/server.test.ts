import * as fs from "node:fs"
import * as http from "node:http"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { createMailControlServer } from "../server"
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
})
