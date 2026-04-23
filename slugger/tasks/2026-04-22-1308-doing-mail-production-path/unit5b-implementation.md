# Unit 5b Implementation: Delegated HEY Source

## What Changed

Substrate:

- `@ouro/work-protocol` now records `StoredMailMessage.ingest` as explicit public provenance.
- Default live messages use `{ schemaVersion: 1, kind: "smtp" }`.
- Historical archive records can use `{ kind: "mbox-import", importedAt, sourceFreshThrough, attentionSuppressed }`.
- Screener candidate creation now honors an explicit `classification.candidate = false`, which lets historical imports preserve placement without waking the agent.
- Mail ingress store input accepts optional ingest provenance and passes it through.

Harness:

- Mirrored ingest provenance in `src/mailroom/core.ts` and `src/mailroom/file-store.ts`.
- `importMboxToStore` parses MBOX message dates, sets imported messages' `receivedAt` to the original message date when present, computes `sourceFreshThrough`, writes `mbox-import` provenance, and suppresses Screener wakeups.
- `ouro mail import-mbox` reports `source fresh through` and states that archive import does not create Screener wakeups.
- Added `src/mailroom/source-state.ts` for resumable delegated source setup state: backfill status, forwarding status, browser-automation owner, human gates, verified/pending/wrong-alias probe outcomes, and recovery copy.
- Updated Agent Mail docs to make HEY browser work Slugger-managed, with human gates for login/MFA/CAPTCHA/export/confirmation and explicit wrong-target recovery.

## Verification

Substrate:

```sh
npx vitest run packages/work-protocol/src/__tests__/mail.test.ts --testNamePattern "ingest provenance"
npm run build
npx vitest run apps/mail-ingress/src/__tests__/store.test.ts apps/mail-ingress/src/__tests__/azure-store.test.ts
```

Harness:

```sh
npx vitest run src/__tests__/mailroom/mbox-import.test.ts src/__tests__/mailroom/core.test.ts src/__tests__/mailroom/source-state.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/heart/daemon/provider-cli-commands.test.ts --testNamePattern "archive freshness|historical imports|delegated mail source setup|HEY forwarding|imports delegated HEY mail"
npx vitest run src/__tests__/mailroom/core.test.ts --testNamePattern "provisions native"
npx vitest run src/__tests__/mailroom/mbox-import.test.ts src/__tests__/mailroom/core.test.ts src/__tests__/mailroom/source-state.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/heart/daemon/provider-cli-commands.test.ts src/__tests__/mailroom/local-proof.test.ts src/__tests__/mailroom/hey-golden-path.test.ts
npx tsc --noEmit
npm run build
```

## Notes

The source-state helper is intentionally local state, not a new public registry secret or a provider ontology. It describes how this delegated HEY workflow uses the already-created source alias and how Slugger should recover when HEY setup is blocked, pending, verified, or pointed at the wrong mailbox.
