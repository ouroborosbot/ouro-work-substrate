# HEY Onboarding Live State

Last updated: 2026-04-23 06:23 PDT

## Current State

Slugger resumed delegated HEY onboarding after Codex verified browser MCP is available through:

```text
ouro mcp list --agent slugger
ouro mcp call browser browser_navigate --args '{"url":"https://example.com"}' --agent slugger
```

Slugger then spawned coding session `coding-087` for task `hey-mbox-export` and drove the browser to HEY using the real Chrome Default profile.

Result:

```text
Status: NEEDS_LOGIN
```

Observed browser state:

- Browser session is left open on the HEY sign-in form.
- The form is asking for email and password.
- No MFA or CAPTCHA has appeared yet.
- This is a real human gate. Credentials must be typed into the browser by the human, not pasted into chat or task docs.

## Next Human Action

Human logs into HEY in the open browser session.

After login succeeds, Slugger should continue the same delegated source workflow:

1. Navigate to HEY Settings / Export Data.
2. Request/download the full mailbox export.
3. Report the downloaded MBOX path.
4. Import the MBOX as Ari's delegated HEY source.
5. Configure future forwarding to `me.mendelow.ari.slugger@ouro.bot`.
6. Verify forwarded mail arrives as delegated source mail, never native Slugger mail.

## Guardrails

- Do not ask for HEY credentials in chat.
- Do not forward Ari's mailbox to `slugger@ouro.bot`.
- If login triggers MFA/CAPTCHA, ask the human to complete it in the browser and then resume.
- If export download is blocked by browser permissions or file picker state, record the exact UI state and ask for only that human action.
- If forwarding confirmation sends a challenge email, confirm it through the delegated-source flow and preserve owner/source provenance.

## Friction Found

The CLI browser MCP surface works, but Slugger's shell wrapper timed out on some `ouro mcp` commands even when the daemon-side MCP operation later completed. Future hardening should make browser MCP command progress visible and avoid treating slow browser calls as "browser unavailable."
