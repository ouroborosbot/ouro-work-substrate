# Unit 6 Rate-Limit Release Checkpoint

## Live Native-Autonomy Finding

Live native autonomous-send proof uncovered a policy gap:

- autonomous sends were counted only when outbound status became `sent`
- provider-backed ACS sends remain `submitted` before delivery events reconcile
- result: two autonomous sends inside the rate window could slip through before ACS delivery events arrived

This is a real production bug because the policy decision happened before provider reconciliation.

## Harness Fix

- Worktree: `/Users/arimendelow/Projects/_worktrees/slugger-mail-autonomy-rate-limit-harness`
- Branch: `slugger/mail-autonomy-rate-limit`
- PR: `https://github.com/ouroborosbot/ouroboros/pull/596`

Implementation shape:

- `mailroom/autonomy.ts` now counts autonomous outbound records using the earliest available provider-backed send timestamp:
  - `sentAt`
  - `submittedAt`
  - `acceptedAt`
  - `deliveredAt`
  - `failedAt`
  - `updatedAt`
- Added regression coverage for submitted-provider sends.

Release-lane checkpoint after rebasing on `origin/main`:

- Rebased/merged on top of main at `001f14948aef6ea6dcb6359224e18ce76499c3c3`
- Full harness coverage gate: `100%`
- `npm run release:preflight`: pass
- PR #596 checks:
  - `integration`: pass
  - `package-e2e`: pass
  - `coverage`: pending at the time of this note

Next proof after merge/publish/install:

- rerun the live negative autonomy case and verify the second autonomous send inside the policy window is refused immediately, even before ACS delivery events arrive
