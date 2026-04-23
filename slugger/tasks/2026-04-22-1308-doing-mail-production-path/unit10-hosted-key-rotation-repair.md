# Unit 10 Hosted Key Rotation Repair

Started: 2026-04-23 04:36 PDT

## Why This Exists

Live hosted setup exposed a recovery gap before the final mail smoke could proceed.

`ouro account ensure --agent slugger --owner-email ari@mendelow.me --source hey` correctly called hosted Mail Control, but the hosted registry already referenced public mail key ids whose matching private keys were not present in Slugger's vault runtime config.

The harness failed before writing partial config:

```text
hosted Mail Control references private mail key mail_slugger-native_6e4d749b49ae4bb9, but it was not returned and is not present in slugger's vault runtime/config. Repair requires a fresh Mail Control one-time key response or key rotation.
```

That detection was good. The missing production piece was a safe way for hosted Mail Control to rotate future mailbox/source public keys and return fresh one-time private keys for the owning agent vault.

## Invariant

- Mail Control stores public registry records only.
- Mail Control returns newly generated private keys exactly once.
- Private mail keys live in the owning agent vault runtime config.
- Rotation repairs future mail access.
- Rotation cannot decrypt mail already encrypted to a lost private key.
- Native `slugger@ouro.bot` and delegated `me.mendelow.ari.slugger@ouro.bot` keys may be rotated independently.

## Substrate Patch

Branch: `slugger/hosted-mail-key-rotation-repair`

Commits so far:

- `28b88fd test(mail): cover hosted key rotation recovery`
- `cf832ea feat(mail): add hosted key rotation recovery`
- `a9dd828 test(mail): cover rotation store failures`
- `c0459bf test(mail): cover hosted rotation edge cases`

Implemented:

- Shared protocol helper `rotatePublicMailboxRegistryKeys`.
- `MailRegistryStore.rotateMailboxKeys` with file and Azure store implementations.
- Mail Control `POST /v1/mailboxes/rotate-keys`.
- Admin-token protection matching ensure.
- Request flags `rotateMailbox`, `rotateSourceGrant`, optional `reason`.
- Response shape with public records plus one-time `generatedPrivateKeys`.
- Body-safe logs for `mailbox_keys_rotated`.
- Operations and recovery docs naming the endpoint and the lost-prior-mail limitation.

Verification:

```text
npm run ci:local
20 files passed
128 tests passed
100% statements / branches / functions / lines
infra:check passed
```

## Harness Patch

Branch: `slugger/hosted-mail-key-rotation-repair`

Commits so far:

- `f7626a8b test(mail): cover hosted key rotation repair`
- `255d8b61 feat(mail): rotate missing hosted mail keys`
- `8e25ba60 test(mail): cover hosted rotation recovery branches`
- `82ac816c chore(release): bump harness to alpha.471`

Implemented:

- `--rotate-missing-mail-keys` on `ouro account ensure` and `ouro connect mail`.
- Hosted setup now detects missing mailbox/source key ids after Mail Control ensure.
- With the explicit flag, harness calls `/v1/mailboxes/rotate-keys` and stores only the fresh one-time keys returned by Mail Control.
- Without the flag, harness fails with actor-runnable recovery guidance and does not write partial runtime config.
- Docs teach the flag and warn that lost prior private keys cannot decrypt already-stored mail.
- Release metadata bumped to `0.1.0-alpha.471` for npm publish/install.

Verification:

```text
npx vitest run src/__tests__/heart/daemon/provider-cli-commands.test.ts --testNamePattern "hosted Mail Control|connect mail"
7 tests passed

npm run test:coverage
486 test files passed
9201 tests passed, 33 skipped
100% statements / branches / functions / lines
Nerves audit passed

npm run release:preflight
release preflight: pass

npm run test:e2e:package
ouro from ouro.bot-cli-0.1.0-alpha.471.tgz verified at 0.1.0-alpha.471
```

## Next Steps

1. Push both branches and open PRs.
2. Merge/deploy substrate first so the hosted rotation endpoint exists in production.
3. Merge/publish/install harness `0.1.0-alpha.471`.
4. Run:

```text
ouro account ensure --agent slugger --owner-email ari@mendelow.me --source hey --rotate-missing-mail-keys
```

5. Verify Slugger runtime config has hosted Blob coordinates, native and delegated aliases, and fresh private key ids without printing private key material.
6. Resume live smoke: native inbound, delegated HEY backfill/forwarding, outbound provider/events, and Outlook audit.

