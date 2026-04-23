# Unit 6b Implementation: Native Agent Mail Autonomy

Date: 2026-04-23

## What Landed

### Shared protocol (`@ouro/work-protocol`)

- Added native mail autonomy policy and decision contracts:
  - `MailAutonomyPolicy`
  - `MailAutonomyDecision`
  - `MailSendMode`
  - outbound audit fields on `MailOutboundRecord`
- Added pure helpers:
  - `buildNativeMailAutonomyPolicy(...)`
  - `evaluateNativeMailSendPolicy(...)`
  - `buildConfirmedMailSendDecision(...)`
- The evaluator now enforces:
  - native-agent mailbox only;
  - no delegated send-as-human path;
  - explicit allowlist/domain model;
  - confirmation fallback for new/risky recipients;
  - kill switch fallback to explicit confirmation;
  - autonomous rate limits;
  - per-message recipient limits.

### Harness

- Added `src/mailroom/autonomy.ts` to mirror the shared policy/evaluator semantics.
- Updated `mailroom/outbound.ts` so `mail_send` can:
  - require a configured native autonomy policy for autonomous sends;
  - send autonomously when the policy allows;
  - record `sendMode` plus `policyDecision`;
  - keep confirmed sends explicit and audited;
  - include `sendMode` and `policyId` in local-sink proof output.
- Updated `mailroom/reader.ts` so `runtime/config.mailroom.autonomousSendPolicy` is preserved in runtime parsing.
- Updated `repertoire/tools-mail.ts` so `mail_send`:
  - no longer demands `confirmation` for autonomous attempts;
  - passes the parsed autonomy policy through;
  - reports the resulting send mode.
- Updated `docs/agent-mail-setup.md` to teach the guarded model instead of the old “autonomous is simply refused” story.

## Verification

### Substrate

```sh
npx vitest run packages/work-protocol/src/__tests__/mail.test.ts packages/work-protocol/src/__tests__/mail-autonomy.test.ts
npm run build
```

Result:

- `2` test files passed
- `18` tests passed
- workspace TypeScript build passed for `work-protocol`, `mail-control`, `mail-ingress`, and `vault-control`

### Harness

```sh
npx vitest run src/__tests__/mailroom/autonomy.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/mailroom/reader.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/mailroom/attention.test.ts src/__tests__/mailroom/tools-mail.test.ts
npx tsc --noEmit
```

Result:

- `6` focused test files passed
- `37` focused tests passed
- TypeScript compile passed

## Notes

- This slice still uses local-sink proof for outbound transport. Provider submission, provider message ids, and delivery/bounce event reconciliation remain the next unit.
- The receive-side proof now explicitly keeps native known-sender Imbox quiet while unknown native mail still surfaces through body-safe Screener attention.
