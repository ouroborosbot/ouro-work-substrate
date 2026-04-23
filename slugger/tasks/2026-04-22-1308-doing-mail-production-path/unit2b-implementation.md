# Unit 2b: Hosted Provisioning Truth Implementation

## Summary

Unit 2b made the Unit 2a hosted provisioning tests green.

Mail Control now returns enough public setup truth for the harness to be safe:

- public mailbox record;
- public delegated source-grant record when present;
- public registry coordinates plus revision;
- hosted Blob store coordinates;
- one-time generated private keys only in `generatedPrivateKeys`.

The harness now treats `runtime/config.workSubstrate.mode: "hosted"` as the production setup lane. It reads `workSubstrate.mailControl.url` plus bearer token, calls hosted Mail Control, merges returned private keys with existing vault-held keys, verifies every returned public key id is present, writes hosted Blob reader coordinates into `mailroom`, enables the Mail sense, and avoids writing a local registry for hosted setup.

Without hosted config, setup remains explicit local development and writes local registry/store paths with `mailroom.mode: "local"`.

## Commits

- Substrate: `a156e81cfbd2317b196cc1a9021a3bd1449fc9f6` (`feat(mail): Unit 2b - hosted control-plane response`)
- Harness: `ca57406fcda95e3b9417e02afc51d9bb1ffeec2c` (`feat(mail): Unit 2b - hosted Mail Control setup`)

## Verification

Substrate:

```text
npx vitest run apps/mail-control/src/__tests__/server.test.ts
1 file passed, 12 tests passed

npm run build
passed
```

Harness:

```text
npx vitest run src/__tests__/heart/daemon/provider-cli-commands.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts
2 files passed, 175 tests passed

npx tsc --noEmit
passed
```

## Follow-On Risks For Unit 2c

- Hosted Mail sense startup still needs explicit coverage for the no-local-registry path.
- Missing hosted config/token, Mail Control outage, malformed response, and one-time key loss need sharper repair tests.
- Coverage must prove all new hosted setup branches and Mail Control response branches.
