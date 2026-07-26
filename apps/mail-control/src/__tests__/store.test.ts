import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { classifyMailAddress, classifyMailKey } from "@ouro/work-protocol"
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

  it("rotates keys in place while holding every identity and address fixed", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-rotate-"))
    const filePath = path.join(dir, "registry.json")
    const store = new FileMailRegistryStore(filePath, "ouro.bot")
    const ensured = await store.ensureMailbox({ agentId: "slugger", ownerEmail: "ari@mendelow.me", source: "hey" })
    const grantId = ensured.registry.sourceGrants[0]!.grantId
    const previousKeyId = ensured.registry.sourceGrants[0]!.keyId

    const rotated = await store.rotateKeys({ agentId: "slugger" })
    const served = (await store.read()).registry

    expect(rotated.rotations).toHaveLength(2)
    expect(served.sourceGrants[0]!.grantId).toBe(grantId)
    expect(served.sourceGrants[0]!.aliasAddress).toBe(ensured.sourceAlias)
    expect(served.sourceGrants[0]!.keyId).not.toBe(previousKeyId)
    expect(classifyMailKey(served, previousKeyId).status).toBe("grace")
    expect(classifyMailAddress(served, ensured.sourceAlias!).ok).toBe(true)
    expect(rotated.revision).not.toBe(ensured.revision)
  })

  it("leaves the previous registry intact and serving when a rotation publish fails", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-atomic-"))
    const filePath = path.join(dir, "registry.json")
    const store = new FileMailRegistryStore(filePath, "ouro.bot")
    const ensured = await store.ensureMailbox({ agentId: "slugger", ownerEmail: "ari@mendelow.me", source: "hey" })
    const before = fs.readFileSync(filePath, "utf-8")

    // Break the staging write the way a full disk or a bad mount would.
    const stagingPath = `${filePath}.${process.pid}.tmp`
    fs.mkdirSync(stagingPath)
    try {
      await expect(store.rotateKeys({ agentId: "slugger" })).rejects.toThrow(/EISDIR/)
    } finally {
      fs.rmSync(stagingPath, { recursive: true, force: true })
    }

    // Byte-for-byte unchanged and still resolving: the live registry was never opened for writing.
    expect(fs.readFileSync(filePath, "utf-8")).toBe(before)
    expect(fs.readdirSync(dir)).toEqual(["registry.json"])
    const served = (await store.read()).registry
    expect(classifyMailAddress(served, ensured.sourceAlias!).ok).toBe(true)
    expect(classifyMailKey(served, ensured.registry.sourceGrants[0]!.keyId).status).toBe("current")
  })

  it("refuses to publish on top of a structurally broken registry", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-regression-"))
    const filePath = path.join(dir, "registry.json")
    const store = new FileMailRegistryStore(filePath, "ouro.bot")
    await store.ensureMailbox({ agentId: "slugger", ownerEmail: "ari@mendelow.me", source: "hey" })

    // What a partial repair leaves behind: the delegated grant outlives its owning mailbox.
    const broken = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { mailboxes: unknown[] }
    broken.mailboxes = []
    const beforeNextPublish = `${JSON.stringify(broken, null, 2)}\n`
    fs.writeFileSync(filePath, beforeNextPublish, "utf-8")

    // Publishing anything else would quietly cement the drift, so the gate fails closed.
    await expect(store.ensureMailbox({ agentId: "clio" })).rejects.toThrow("mailroom registry is not publishable")
    await expect(store.rotateKeys({ agentId: "clio" }))
      .rejects.toThrow("No mailroom compartments matched agent clio for key rotation")
    expect(fs.readFileSync(filePath, "utf-8")).toBe(beforeNextPublish)
  })
})

