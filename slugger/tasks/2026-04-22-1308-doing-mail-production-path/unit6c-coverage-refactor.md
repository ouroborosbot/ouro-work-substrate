# Unit 6c - Native Agent Mail Autonomy Coverage And Refactor

Date: 2026-04-23

## Scope

Unit 6c closed coverage and small refactors for the native-agent autonomy slice introduced in Units 6a and 6b.

This unit verifies the safety gate around Slugger sending as `slugger@ouro.bot`:

- autonomous sends only proceed through an enabled native-agent policy;
- new or risky recipients fall back to `CONFIRM_SEND`;
- disabled policy and kill switch cannot send autonomously;
- recipient count and rate limits block before transport;
- delegated human mail cannot be used as a send-as-human authority;
- confirmed sends record explicit audit decisions;
- tool output exposes send mode without weakening the confirmation path.

Provider acceptance, final delivery, bounces, suppression lists, and webhook/event reconciliation remain the Unit 7 boundary. Unit 6c does not claim those live provider semantics are complete; Unit 7 starts with red tests for that lane.

## Changes

Substrate:

- Expanded `packages/work-protocol/src/__tests__/mail-autonomy.test.ts` to cover optional policy fields, normalization bounds, default clock behavior, recent autonomous-send history filtering, non-draft blocks, agent mismatch, native mailbox mismatch, disabled-policy fallback, and confirmed-decision audit helpers.

Harness:

- Expanded `src/__tests__/mailroom/autonomy.test.ts` to mirror the shared protocol edge coverage against the file-backed mailroom.
- Updated `src/__tests__/mailroom/local-proof.test.ts` for the stricter autonomous-send setup message.
- Added `src/__tests__/mailroom/tools-mail.test.ts` coverage for quarantine sender-policy output.
- Simplified `src/mailroom/autonomy.ts`, `src/mailroom/outbound.ts`, and `src/repertoire/tools-mail.ts` after coverage exposed now-unneeded fallbacks.

## Verification

Substrate focused coverage:

```bash
npx vitest run packages/work-protocol/src/__tests__/mail.test.ts packages/work-protocol/src/__tests__/mail-autonomy.test.ts --coverage.enabled true --coverage.include 'packages/work-protocol/src/mail.ts'
```

Result: 19 tests passed; `packages/work-protocol/src/mail.ts` reported 100% statements, branches, functions, and lines.

Substrate full local CI:

```bash
npm run ci:local
```

Result: pass. Workspace TypeScript build passed, 17 test files / 107 tests passed, coverage reported 100% statements, branches, functions, and lines, and Azure Bicep builds passed.

Harness focused coverage:

```bash
npx vitest run src/__tests__/mailroom/autonomy.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/mailroom/reader.test.ts src/__tests__/mailroom/tools-mail.test.ts --coverage.enabled true --coverage.include 'src/mailroom/autonomy.ts' --coverage.include 'src/mailroom/outbound.ts' --coverage.include 'src/mailroom/reader.ts' --coverage.include 'src/repertoire/tools-mail.ts'
```

Result: 27 tests passed; touched harness files reported 100% statements, branches, functions, and lines.

Harness local proof:

```bash
npx vitest run src/__tests__/mailroom/local-proof.test.ts
```

Result: 1 test passed.

Harness full coverage and audit:

```bash
npm run test:coverage
```

Result: pass. 485 test files passed, 9,184 tests passed, 33 skipped. Coverage reported 100% statements, branches, functions, and lines. Nerves audit passed and coverage gate passed.

## Notes For The Next Slice

The remaining outbound production risks are intentionally outside this unit:

- provider submission must return a provider message id without treating provider acceptance as final delivery;
- Event Grid/webhook delivery, bounce, suppression, quarantine, and spam-filtered events must reconcile idempotently;
- provider credentials must resolve from workflow binding/config without becoming a special vault credential type;
- sent-copy/audit records must stay body-safe in operational logs.

Those are Unit 7a/7b/7c, not hidden Unit 6c work.
