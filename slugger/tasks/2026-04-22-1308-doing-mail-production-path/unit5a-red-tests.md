# Unit 5a Red Tests: Delegated HEY Source

## Scope

Unit 5a locks the delegated HEY source behavior before implementation:

- MBOX backfill must be historical archive import, not fresh live mail.
- Imported records need explicit ingest provenance and `sourceFreshThrough` metadata.
- Archive import must suppress Screener/attention wakeups even when the source is temporarily screened.
- Live forwarded delegated mail remains SMTP/live provenance and keeps owner/source labels.
- HEY forwarding setup must be a resumable source-state workflow where Slugger drives browser automation and asks the human only for browser auth/MFA/export/confirmation.
- Wrong-lane forwarding to `slugger@ouro.bot` must be recoverable and must not be labeled as Ari's delegated HEY source.

## Red Evidence

Substrate focused red command:

```sh
npx vitest run packages/work-protocol/src/__tests__/mail.test.ts --testNamePattern "ingest provenance"
```

Expected red failure:

```text
expected undefined to deeply equal { schemaVersion: 1, kind: "mbox-import", ... }
```

Harness focused red command:

```sh
npx vitest run src/__tests__/mailroom/mbox-import.test.ts src/__tests__/mailroom/core.test.ts src/__tests__/mailroom/source-state.test.ts src/__tests__/docs/agent-mail-setup.contract.test.ts src/__tests__/heart/daemon/provider-cli-commands.test.ts --testNamePattern "archive freshness|historical imports|delegated mail source setup|HEY forwarding|imports delegated HEY mail"
```

Expected red failures:

```text
Cannot find module '../../mailroom/source-state'
expected HEY docs to contain Slugger-managed browser workflow and delegated alias recovery guidance
expected MBOX import result to contain sourceFreshThrough
expected CLI import output to report source fresh through and no Screener wakeups
```

## Notes

The tests intentionally do not automate HEY itself. They define the local state and recovery contracts that let Slugger later run browser automation safely, while preserving the human-at-keyboard gates for login, MFA/CAPTCHA, export download, and final forwarding confirmation.
