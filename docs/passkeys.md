# Nexus OS · Passkeys

The frontend is configured for Supabase experimental passkey support.

## One-time Supabase production setup

In Supabase Dashboard → Authentication → Passkeys:

- Enable Passkey authentication.
- Relying Party Display Name: `Nexus OS`.
- Relying Party ID: use the stable production hostname that serves Nexus OS, with no scheme, port or path.
- Relying Party Origins: add the exact HTTPS production origin.

Choose the final production hostname before enrolling passkeys. WebAuthn credentials are bound to the RP ID; changing it invalidates previously enrolled passkeys.

## User flow

1. First access or recovery happens through the already-confirmed email account.
2. After a successful session, Nexus offers to register a passkey.
3. Future sign-ins use Face ID, Touch ID, Windows Hello, Android screen lock or the device PIN through `signInWithPasskey()`.
4. Email remains a recovery route, with client-side resend cooldown to prevent accidental rate-limit loops.

Supabase currently labels passkey support experimental, so keep `@supabase/supabase-js` current and verify release notes before major auth changes.
