# Unit 8b Implementation: Outlook, Tools, And Audit Ergonomics

Date: 2026-04-23

Harness commit pushed:

- `b120cdec feat(mail): Unit 8b - outlook tools audit ergonomics`

## Implemented

- Outlook reader outbound records now expose autonomy and delivery audit fields:
  - `sendMode`
  - `policyDecision`
  - `providerRequestId`
  - `operationLocation`
  - `acceptedAt`
  - `failedAt`
  - `deliveryEvents`
- `mail_send` now reports native send authority plus policy decision/fallback.
- `mail_send` access log entries now carry native mailbox provenance.
- Outlook UI owner-scoped source folders now filter by both provider source and human owner.
- Outlook UI access audit now renders explicit native/delegated mailbox labels.
- Outlook UI outbound rows now show native send authority, autonomous/confirmed mode, policy decision, provider ids, and body-safe delivery summaries.

## Green Evidence

Command:

```bash
npm test -- --run src/__tests__/heart/outlook/outlook-mail.test.ts src/__tests__/mailroom/tools-mail.test.ts
```

Result:

- Passed.
- 2 test files passed.
- 24 tests passed.

Command:

```bash
npm --prefix packages/outlook-ui test -- --run src/components/tabs/live-refresh.test.tsx
```

Result:

- Passed.
- 1 test file passed.
- 14 tests passed.

Command:

```bash
npm run build
```

Result:

- Passed.
- Root TypeScript build passed.
- Root build also rebuilt and copied the Outlook UI bundle.

Command:

```bash
npm --prefix packages/outlook-ui run build
```

Result:

- Passed.
- Vite production build transformed 663 modules and wrote `dist/`.

## Safety Notes

- The API/UI surfaces carry body-safe delivery summaries, not outbound message body text.
- The implementation uses stored structured outbound/access fields. It does not infer credential meaning from notes or blur Slugger native mail with delegated HEY mail.
