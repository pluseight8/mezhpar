# Contributing to Mezhpar

Thanks for helping make study-group software calmer and more useful. The current app is a local preview, so contributions should keep demo data clearly labeled and avoid adding personal data.

## Before opening a pull request

1. Open an issue for a new feature or a change to the data model.
2. Keep the first-release focus on timetable, deadlines, group posts, and materials.
3. Prefer small, accessible components and native browser features over new dependencies.
4. Never commit API keys, service-role keys, passwords, student exports, or real group data.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
6. For SQL changes, describe the migration effect and include an RLS policy review. Do not mark a policy tested unless it was run against a database with different test users and groups.

## Pull request checklist

- [ ] Explain the user problem and the behavior that changed.
- [ ] Verify the interface at mobile and desktop widths.
- [ ] Preserve keyboard focus, visible labels, and reduced-motion behavior.
- [ ] Update both `README.md` and `README.ru.md` when setup, behavior, or safety notes change.
- [ ] Add tests for meaningful domain behavior.
- [ ] Keep demo-only and server-backed behavior clearly distinct.

By submitting a contribution, you agree that it may be distributed under this repository's AGPL-3.0 license.
