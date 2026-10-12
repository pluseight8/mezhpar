# Security policy

## Supported release

The `main` branch is the only supported version. The current public preview is browser-local and should not be used to store real student records.

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** action for this repository when available. Do not publish exploit details, personal records, or access tokens in a public issue. Include the affected file or workflow, impact, reproduction steps, and a safe contact method.

## Current security boundaries

- The preview does not authenticate users and does not synchronize data.
- Browser local storage is not encrypted and is not suitable for secrets or sensitive data.
- `supabase/migrations/` is an unverified backend draft. No live project currently uses it.
- Never use a Supabase `service_role` key in the frontend or CI build environment.
- Private group content must not be hosted as public static files. Recheck all database and storage policies before enabling a shared backend.
