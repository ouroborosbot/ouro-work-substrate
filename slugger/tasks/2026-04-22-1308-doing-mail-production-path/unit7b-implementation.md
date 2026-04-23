# Unit 7b - Outbound Provider And Events Implementation

Date: 2026-04-23

## What Changed

Substrate:

- Extended the shared mail protocol with outbound provider states:
  - `submitted`, `accepted`, `delivered`, `bounced`, `suppressed`, `quarantined`, `spam-filtered`, and `failed`.
- Added provider submission records with provider, provider message/operation id, operation location, request id, and `submittedAt`.
- Added ACS Event Grid delivery-report parsing for `Delivered`, `Suppressed`, `Bounced`, `Quarantined`, `FilteredSpam`, and `Failed`.
- Added idempotent delivery-event reconciliation by provider event id.
- Added Mail Control endpoint `/v1/outbound/events/azure-communication-services` for Event Grid subscription validation and body-safe ACS delivery notifications.
- Updated `docs/deployment-story.md` to keep packaging/deployment lanes clear:
  - harness changes package and publish through npm;
  - hosted service changes deploy as commit-tagged Azure images through GitHub Actions/Bicep;
  - live ACS domain auth, DNS records, webhook subscription, and smoke remain proof work.

Harness:

- Mirrored outbound provider/event types in the mailroom model.
- Added ACS transport non-secret binding fields:
  - `credentialItem`
  - `credentialFields`
- Blocked `credentialItemNoteQuery`, `noteQuery`, and `notes` for provider credential inference.
- Added `MailOutboundProviderClient` and ACS REST client creation with HMAC signing.
- `confirmMailDraftSend` can now submit through an injected ACS provider client and persist `submitted` records without claiming final delivery.
- Added idempotent delivery-event reconciliation into the mailroom store.
- Updated mail tool output to report submitted/sent status accurately.
- Updated Outlook outbound types and the mailbox Sent folder so submitted/delivered/bounced/etc. records remain visible.
- Updated `docs/agent-mail-setup.md` with provider state, event, and vault-item binding guidance.

## Verification

Substrate focused behavior:

```bash
npm run build
npx vitest run packages/work-protocol/src/__tests__/mail-outbound-events.test.ts apps/mail-control/src/__tests__/server.test.ts
```

Result: pass. Build passed for all workspaces. 2 focused test files / 21 tests passed.

Harness focused behavior:

```bash
npm run build
npx vitest run src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/mailroom/tools-mail.test.ts src/__tests__/heart/outlook/outlook-mail.test.ts
```

Result: pass. Build passed, including Outlook UI production build. 4 focused test files / 36 tests passed.

Harness full tests:

```bash
npm test
```

Result: pass. 485 test files passed, 9,187 tests passed, 33 skipped.

Substrate broad gate:

```bash
npm run ci:local
```

Result: expected coverage failure after behavior pass. 18 test files / 116 tests passed, then the global 100% coverage gate failed on new branches in:

- `apps/mail-control/src/server.ts`
- `packages/work-protocol/src/mail.ts`

That is the Unit 7c target. No behavior tests failed.

## Remaining Unit 7c Coverage Targets

- ACS parser validation failures: missing id, unsupported type, missing message id, unsupported status, fallback timestamps.
- Reconciliation mismatch and duplicate-event branches.
- Mail Control outbound event route:
  - Event Grid validation missing validation code;
  - body not an array;
  - missing outbound event sink;
  - notification with zero relevant delivery reports;
  - unsupported provider route behavior if added.
- Harness ACS client failure paths:
  - non-2xx response with body-safe error;
  - operation id from `operation-location` when response body omits `id`;
  - missing operation id.

## Production Notes

The new ACS client is production-capable at the adapter boundary but still needs live configuration before smoke:

- an ordinary vault item must hold the ACS access key;
- runtime/outbound binding must name the vault item and explicit secret field name;
- DNS/domain authentication records and ACS sender/domain verification must be applied and recorded;
- Event Grid subscription must point to the deployed Mail Control webhook;
- live smoke must prove submit, delivery event reconciliation, and bounce/suppression handling.
