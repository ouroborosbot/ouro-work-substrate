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
const createAcsSenderUsernameProvisionerMock = vi.hoisted(() => vi.fn(() => ({ ensureSenderUsername: vi.fn() })))

vi.mock("../server", () => ({
  startMailControlServer: startMailControlServerMock,
}))

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: blobServiceClientMock,
}))

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: defaultAzureCredentialMock,
}))

vi.mock("../sender-usernames", () => ({
  createAcsSenderUsernameProvisioner: createAcsSenderUsernameProvisionerMock,
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
  createAcsSenderUsernameProvisionerMock.mockClear()
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
      "--outbound-acs-subscription-id", "00000000-0000-0000-0000-000000000000",
      "--outbound-acs-resource-group", "rg-ouro-work-substrate",
      "--outbound-acs-email-service", "ouro-prod-email",
    ])

    expect(defaultAzureCredentialMock).toHaveBeenCalledWith({ managedIdentityClientId: "mi-client-id" })
    expect(blobServiceClientMock).toHaveBeenCalledTimes(1)
    expect(getContainerClientMock).toHaveBeenCalledWith("mailroom")
    expect(createAcsSenderUsernameProvisionerMock).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "rg-ouro-work-substrate",
      emailServiceName: "ouro-prod-email",
      domainName: "ouro.bot",
      managedIdentityClientId: "mi-client-id",
    }))
    const options = startMailControlServerMock.mock.calls[0]![0] as { outboundEvents?: unknown; blobStore?: unknown }
    expect(options.outboundEvents).toEqual(expect.objectContaining({
      recordDeliveryEvent: expect.any(Function),
    }))
    expect(options.blobStore).toEqual(expect.objectContaining({
      kind: "azure-blob",
      container: "mailroom",
    }))
    expect(options).toEqual(expect.objectContaining({
      outboundSenderProvisioner: expect.objectContaining({
        ensureSenderUsername: expect.any(Function),
      }),
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
    expect(options).not.toHaveProperty("outboundSenderProvisioner")
  })
})
