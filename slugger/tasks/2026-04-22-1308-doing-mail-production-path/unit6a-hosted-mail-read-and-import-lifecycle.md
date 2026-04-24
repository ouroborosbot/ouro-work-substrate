## April 23, 2026: hosted mail read stability + import lifecycle bar

### What broke in live prod

- The hosted Outlook mailbox read lane was asking Blob storage for `500` full messages during the summary view.
- Against the real Slugger mailbox, that fan-out was too wide and the read path regularly ended in `The operation was aborted.`
- The older `mail backfill-indexes` lane also looked stuck in practice because one slow or stalled blob operation could hold the whole run hostage for too long.

### What changed in harness on `slugger/mail-read-stability`

- Mailbox summary reads now request only the visible slice (`50`), not `500`.
- Hosted Blob reads and backfills now use bounded concurrency plus per-blob operation timeouts.
- Missing historical private mail keys in summary view are now exposed as recovery state instead of taking the whole mailbox down.
- Coverage gate is back to `100%` across statements / branches / functions / lines.
- `release:preflight` passed for `0.1.0-alpha.479`.

### Live evidence from the built branch

- Branch-local `readMailView('slugger')` against production returned:
  - `status: ready`
  - `ms: 18788`
  - `messageCount: 48`
  - `screenerCount: 6`
  - `outboundCount: 8`
  - `undecryptableCount: 2`
  - `missingKeyIds: ["mail_slugger-hey_0dee1e61fc05677c"]`
- The mailbox no longer times out at the summary layer; it degrades honestly around the old missing-key residue instead.

### Live hosted backfill evidence

- A long-running production backfill completed with:
  - `indexed: 16583`
  - `failures: 49`
  - first failures were timed-out message blob downloads, not silent hangs
- Current production counts after that run:
  - `messages/: 16633`
  - `message-index/slugger/: 16609`
  - remaining apparent gap: `24`

### Remaining recovery work

1. Publish / install `0.1.0-alpha.479`.
2. Re-run hosted index backfill with the new bounded-timeout lane until the remaining gap closes or yields a stable residue list.
3. Investigate the historical missing private key residue (`mail_slugger-hey_0dee1e61fc05677c`) so the mailbox can distinguish "old undecryptable historical artifact" from "current outage" with a concrete recovery path.

### Import / backfill lifecycle requirements (hard bar)

The user explicitly clarified that mail import/backfill must behave like a background agent-visible job, not a foreground terminal ritual:

1. It must not block ordinary conversation with the agent.
2. If the human asks for status, the agent must be able to inspect and report it.
3. If the job encounters an error, the agent must know immediately and be able to remediate.
4. When the job finishes, the agent must likewise know immediately.

### Interpretation

The old foreground-only import/backfill lane was not acceptable for full-moon mail. The harness now needs a durable background-job lifecycle that the agent can observe and react to.

## Harness patch-forward on `slugger/mail-import-lifecycle`

Implemented in the harness worktree and held to a restored `100%` coverage gate:

- Added durable background-operation records under `state/background-operations/<id>.json`.
- `ouro mail import-mbox` now launches in the background by default; `--foreground` remains available for direct execution and tests.
- `ouro mail backfill-indexes` now launches in the background by default; `--foreground` remains available for direct execution and tests.
- Foreground tracked runs write queued/running/succeeded/failed state transitions, progress, result/error payloads, and remediation hints.
- `query_active_work` now includes mail background operations so the agent can answer status requests without reading logs or blocking conversation.
- Successful completion and failure both queue a pending inner message and attempt `inner.wake`, so Slugger should learn immediately when import/backfill finishes or breaks.
- Initial running state now includes concrete detail/progress (`file: ...`, `0 messages`) so the very first status check is already informative.

## Intended operator shape

This is now the model to preserve:

1. Start an archive import or hosted backfill.
2. Let the agent keep conversing normally while the work continues in the background.
3. If Ari asks for status, Slugger checks `query_active_work` and reports the live operation summary/progress.
4. If the job fails, Slugger gets a wake + pending message and can begin remediation.
5. If the job succeeds, Slugger gets the same immediate wake path and can report completion without polling a shell transcript.

## Remaining live proof after the harness patch

Still required before this unit can be called fully complete:

1. Release the harness change through the real publish/install path.
2. Re-run a real delegated HEY archive import in background mode and verify live status visibility from the agent side.
3. Re-run hosted index backfill in background mode and verify live failure/completion wake behavior from the agent side.
4. Record any recovery friction that appears during the real Slugger-managed HEY/browser workflow and patch it forward.
