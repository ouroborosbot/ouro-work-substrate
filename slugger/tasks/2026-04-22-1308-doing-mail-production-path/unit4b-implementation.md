# Unit 4b Implementation: Production SMTP Edge

## Scope Completed

- Mail Ingress now advertises SMTP `SIZE` and STARTTLS when TLS key/cert material is explicitly configured.
- AUTH remains disabled in both proof and STARTTLS modes; the edge is inbound-only and does not become an open relay or submission service.
- SMTP transactions now enforce:
  - maximum message size through the SMTP `SIZE` extension and DATA stream guard;
  - maximum accepted recipients per message;
  - maximum concurrent SMTP clients per replica;
  - per-remote-address connection rate limits.
- Unknown recipients still return a permanent rejection.
- Registry/read failures during recipient validation return a generic transient SMTP response and log a body-safe error category.
- DATA/store failures return a generic transient SMTP response and log only safe categories, not raw MIME or body text.
- Mail Ingress CLI args now expose TLS secret-file paths and SMTP pressure limits.
- Azure Bicep and the deploy workflow now pass the pressure-limit settings and mount TLS material as secret files when both PEM secrets are configured.
- The deploy workflow fails if exactly one STARTTLS secret is configured.
- Operations/deployment docs now document TLS, pressure-limit variables, smoke expectations, and the packaging lane: private commit-addressed Docker images deployed by GitHub Actions/Bicep, not npm packages.

## Evidence

- Focused mail-ingress tests:
  - Command: `./node_modules/.bin/vitest run apps/mail-ingress/src/__tests__/server.test.ts apps/mail-ingress/src/__tests__/args.test.ts`
  - Result: 2 files passed, 22 tests passed.
  - Log: `unit4b-substrate-green.log`
- Full substrate coverage:
  - Command: `npm run test:coverage`
  - Result: 16 files passed, 98 tests passed, 100% statements/branches/functions/lines.
  - Log: `unit4b-substrate-coverage.log`
- TypeScript build:
  - Command: `npm run build`
  - Result: passed.
  - Log: `unit4b-substrate-build.log`
- Azure template check:
  - Command: `npm run infra:check`
  - Result: passed.
  - Log: `unit4b-infra-check.log`
- Whitespace check:
  - Command: `git diff --check`
  - Result: passed.

## Boundaries And Remaining Proof

- This unit makes the hosted app and deploy path ready for production SMTP proof.
- Live proof is still Unit 4c: deploy the edge, verify port `25` or choose the fallback edge, run live SMTP policy checks, inspect logs for body safety, and document rollback/diagnostics.
- Production MX must not be cut over until Unit 4c proves the actual reachable edge.
