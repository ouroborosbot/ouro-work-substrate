# Unit 10: ACS Sender Username Repair

## Discovery

- Live native self-send through Slugger's real `mail_compose`/`mail_send` tool path failed after ACS domain verification/linking succeeded.
- ACS returned:

  `Invalid email sender username: 'slugger'. Please use a username from the list of valid usernames configured by your admin.`

- ARM inspection showed the custom domain had only the default sender username:

  - `donotreply`

- Creating the child ARM resource below immediately unblocked live native send:

  - `Microsoft.Communication/emailServices/domains/senderUsernames/slugger`

## Why This Matters

- Native mailbox provisioning was claiming production readiness while outbound send could still be impossible.
- The gap is not domain verification or access-key binding; it is sender-identity provisioning on the ACS email domain.
- This belongs with mailbox provisioning truth, not a manual portal/runbook footnote.

## Permanent Repair Shape

1. Mail Control gets explicit ACS management config:
   - subscription id
   - resource group
   - email service name
   - domain name
   - managed identity credential
2. Mail Control ensures the native sender username for the mailbox local-part before mutating registry state.
3. Azure infra grants Mail Control's managed identity narrow ARM rights on the ACS email domain so it can manage sender usernames without broader subscription churn.
4. Tests cover:
   - config parsing/wiring
   - idempotent sender-username ensure
   - failure before registry mutation
   - no secret/body leakage

## Live Proof

- Manual ARM `PUT` for `senderUsernames/slugger` succeeded at `2026-04-23T15:37:12Z`.
- After that repair, Slugger's native self-send submitted through ACS and the inbound copy landed in native Screener.
