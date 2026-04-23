# Unit 2a: Hosted Provisioning Truth Red Tests

## Summary

Unit 2a added failing tests for the hosted provisioning boundary. The tests now prevent production `ouro account ensure` / `ouro connect mail` from quietly remaining a local-only registry generator.

The pinned contract is:

- Mail Control returns public mailbox/source records with key ids, one-time private keys, public registry coordinates, and hosted Blob reader coordinates.
- The harness production path calls Mail Control instead of local `ensureMailboxRegistry`.
- Returned private keys are stored in the owning agent vault runtime item and not printed.
- Existing vault-held mail keys are preserved when Mail Control returns no new private keys.
- Hosted registry/vault drift is detected when Mail Control references a key id that is neither returned nor present in the vault.
- Production setup records hosted Blob coordinates instead of presenting the local bundle registry as production truth.

## Commits

- Substrate: `3d5553741e0ab6b08bceecf5e4c5e251347b1cb1` (`test(mail): Unit 2a - hosted control-plane contract`)
- Harness: `884c9315222da19f55b5a7a5be41e5ec283847af` (`test(mail): Unit 2a - hosted setup contract`)

## Red Evidence

Substrate:

```text
npx vitest run apps/mail-control/src/__tests__/server.test.ts
1 failed, 11 passed
failure: body.publicRegistry is undefined
```

Harness:

```text
npx vitest run src/__tests__/heart/daemon/provider-cli-commands.test.ts -t "hosted"
3 failed, 168 skipped
failures:
- fetchMock was called 0 times for hosted account setup
- fetchMock was called 0 times for hosted key-preservation setup
- drift test resolved with local Mailroom setup instead of rejecting missing mail_slugger_hey
```

## Next Implementation Shape

Unit 2b should make Mail Control response bodies include the public records/coordinates from this contract, then update harness setup to read `runtime/config.workSubstrate.mailControl`, call `POST /v1/mailboxes/ensure`, merge returned and existing private keys, validate all hosted key ids, write hosted Mailroom coordinates, enable the Mail sense, and leave local mode explicit for development.
