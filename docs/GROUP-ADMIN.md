# Group administrator quick guide

## Current preview

The public preview includes a group-admin design screen, but it does not authenticate users or persist group changes to a shared server. Anyone using the preview can modify only their own browser-local copy. It is not yet possible to add classmates to the live `РСО-212` group.

## Preparing a real group

Do not invite students until the following are complete:

1. Choose hosting and a database region that satisfy the group's legal requirements. Supabase's published regions currently do not include Russia.
2. Name the data operator and complete privacy, notice, consent/legal-basis, data-retention, and deletion decisions with qualified advice.
3. Provision the university, faculty, and study-group rows using an administrator account.
4. Create a separate test account and verify group-admin and student permissions against RLS.
5. Create a one-use or time-limited invite code. Never publish a reusable invite code in a public issue or repository.
6. Enter only verified timetable changes and tell members where schedule changes are recorded.

The migration deliberately has no hard-coded university, group, user, schedule, or invitation seed.

## Roles in the schema draft

| Role | Intended capability |
| --- | --- |
| Student | Read group content, publish and comment, mark personal progress, contribute materials and events, report content |
| Moderator | Review group reports, moderate content, update schedule and group assignments |
| Group admin | Manage membership and invitations, schedule and assignments, pin announcements |
| Platform admin | Provision academic hierarchy and administer platform operations; never granted by self-service signup |
