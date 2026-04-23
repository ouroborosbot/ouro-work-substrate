# Unit 5 Live HEY Proof

## Delegated HEY Feeder Proven

- Delegated alias: `me.mendelow.ari.slugger@ouro.bot`
- Source: `hey`
- Owner: `ari@mendelow.me`
- Proven live HEY account feeder: `arimendelow@hey.com`

Slugger used the delegated alias to complete HEY forwarding confirmation and then verified a live mirrored message landed only in the delegated lane, not Slugger's native mailbox.

Body-safe live proof:

- Forwarding confirmation mail id: `mail_710819521c7ec1bd4bcd7c461c6d6c6a`
- Mirrored proof mail id: `mail_faae211065f9642cb67bedcd5161a1b5`
- Folder: `imbox`
- Provenance: `delegated:ari@mendelow.me:hey`
- Proof subject: `Slugger HEY mirror proof 2026-04-23T1628Z`

## Hosted HEY Archive Import Proven

Real HEY export downloaded from browser-authenticated session:

- File: `/Users/arimendelow/Downloads/HEY-emails-arimendelow@hey.com.mbox`
- Size: `2598320875` bytes
- Archive messages detected: `16616`

Live hosted import proof using the harness worktree build:

- Worktree: `/Users/arimendelow/Projects/_worktrees/slugger-mail-import-hosted-harness`
- Branch: `slugger/mail-import-hosted`
- Command path: `node dist/heart/daemon/ouro-entry.js mail import-mbox ...`
- Grant: `grant_slugger_hey_31a41026`
- Scanned: `16616`
- Imported: `16142`
- Duplicates: `474`
- Source fresh through: `2026-04-23T16:12:18.000Z`

Operational conclusions:

- Hosted import must read the public registry from Blob-backed runtime config, not assume local `registryPath`/`storePath`.
- Large HEY exports must stream from disk; reading the whole archive into memory fails above 2 GiB.
- Import should remain resumable and idempotent. The implemented branch streams message-by-message and relies on per-message dedupe in the encrypted store.
- Archive imports remain historical backfill only; they do not create Screener wakeups.

## Still Pending

The user's primary HEY-experienced mailbox is `ari@mendelow.me`, but HEY treats it as a separate account-level feeder from `arimendelow@hey.com` even under the same login surface.

Remaining blocker for that feeder:

- `ari@mendelow.me` export is gated by HEY password re-entry on the export page.
- `ari@mendelow.me` forwarding must be confirmed for that specific account/address; the earlier proof for `arimendelow@hey.com` does not automatically cover it.

Future-agent orientation:

- Treat linked HEY accounts as shared auth with separate export/forwarding state.
- Unify them at the delegated-source lens only when owner/source provenance is the same.
