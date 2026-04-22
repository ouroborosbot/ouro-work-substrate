import * as http from "node:http"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { createVaultControlServer } from "../server"

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      resolve(typeof address === "object" && address ? address.port : 0)
    })
  })
}

describe("vault control server", () => {
  it("requires bearer authorization for vault creation", async () => {
    const server = createVaultControlServer({
      vaultServerUrl: "https://vault.example.com",
      adminToken: "token",
      allowedEmailDomain: "ouro.bot",
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/vaults`, { method: "POST" })
      expect(response.status).toBe(401)
    } finally {
      server.close()
    }
  })

  it("creates vault accounts through authenticated requests", async () => {
    let captured = false
    const fetchImpl = (async () => {
      captured = true
      return new Response("{}", { status: 200 })
    }) as typeof fetch
    const server = createVaultControlServer({
      vaultServerUrl: "https://vault.example.com",
      adminToken: "token",
      allowedEmailDomain: "ouro.bot",
      fetchImpl,
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/vaults`, {
        method: "POST",
        headers: {
          authorization: "Bearer token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agentId: "slugger",
          email: "slugger@ouro.bot",
          masterPassword: "Correct Horse Battery Staple! 2026",
        }),
      })
      const body = await response.json() as Record<string, unknown>
      expect(response.status).toBe(201)
      expect(body).toEqual(expect.objectContaining({ ok: true, email: "slugger@ouro.bot" }))
      expect(captured).toBe(true)
    } finally {
      server.close()
    }
  })

  it("blocks non-substrate email domains", async () => {
    const server = createVaultControlServer({
      vaultServerUrl: "https://vault.example.com",
      adminToken: "token",
      allowedEmailDomain: "ouro.bot",
      fetchImpl: (async () => new Response("{}", { status: 200 })) as typeof fetch,
    })
    const port = await listen(server)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/vaults`, {
        method: "POST",
        headers: {
          authorization: "Bearer token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agentId: "slugger",
          email: "slugger@example.com",
          masterPassword: "Correct Horse Battery Staple! 2026",
        }),
      })
      expect(response.status).toBe(400)
    } finally {
      server.close()
    }
  })

  it("reads token files at request time so rotations do not require process restart", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-vault-control-token-"))
    const tokenFile = path.join(dir, "token")
    fs.writeFileSync(tokenFile, "first", "utf-8")
    let captured = false
    const server = createVaultControlServer({
      vaultServerUrl: "https://vault.example.com",
      adminTokenFile: tokenFile,
      allowedEmailDomain: "ouro.bot",
      fetchImpl: (async () => {
        captured = true
        return new Response("{}", { status: 200 })
      }) as typeof fetch,
    })
    const port = await listen(server)
    try {
      fs.writeFileSync(tokenFile, "second", "utf-8")
      const response = await fetch(`http://127.0.0.1:${port}/v1/vaults`, {
        method: "POST",
        headers: {
          authorization: "Bearer second",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agentId: "slugger",
          email: "slugger@ouro.bot",
          masterPassword: "Correct Horse Battery Staple! 2026",
        }),
      })
      expect(response.status).toBe(201)
      expect(captured).toBe(true)
    } finally {
      server.close()
    }
  })
})
