# Unit 0e: Harness Vault Item Surface — Merge, Publish, Install

## Purpose

Get the completed harness vault-item surface out of a feature branch and into the actual runtime lane agents use.

This is a production gate for later DNS/mail work: workflow code may reference ordinary vault item paths only after the installed harness has the generic `ouro vault item` surface and the deprecated `vault ops porkbun` compatibility alias.

## Harness Branch

- Repo: `ouroborosbot/ouroboros`
- Worktree: `/Users/arimendelow/Projects/_worktrees/slugger-vault-item-surface`
- Branch: `slugger/vault-item-surface`
- Head: `4dec8d50c9f5c05986352fb48616b9ceb229e563`
- Version prepared for publish: `0.1.0-alpha.466`

## PR

- PR: https://github.com/ouroborosbot/ouroboros/pull/587
- Created: 2026-04-22
- Initial status: open, ready for review, CI in progress

## Local Verification Already Completed

- Focused vault/docs/help/credential/nerves tests passed.
- `npx tsc --noEmit` passed.
- `npm run test:coverage` passed with the harness 100% gate.
- `npm run release:preflight` passed after the alpha.466 version and changelog bump.

## Release Mechanics

Harness `.github/workflows/coverage.yml` is the release lane:

- Pull requests run `coverage`, `integration`, and `package-e2e`.
- The `coverage` PR job also runs `npm run release:preflight -- --base-ref origin/main`.
- Pushes to `main` run the same required jobs.
- On `main`, the `publish` job waits for `coverage`, `integration`, and `package-e2e`, then:
  - builds the repo,
  - publishes `@ouro.bot/cli@<package.json version>` if that version is not already published,
  - publishes `ouro.bot@<packages/ouro.bot version>` when wrapper changes require it,
  - verifies the supported `latest` dist tags,
  - runs `npm run release:smoke`.

## Remaining Steps

- Wait for PR CI.
- Merge after required checks pass.
- Watch the `main` publish job.
- Verify npm `latest` resolves to the released version.
- Install/repair local runtime through the supported bootstrap path.
- Verify installed `ouro` exposes:
  - `ouro vault item`,
  - metadata-only `vault item status/list`,
  - hidden secret prompts,
  - deprecated `vault ops porkbun` alias.

## Notes

- The first `gh pr create` attempt failed because `--head slugger/vault-item-surface` was parsed as an `owner:branch` pair. Retried successfully with `--head ouroborosbot:slugger/vault-item-surface`.
- Before merge, local `ouro -v`, `npx ouro.bot@latest -v`, `@ouro.bot/cli@latest`, and `ouro.bot@latest` all reported `0.1.0-alpha.465`; `0.1.0-alpha.466` was not published yet. This is expected until the `main` publish job completes.
- Do not treat this unit as done until the installed runtime, not just the branch, has the surface.
