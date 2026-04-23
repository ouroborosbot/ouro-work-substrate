# Unit 6a Red Tests: Native Agent Mail Autonomy

Date: 2026-04-23

## Scope

Unit 6a adds the failing test contract for native agent mail autonomy without implementing it yet.

The tests intentionally keep three boundaries explicit:

- native receive still uses Screener for unknown senders and Imbox for screened-in known senders;
- autonomous outbound is only for the agent-native mailbox, never delegated human mail or send-as-human;
- risky/new sends fall back to explicit confirmation, while kill switch, recipient limits, and rate limits block the autonomous lane before transport.

## Substrate Red Run

Command:

```sh
npx vitest run packages/work-protocol/src/__tests__/mail-autonomy.test.ts
```

Expected failure:

- `buildNativeMailAutonomyPolicy is not a function`
- all 3 new `mail-autonomy` tests fail because the shared protocol has no native autonomy policy/evaluator yet.

## Harness Red Run

Command:

```sh
npx vitest run src/__tests__/mailroom/autonomy.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/mailroom/reader.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/mailroom/attention.test.ts src/__tests__/mailroom/tools-mail.test.ts
```

Expected failures:

- `../../mailroom/autonomy` module is missing for the new autonomy tests and mail tool policy fixture.
- `mailroom/reader` drops `mailroom.autonomousSendPolicy`.
- `mailroom/outbound` still hard-refuses autonomous sends with the old disabled-only message.
- `docs/agent-mail-setup.md` still documents outbound as always confirmation-only/disabled instead of policy-governed native autonomy.

Useful passing proof inside the same run:

- the new receive-side attention test passes: unknown native mail queues Screener attention, and a sender-policy-known native sender lands quietly in Imbox without body leakage.
