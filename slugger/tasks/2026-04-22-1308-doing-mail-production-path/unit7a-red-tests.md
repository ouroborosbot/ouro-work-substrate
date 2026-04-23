# Unit 7a - Outbound Provider And Events Red Tests

Date: 2026-04-23

## Orientation

Unit 7 is the outbound production provider lane. Unit 6 proved native-agent send authority and autonomy policy; it deliberately did not prove provider submission or final delivery.

The red tests were shaped from the current Microsoft ACS Email docs:

- ACS REST `Send` queues the message and returns an operation to poll; API acceptance is not final recipient delivery.
- ACS `Get Send Result` reports operation status such as `Running`, `Succeeded`, or `Failed`.
- ACS Event Grid `Microsoft.Communication.EmailDeliveryReportReceived` events report delivery outcomes including `Delivered`, `Suppressed`, `Bounced`, `Quarantined`, `FilteredSpam`, and `Failed`.

The production model we are testing toward:

- a provider submission creates a provider/operation id and moves the draft to `submitted`;
- `submitted` is not `delivered`;
- delivery/bounce/suppression/quarantine/spam-filtered/failure outcomes arrive later as provider events;
- provider events are idempotent by provider event id;
- operational event records are body-safe;
- provider credentials remain runtime/binding concerns, not special vault credential kinds.

## Red Tests Added

Substrate:

- `packages/work-protocol/src/__tests__/mail-outbound-events.test.ts`
  - expects shared helpers for provider submission, ACS Event Grid delivery report parsing, and idempotent delivery reconciliation;
  - expects canonical delivery outcomes for `Delivered`, `Suppressed`, `Bounced`, `Quarantined`, `FilteredSpam`, and `Failed`;
  - expects provider acceptance to produce `submitted`, not final delivery.
- `apps/mail-control/src/__tests__/server.test.ts`
  - expects `/v1/outbound/events/azure-communication-services` to support Event Grid subscription validation;
  - expects the same route to accept ACS delivery reports and hand a body-safe canonical event to an outbound event sink.

Harness:

- `src/__tests__/mailroom/outbound.test.ts`
  - expects confirmed ACS sends to use an injected provider client, persist provider ids, and remain `submitted`;
  - expects later ACS delivery events to reconcile stored outbound records idempotently.

## Red Verification

Substrate command:

```bash
npx vitest run packages/work-protocol/src/__tests__/mail-outbound-events.test.ts apps/mail-control/src/__tests__/server.test.ts
```

Result: red as expected. 2 test files failed. `mail-outbound-events.test.ts` failed because `buildMailProviderSubmission` and `parseAcsEmailDeliveryReportEvent` do not exist yet. Mail Control failed because the outbound Event Grid webhook route returns `404`.

Harness command:

```bash
npx vitest run src/__tests__/mailroom/outbound.test.ts
```

Result: red as expected. The new ACS submission test failed at the current guard:

```text
Azure Communication Services outbound send is configured but not enabled on this machine; human-required setup is still needed
```

## Implementation Notes For Unit 7b

The next slice should not make ACS semantics leak into the vault model.

Expected implementation shape:

- shared protocol adds provider/outcome types, provider submission helper, ACS delivery-report parser, and idempotent reconciliation helper;
- harness outbound accepts a provider client/adapter for ACS and records `submitted` with provider ids before final delivery events arrive;
- local-sink remains local proof behavior and may keep its existing `sent` compatibility path until UI/status migration is complete;
- Mail Control exposes an authenticated or Event Grid-compatible webhook endpoint for ACS delivery reports and validates Event Grid subscription handshakes;
- event logs and webhook sink payloads must not include raw message bodies, MIME, or secret material.

## Sources Consulted

- Microsoft Learn: Azure Communication Services Email REST API, API version `2025-09-01`.
- Microsoft Learn: Azure Communication Services Email delivery Event Grid events, last updated 2026-03-27.
