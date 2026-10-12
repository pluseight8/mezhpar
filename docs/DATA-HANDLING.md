# Data handling and launch gate

The shipped preview uses browser local storage for demo-state edits. It contains illustrative content, has no login, and does not send profile, post, or task data to an API. Clearing the browser's local storage removes those edits; an export is available in Settings.

The future migration includes fields that can become personal data, including display names, handles, bios, interests, authorship, group membership, posts, comments, reactions, and event attendance. Before using these fields with real students, decide purpose and legal basis, minimize collection, publish operator/privacy information, define retention and deletion/export processes, and verify server-side access boundaries.

Article 18(5) of Russia's 152-FZ generally restricts initial database operations on Russian citizens' personal data outside Russia, with statutory exceptions. This project has not received a legal assessment and makes no compliance claim. Supabase's published regions do not include Russia. Do not wire a foreign hosted database to real group data until the operator has obtained qualified legal advice and identified a lawful architecture.

An empty `.env.example` is intentional: the current app has no backend environment variables. Never add private service credentials to browser `VITE_*` variables.
