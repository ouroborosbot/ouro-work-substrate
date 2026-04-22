import * as crypto from "node:crypto"

export interface VaultSetupResult {
  success: boolean
  email: string
  serverUrl: string
  error?: string
}

export interface VaultRegistrationPayload {
  name: string
  email: string
  masterPasswordHash: string
  masterPasswordHint: null
  key: string
  kdf: 0
  kdfIterations: number
  keys: {
    publicKey: string
    encryptedPrivateKey: string
  }
}

export function deriveMasterKey(password: string, email: string, iterations: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, email.toLowerCase(), iterations, 32, "sha256", (err, key) => {
      /* v8 ignore next -- core crypto callback failures are not practically inducible here. */
      if (err) reject(err)
      else resolve(key)
    })
  })
}

export function deriveMasterPasswordHash(masterKey: Buffer, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(masterKey, password, 1, 32, "sha256", (err, hash) => {
      /* v8 ignore next -- core crypto callback failures are not practically inducible here. */
      if (err) reject(err)
      else resolve(hash.toString("base64"))
    })
  })
}

function hkdfExpandOnly(prk: Buffer, info: string, length: number): Buffer {
  const hashLen = 32
  const n = Math.ceil(length / hashLen)
  let okm = Buffer.alloc(0)
  let t = Buffer.alloc(0)
  for (let i = 1; i <= n; i += 1) {
    t = crypto.createHmac("sha256", prk)
      .update(Buffer.concat([t, Buffer.from(info, "utf8"), Buffer.from([i])]))
      .digest()
    okm = Buffer.concat([okm, t])
  }
  return okm.subarray(0, length)
}

export function deriveStretchedMasterKey(masterKey: Buffer): Buffer {
  return Buffer.concat([
    hkdfExpandOnly(masterKey, "enc", 32),
    hkdfExpandOnly(masterKey, "mac", 32),
  ])
}

function encryptWithStretchedKey(data: Buffer, stretchedKey: Buffer): string {
  const encKey = stretchedKey.subarray(0, 32)
  const macKey = stretchedKey.subarray(32, 64)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", encKey, iv)
  const ct = Buffer.concat([cipher.update(data), cipher.final()])
  const mac = crypto.createHmac("sha256", macKey).update(iv).update(ct).digest()
  return `2.${iv.toString("base64")}|${ct.toString("base64")}|${mac.toString("base64")}`
}

function generateRsaKeypair(): { publicKeyB64: string; privateKeyDer: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  })
  return {
    publicKeyB64: (publicKey as Buffer).toString("base64"),
    privateKeyDer: privateKey as Buffer,
  }
}

const KDF_PBKDF2 = 0
const KDF_ITERATIONS = 600000
const REGISTER_ACCOUNT_PATH = "/identity/accounts/register"

export async function buildVaultRegistrationPayload(input: {
  agentName: string
  email: string
  masterPassword: string
}): Promise<VaultRegistrationPayload> {
  const masterKey = await deriveMasterKey(input.masterPassword, input.email, KDF_ITERATIONS)
  const masterPasswordHash = await deriveMasterPasswordHash(masterKey, input.masterPassword)
  const stretchedKey = deriveStretchedMasterKey(masterKey)
  const symKey = crypto.randomBytes(64)
  const protectedSymKey = encryptWithStretchedKey(symKey, stretchedKey)
  const { publicKeyB64, privateKeyDer } = generateRsaKeypair()
  const encryptedPrivateKey = encryptWithStretchedKey(privateKeyDer, symKey)
  return {
    name: input.agentName,
    email: input.email,
    masterPasswordHash,
    masterPasswordHint: null,
    key: protectedSymKey,
    kdf: KDF_PBKDF2,
    kdfIterations: KDF_ITERATIONS,
    keys: {
      publicKey: publicKeyB64,
      encryptedPrivateKey,
    },
  }
}

export async function createVaultAccount(input: {
  agentName: string
  serverUrl: string
  email: string
  masterPassword: string
  fetchImpl?: typeof fetch
}): Promise<VaultSetupResult> {
  const fetcher = input.fetchImpl ?? fetch
  const registrationUrl = `${input.serverUrl.replace(/\/+$/, "")}${REGISTER_ACCOUNT_PATH}`
  try {
    const payload = await buildVaultRegistrationPayload({
      agentName: input.agentName,
      email: input.email,
      masterPassword: input.masterPassword,
    })
    const res = await fetcher(registrationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let errorDetail: string
      try {
        const body = await res.json() as { message?: string }
        errorDetail = body.message ?? `HTTP ${res.status} ${res.statusText}`
      } catch {
        errorDetail = `HTTP ${res.status} ${res.statusText}`
      }
      return {
        success: false,
        email: input.email,
        serverUrl: input.serverUrl,
        error: `${errorDetail} from ${registrationUrl}. Check vault server identity API.`,
      }
    }

    return { success: true, email: input.email, serverUrl: input.serverUrl }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      email: input.email,
      serverUrl: input.serverUrl,
      error: `cannot reach vault registration endpoint ${registrationUrl}: ${reason}`,
    }
  }
}
