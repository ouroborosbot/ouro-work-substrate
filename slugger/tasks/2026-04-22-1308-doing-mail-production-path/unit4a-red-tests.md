# Unit 4a - Production SMTP Edge Red Tests

Date: 2026-04-22

## Scope

Added failing mail-ingress tests for production SMTP edge behavior before implementation.

## New Red Tests

File: `apps/mail-ingress/src/__tests__/server.test.ts`

- `advertises STARTTLS and SIZE without AUTH for production ingress`
  - Expects configured TLS material to make EHLO advertise `STARTTLS`.
  - Expects EHLO to advertise the configured `SIZE` limit.
  - Expects `AUTH` to remain unavailable.

- `rejects declared oversized messages before DATA`
  - Expects `MAIL FROM ... SIZE=<too large>` to fail with `552` before the message body is sent.

- `enforces recipient count limits per transaction`
  - Expects a configured recipient limit to reject the third accepted recipient with `452`.

- `does not leak mail body text through SMTP errors or logs`
  - Expects transient DATA/store failures to return a generic `451`.
  - Expects SMTP transcript and process logs not to contain body text from the failed message.

## Red Evidence

Command:

```sh
npx vitest run apps/mail-ingress/src/__tests__/server.test.ts
```

Result:

- 13 tests total.
- 9 passed.
- 4 failed, as expected.
- Failure causes:
  - STARTTLS and SIZE are not currently advertised.
  - Oversized declared `MAIL FROM SIZE` is accepted.
  - Recipient limit is ignored.
  - DATA failure currently returns/logs the raw store error, including body-derived text.

Saved log:

- `unit4a-substrate-red.log`
