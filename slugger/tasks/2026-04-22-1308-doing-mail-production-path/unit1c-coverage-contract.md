# Unit 1c: Two-Lane Mail Contract Coverage And Refactor

## Summary

Unit 1c turned the two-lane mail vocabulary into a machine-readable contract so the harness and hosted substrate cannot quietly drift while `@ouro/work-protocol` remains a private package.

The canonical contract lives in substrate:

- `packages/work-protocol/contracts/mail-provenance.v1.json`

The harness carries a vendored copy while substrate is not published as an installable package:

- `src/mailroom/contracts/work-protocol-mail-provenance.v1.json`

Harness tests validate both:

- the harness implementation matches the vendored contract;
- when a local `ouro-work-substrate` checkout is present, the vendored copy exactly matches the canonical substrate contract.

## Commits

- Substrate: `ecf8c2600022b0970c023db25c374a148cb5fae3` (`test(mail): Unit 1c - provenance contract fixture`)
- Harness: `c6695f63641cd42504592b0e5a2f7c04f87a2767` (`test(mail): Unit 1c - work protocol contract gate`)

## Verification

Substrate focused contract test:

```text
npx vitest run packages/work-protocol/src/__tests__/mail.test.ts
1 file passed, 14 tests passed
```

Harness focused contract/tool tests:

```text
npx vitest run src/__tests__/mailroom/work-protocol-contract.test.ts src/__tests__/mailroom/core.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts
3 files passed, 13 tests passed
```

Harness compile:

```text
npx tsc --noEmit
passed
```

Substrate coverage:

```text
npm run test:coverage
15 files passed, 88 tests passed
100% statements, branches, functions, and lines
```

Harness focused coverage gate:

```text
npm run test:coverage -- --run src/__tests__/mailroom/work-protocol-contract.test.ts src/__tests__/mailroom/core.test.ts src/__tests__/mailroom/tools-mail.test.ts src/__tests__/mailroom/attention.test.ts src/__tests__/mailroom/outbound.test.ts src/__tests__/heart/outlook/outlook-mail.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts
482 files passed, 9139 tests passed, 33 skipped
100% statements, branches, functions, and lines
nerves audit pass
```

## Notes

This intentionally does not publish `@ouro/work-protocol` yet. For the current production lane, the hosted services deploy through Azure container images and the shared substrate package remains private. The production-grade guard for this slice is the canonical JSON contract plus harness comparison test; publishing can be revisited when there is a real package consumer boundary to support.
