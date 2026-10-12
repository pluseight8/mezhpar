# Architecture

## Current preview

```text
React + TypeScript (Vite)
       │
       ├── demo model in src/domain.ts
       ├── browser localStorage for editable preview state
       └── static PWA shell (manifest + service worker)
                │
                └── GitHub Pages publishes dist/ only
```

The preview contains no server API, authentication flow, account system, file upload, or shared database. Every interactive record is local to one browser profile. PWA cache data is only the static app shell; it does not cache any private API response.

## Future shared architecture

The SQL draft establishes a university → faculty → group hierarchy, profiles, group roles, timetable and edit history, assignments and per-user progress, group posts/comments/reactions, materials, events, reports, and notifications. Row-level policies scope group records to memberships; privileged writes require a group moderator/admin; private files are addressed under a group-id storage path.

The SQL is not wired to `src/` and has not been applied or exercised against PostgreSQL. Before integration:

1. Select a database region and processor suitable for Russian personal data.
2. Review the schema, migration, storage policies, and the account deletion/export plan.
3. Add integration tests with at least two groups and three roles, asserting cross-group reads and writes fail.
4. Implement Supabase Auth/client data access only after the backend is approved for the intended data.
5. Keep service credentials server-side; the browser may only use the public anonymous key with RLS correctly enforced.

## Main product flow

The overview is the daily entry point. Schedule and tasks are first-class navigation destinations. Feed, materials, participants, and events deepen group use. Direct messages are intentionally outside this MVP to keep the first release centered on group routines.

## Dependency policy

React and TypeScript handle the UI and static types. Vite handles local development and static builds. Lucide React supplies the icon set. There is no remote font, analytics, map, or AI dependency.
