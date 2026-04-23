# Unit 7c: Outbound Provider And Events — Coverage And Refactor

## Scope

Closed coverage and refactor evidence for the Unit 7 provider/event slice across substrate and harness.

This unit keeps the boundary explicit:

- Provider acceptance is `submitted`, not final delivery.
- ACS/Event Grid delivery reports reconcile later into `accepted`, `delivered`, `bounced`, `suppressed`, `quarantined`, `spam-filtered`, or `failed`.
- Workflow bindings may reference generic vault items, but code must not infer credential meaning from vault notes.
- Event logs and sink payloads stay body-safe.

## Substrate Coverage Closed

Files:

- `packages/work-protocol/src/__tests__/mail-outbound-events.test.ts`
- `apps/mail-control/src/__tests__/server.test.ts`

Added coverage for:

- ACS `Expanded -> accepted` status mapping.
- ACS unknown, missing, malformed, and unsupported Event Grid payloads.
- Delivery event provider message id mismatch.
- Accepted/failed reconciliation timestamps.
- Reconciliation when `deliveryEvents` is absent.
- Event Grid webhook validation failures.
- Non-array notification bodies.
- Irrelevant Event Grid event types accepted without sink calls.
- Missing outbound event sink returning a body-safe `503`.

Verification:

- `npm run ci:local`
- Result: pass.
- Tests: 18 files, 119 tests passed.
- Coverage: 100% statements, branches, functions, and lines.
- Infra validation: `az bicep build` for `infra/azure/main.bicep` and `infra/azure/registry.bicep` passed.

## Harness Coverage Closed

Files:

- `src/__tests__/mailroom/outbound.test.ts`
- `src/__tests__/mailroom/tools-mail-provider-status.test.ts`

Added coverage for:

- ACS credential binding field normalization, including access-key-only, connection-string-only, blank fields, and no note parsing.
- Every ACS delivery status and malformed delivery report branch.
- Direct reconciliation mismatch and failed/accepted timestamp branches.
- ACS REST HMAC client edge cases:
  - `operation-location` id extraction.
  - id-only provider responses.
  - default `fetch` and default `now`.
  - provider error messages.
  - HTTP fallback errors.
  - missing operation ids.
- Sparse provider submission metadata falling back to local submit time.
- Unknown provider message reconciliation failure.
- `mail_send` user-facing output for submitted, provider-only, and unknown transport states.

Verification:

- Focused: `npm test -- --run src/__tests__/mailroom/outbound.test.ts src/__tests__/mailroom/tools-mail-provider-status.test.ts`
- Focused result: 2 files, 11 tests passed.
- Full: `npm run test:coverage`
- Full result: 486 files, 9,191 tests passed, 33 skipped.
- Coverage: 100% statements, branches, functions, and lines.
- Nerves audit: pass.
- Build/typecheck: covered by the coverage gate, including Outlook UI typecheck/test/build.

## Live Smoke Boundary

No real provider email was sent in this coverage/refactor unit. The provider client and event endpoint are locally proven with exact ACS request/event shapes, but live provider smoke belongs to the deploy/cutover unit because it requires deployed configuration, provider credentials, domain authentication records, and post-deploy event subscription proof.

The remaining live-production bar is still tracked by the top-level completion criteria and Unit 10.
