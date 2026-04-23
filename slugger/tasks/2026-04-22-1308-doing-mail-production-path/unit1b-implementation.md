# Unit 1b Implementation Evidence

Date: 2026-04-22

## Scope

Implemented the two-lane mail provenance contract in both repos:

- `ouro-work-substrate`: shared `@ouro/work-protocol` mail provenance descriptor.
- `ouroboros` harness worktree: matching mailroom descriptor, native outbound authority fields, access-log provenance, screener attention summaries, and Ouro Outlook source/outbound/access projections.

The implementation keeps the two product lanes explicit:

- native agent mailbox: `agent-native-mailbox`, native compartment, no owner/source, no send-as-human authority.
- delegated human mailbox: `delegated-human-mailbox`, delegated compartment, owner/source provenance, no send-as-human authority.

## Notes

- The harness red test in `src/__tests__/mailroom/core.test.ts` used the async harness `buildStoredMailMessage` helper synchronously. Once `describeMailProvenance` existed, that test passed `undefined` into the descriptor. The test was corrected to await the existing helper without changing the expected product contract.
- Legacy records are covered: delegated messages/access entries with missing owner/source render as unknown-owner/source rather than collapsing into native mail, and old outbound records without the new provenance fields render as native agent mail.
- Outlook source folders preserve the prior simple `source:<source>` shape when only one owner exists for a source, and split to `source:<source>:<owner>` when multiple humans share a provider source.

## Verification

Substrate:

- `npx vitest run packages/work-protocol/src/__tests__/mail.test.ts`
  - 1 file passed, 13 tests passed.
- `npm run build`
  - all workspace builds passed.
- `npm run test:coverage`
  - 15 files passed, 87 tests passed.
  - Statements: 100%; Branches: 100%; Functions: 100%; Lines: 100%.

Harness:

- `npx vitest run src/__tests__/mailroom/core.test.ts src/__tests__/mailroom/tools-mail.test.ts src/__tests__/mailroom/attention.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/heart/outlook/outlook-mail.test.ts`
  - 5 files passed, 37 tests passed.
- `npx tsc --noEmit`
  - passed.
- `npm run test:coverage -- --run src/__tests__/mailroom/core.test.ts src/__tests__/mailroom/tools-mail.test.ts src/__tests__/mailroom/attention.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/heart/outlook/outlook-mail.test.ts`
  - 481 files passed, 9137 tests passed, 33 skipped.
  - Statements: 100%; Branches: 100%; Functions: 100%; Lines: 100%.
  - Nerves audit: pass.
  - Coverage gate: pass.

## Remaining For Unit 1c

- Decide and implement the durable cross-repo drift gate: consumed package boundary for `@ouro/work-protocol` or generated/schema contract tests.
- Refactor any duplicate vocabulary between substrate and harness once the boundary is chosen.
