# Unit 2c: Hosted Provisioning Coverage And Repair

**Recorded**: 2026-04-22 20:26 PDT

## Commits

- Substrate: `d3f5c961ebf0` (`refactor(mail): Unit 2c - mail control response coverage`)
- Harness: `c44414d72283` (`refactor(mail): Unit 2c - hosted repair coverage`)
- Harness: `97b02483d5d7` (`test(mail): Unit 2c - hosted failure edge coverage`)

## What Changed

- Mail Control now computes `publicRegistry` once and returns the `mailbox` property directly. This removes the uncovered optional-response branch while keeping the same successful response contract.
- Hosted harness setup/repair now has explicit coverage for missing Mail Control config, missing token, `adminToken` fallback, outage response-body errors, outage status-text fallback, malformed responses, required Blob text validation, one-time key drift, no-new-secret repair, and native-only repair.
- Hosted Mail sense can scan Azure Blob mail without starting the local SMTP ingress when the hosted reader has no local `registryPath`; local mode still requires `registryPath` and still starts local ingress.
- Tests assert malformed hosted responses do not write partial `mailroom` runtime config.
- Tests assert hosted repair copy distinguishes agent-runnable config repair from human-required secret/key recovery by naming the missing key and the one-time-key/rotation recovery path.
- Tests assert hosted setup stops before network calls when the runtime vault is locked.
- Tests assert hosted repair ignores stale/malformed local registry paths and strips them from the next hosted runtime config.
- Tests assert hosted Blob scan failures keep the mail sense alive without starting local SMTP ingress.

## Verification

- Substrate `npm run test:coverage`: passed; 15 files, 89 tests, 100% statements/branches/functions/lines.
- Harness `npx vitest run src/__tests__/heart/daemon/provider-cli-commands.test.ts -t "hosted"`: passed; 13 hosted tests, 168 skipped.
- Harness `npx vitest run src/__tests__/senses/mail.test.ts`: passed; 8 tests.
- Harness `npx tsc --noEmit`: passed.
- Harness `npm run test:coverage -- --run src/__tests__/heart/daemon/provider-cli-commands.test.ts src/__tests__/senses/mail.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts`: passed; 482 files, 9154 tests passed, 33 skipped, 100% statements/branches/functions/lines; nerves audit passed; coverage gate passed.

## Notes For Future Agents

- Hosted mode uses Mail Control as registry truth. Local registry files are deliberately not written in hosted setup.
- Generated private keys are one-time material. If Mail Control references a key id that is neither returned nor already present in the agent vault runtime config, the right recovery is a fresh one-time key response or key rotation, not guessing from Blob or logs.
- Hosted Blob mail reading is reader-only in the harness sense: it scans the hosted store and leaves SMTP ingress to the hosted substrate edge.
- The next production risk is Unit 3: DNS/certificate automation must consume explicit workflow bindings that reference ordinary vault item paths. Do not revive provider-shaped credential ontology there.
