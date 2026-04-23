import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

const startMailControlServerMock = vi.hoisted(() => vi.fn(() => ({ close: vi.fn() })))
const getContainerClientMock = vi.hoisted(() => vi.fn(() => ({})))
const blobServiceClientMock = vi.hoisted(() => vi.fn(function BlobServiceClient(this: { getContainerClient: typeof getContainerClientMock }, _url: string, _credential: unknown) {
  this.getContainerClient = getContainerClientMock
}))
const defaultAzureCredentialMock = vi.hoisted(() => vi.fn(function DefaultAzureCredential() {}))

vi.mock("../server", () => ({
  startMailControlServer: startMailControlServerMock,
}))

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: blobServiceClientMock,
}))

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: defaultAzureCredentialMock,
}))

function tempToken(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-index-"))
  const file = path.join(dir, "token")
  fs.writeFileSync(file, "secret\n")
  return file
}

afterEach(() => {
  startMailControlServerMock.mockClear()
  getContainerClientMock.mockClear()
  blobServiceClientMock.mockClear()
  defaultAzureCredentialMock.mockClear()
})

describe("runMailControl", () => {
  it("wires the Azure Blob outbound event sink for hosted Mail Control", async () => {
    const { runMailControl } = await import("../index")
    const tokenFile = tempToken()

    runMailControl([
      "--azure-account-url", "https://ouro.blob.core.windows.net",
      "--azure-managed-identity-client-id", "mi-client-id",
      "--registry-container", "mailroom",
      "--registry-blob", "registry/mailroom.json",
      "--registry-domain", "ouro.bot",
      "--admin-token-file", tokenFile,
      "--allowed-email-domain", "ouro.bot",
    ])

    expect(defaultAzureCredentialMock).toHaveBeenCalledWith({ managedIdentityClientId: "mi-client-id" })
    expect(blobServiceClientMock).toHaveBeenCalledTimes(1)
    expect(getContainerClientMock).toHaveBeenCalledWith("mailroom")
    const options = startMailControlServerMock.mock.calls[0]![0] as { outboundEvents?: unknown; blobStore?: unknown }
    expect(options.outboundEvents).toEqual(expect.objectContaining({
      recordDeliveryEvent: expect.any(Function),
    }))
    expect(options.blobStore).toEqual(expect.objectContaining({
      kind: "azure-blob",
      container: "mailroom",
    }))
  })

  it("keeps local development Mail Control without a hosted outbound event sink", async () => {
    const { runMailControl } = await import("../index")
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-mail-control-index-local-"))

    runMailControl([
      "--store", path.join(dir, "registry.json"),
      "--allow-unauthenticated-local",
    ])

    const options = startMailControlServerMock.mock.calls[0]![0] as { outboundEvents?: unknown; blobStore?: unknown }
    expect(options.outboundEvents).toBeUndefined()
    expect(options.blobStore).toBeUndefined()
  })
})
