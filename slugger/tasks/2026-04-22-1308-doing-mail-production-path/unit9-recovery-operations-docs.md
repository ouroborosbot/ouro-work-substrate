# Unit 9 Recovery, Operations, And Docs

Completed: 2026-04-23 03:22 PDT

## Scope

Unit 9 turned the production mail failure map into checked runbooks and doctor/status behavior across both repositories.

The guiding model stayed strict:

- Native agent mail and Ari delegated HEY mail remain separate operational lanes.
- Vault items are generic agent-owned secret records with notes for human/agent orientation only.
- Workflow bindings, not vault item notes, carry structured machine meaning.
- Recovery evidence must be body-safe and must not print provider keys, TLS private keys, raw MIME, message bodies, private mail keys, or vault unlock material.

## Substrate Changes

- Added `docs/mail-recovery-runbook.md`.
  - Covers DNS/MX drift, port 25 or STARTTLS failure, hosted registry/vault key drift, Blob reader or decryption failure, wrong mailbox provenance, HEY export/backfill stale state, HEY forwarding missing or lossy state, delivery event missing, autonomy kill switch state, and discarded/quarantined recovery.
  - Splits agent-runnable work from human-required gates.
  - Names body-safe evidence and unsafe evidence explicitly.
  - Points to production surfaces including DNS bindings, GitHub Actions deploys, Azure Container Apps revisions, `/health`, Mail Control ensure calls, `ouro account ensure`, `ouro connect mail`, `ouro mail import-mbox`, mail tools, Outlook, Event Grid, ACS, and the autonomy policy.
- Updated `docs/operations.md` to link the recovery runbook as the mail recovery entry point.
- Added `scripts/__tests__/mail-recovery-runbook.contract.test.ts` so the recovery guide cannot silently lose the failure map, safety language, or real production surfaces.

## Harness Changes

- Added `docs/agent-mail-recovery.md`.
  - Harness-facing recovery guide for setup/runtime operators.
  - Records current production proof as of April 23, 2026: `ouro.bot` MX points at `mx1.ouro.bot`, `mx1.ouro.bot:25` reaches hosted Mail Ingress, Mail Control can ensure Slugger native and delegated aliases, encrypted Blob storage is used, and ACS/Event Grid is the outbound provider lane.
  - Keeps HEY forwarding/backfill browser/MFA steps in the Slugger-managed lane, with human-required gates only where provider UI/MFA or human mailbox action is unavoidable.
- Updated `docs/agent-mail-setup.md`.
  - Removed stale April 21 proof language that said production port 25 was unproven.
  - Clarified that DNS/provider changes remain human-confirmed, while verification/dry-run and repair can be agent-run.
  - Linked the new recovery guide.
- Extended `src/heart/daemon/doctor.ts`.
  - Enabled Mail sense checks now read the owning agent runtime config.
  - Fail if runtime config is unavailable.
  - Fail if `mailroom.mailboxAddress` is missing.
  - Fail if `mailroom.privateKeys` has no non-empty string value.
  - Fail if hosted mode is configured without `mailroom.azureAccountUrl`.
  - Pass detail reports mailbox address, hosted Blob reader location or local Mailroom, autonomy enabled/disabled, and kill switch on/off without printing secrets.
- Extended harness tests.
  - `src/__tests__/docs/agent-mail-setup.contract.test.ts` guards the new recovery link/current proof language and prevents stale "do not publish MX" language from returning.
  - `src/__tests__/heart/daemon/doctor.test.ts` covers runtime-unavailable, missing hosted Blob fields, missing mailbox identity, hosted pass, local pass, autonomy, and kill-switch branches.

## Verification

Substrate:

- `npx vitest run scripts/__tests__/mail-recovery-runbook.contract.test.ts`
  - 2 tests passed.
- `npm run build`
  - passed.
- `npm run test:coverage`
  - 19 files passed.
  - 121 tests passed.
  - 100% statements, branches, functions, and lines.

Harness:

- `npm test -- --run src/__tests__/docs/agent-mail-setup.contract.test.ts`
  - 7 tests passed.
- `npm test -- --run src/__tests__/heart/daemon/doctor.test.ts -t "Mail config"`
  - 5 tests passed.
- `npm test -- --run src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/heart/daemon/doctor.test.ts`
  - 70 tests passed.
- `npm run build`
  - passed.
- `npm run test:coverage`
  - 486 test files passed.
  - 9,198 tests passed, 33 skipped.
  - 100% statements, branches, functions, and lines.
  - Nerves audit passed.
  - Coverage gate passed at `/var/folders/md/_fkq3wc92_z55cgtlrfrcfh40000gn/T/ouroboros-test-runs/ouroboros-agent-harness/cwd-1b9271972c26/2026-04-23T10-17-02-954Z/coverage-gate-summary.json`.

## Notes For Unit 10

- Unit 9 docs are ready to use as the recovery checklist during live smoke.
- The doctor now catches the main harness-side Mail configuration drifts before Slugger tries to read/send mail.
- Unit 10 should prove live native receive, delegated HEY backfill/forwarding, outbound ACS submission/events, Outlook audit visibility, and deployment/release state using body-safe evidence.
