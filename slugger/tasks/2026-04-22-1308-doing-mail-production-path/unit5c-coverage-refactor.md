# Unit 5c: Delegated HEY Source Coverage And Refactor

## Scope

Closed the delegated HEY source coverage gaps left by Unit 5b across substrate and harness without changing the two-lane product model:

- historical MBOX imports carry explicit ingest provenance through the hosted substrate store path;
- harness Mailroom ingest passes non-SMTP ingest metadata through to stored messages;
- `ouro mail import-mbox` reports `source fresh through: unknown` when an archive has no dated messages;
- delegated source setup state covers ready, pending, wrong-alias, blank-source, and no-message-id recovery branches;
- delegated source setup state emits body-safe Nerves events so the harness audit can see the new source file.

## Code Changes

Substrate:

- `apps/mail-ingress/src/__tests__/store.test.ts`
  - Added explicit MBOX ingest provenance to the delegated source store test.
  - Asserted the stored message preserves `kind`, `importedAt`, `sourceFreshThrough`, and `attentionSuppressed`.

Harness:

- `src/__tests__/mailroom/core.test.ts`
  - Added explicit ingest-provenance pass-through coverage for `ingestRawMailToStore`.
- `src/__tests__/heart/daemon/provider-cli-commands.test.ts`
  - Added an undated MBOX import case that verifies CLI freshness output falls back to `unknown`.
- `src/__tests__/mailroom/source-state.test.ts`
  - Covered forwarding-ready render copy, blank-source defaulting, and ready/wrong-alias probes without message ids.
- `src/mailroom/source-state.ts`
  - Added body-safe Nerves events for source-state creation, backfill completion, and forwarding probe results.
- `package.json`, `package-lock.json`, `packages/ouro.bot/package.json`, `changelog.json`
  - Bumped harness CLI/wrapper release lane to `0.1.0-alpha.469` and documented the delegated-source changes.

## Verification

Substrate:

- `npm run ci:local`
  - build: pass
  - Vitest: 16 files, 103 tests passed
  - coverage: 100% statements, 100% branches, 100% functions, 100% lines
  - `az bicep build` for `infra/azure/main.bicep` and `infra/azure/registry.bicep`: pass

Harness:

- `npx vitest run src/__tests__/mailroom/source-state.test.ts`
  - 4 tests passed
- `npx tsc --noEmit`
  - pass
- `npm run test:coverage`
  - 484 files, 9177 tests passed, 33 skipped
  - coverage: 100% statements, 100% branches, 100% functions, 100% lines
  - Nerves audit: pass
  - coverage gate: pass
- `npm run release:preflight`
  - `@ouro.bot/cli@0.1.0-alpha.469` not yet published
  - changelog gate: pass
  - wrapper package changed and local wrapper version is unpublished
  - release preflight: pass
- `npm run test:e2e:package`
  - package build: pass
  - packed `ouro` binary verified at `0.1.0-alpha.469`
  - packed `ouro` help smoke: pass

## Remaining External Gates

This unit does not claim live HEY export or live HEY forwarding has happened. Slugger still needs to run the browser-managed HEY flow later, with the human only handling login/MFA/CAPTCHA/export/download/forwarding-confirmation steps that cannot be automated safely.
