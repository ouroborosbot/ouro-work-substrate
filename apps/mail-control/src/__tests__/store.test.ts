import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { FileMailRegistryStore } from "../store"

describe("mail registry store", () => {
  it("ensures native and delegated mailboxes without storing private keys", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-store-"))
    const store = new FileMailRegistryStore(path.join(dir, "registry.json"), "ouro.bot")

    const first = await store.ensureMailbox({
      agentId: "slugger",
      ownerEmail: "ari@mendelow.me",
      source: "hey",
    })
    const second = await store.ensureMailbox({
      agentId: "slugger",
      ownerEmail: "ari@mendelow.me",
      source: "hey",
    })

    expect(first.mailboxAddress).toBe("slugger@ouro.bot")
    expect(first.sourceAlias).toBe("me.mendelow.ari.slugger@ouro.bot")
    expect(Object.keys(first.generatedPrivateKeys)).toHaveLength(2)
    expect(second.generatedPrivateKeys).toEqual({})
    expect(second.addedMailbox).toBe(false)
    expect(second.addedSourceGrant).toBe(false)
    const read = await store.read()
    expect(read.registry.mailboxes).toHaveLength(1)
    expect(read.registry.sourceGrants).toHaveLength(1)
  })
})

