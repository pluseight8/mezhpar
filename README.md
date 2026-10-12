# Mezhpar

**Mezhpar** is an open-source, web-first workspace for university study groups. Its product direction combines a shared timetable and deadlines with the conversations and small plans that make a group feel like a community.

> **Current release: local preview MVP.** The interface and core interactions work in the browser and persist in that browser's local storage. The deployed preview has no accounts, shared server, real group membership, or cross-device sync. All included names, timetable entries, posts, assignments, and events are illustrative demo content.

## What works now

- Responsive group dashboard and mobile bottom navigation.
- Week and day timetable with odd/even week filtering; add, edit, and remove demo lessons.
- Assignment list with deadlines and local completion state.
- Group feed with new posts, reactions, and comments.
- Search across the timetable, tasks, feed, and materials.
- Materials list, student directory preview, and events with local RSVP counts.
- Light, dark, and system themes; reduced-motion support; keyboard search (`Ctrl/⌘ + K`).
- PWA manifest, install prompt, and a small static-asset service worker.
- JSON export and local demo reset.

The interface labels the preview as demo data. Local edits never become visible to another browser or student.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

The terminal prints a local development URL. No `.env` file is needed for the preview. Useful checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

## Publish the static preview

The public repository can use GitHub Pages on GitHub Free. The included `deploy-pages.yml` builds the app and publishes `dist/` over HTTPS when changes reach `main`. Enable **Settings → Pages → Build and deployment → GitHub Actions** once in the repository.

The resulting project URL is `https://pluseight8.github.io/mezhpar/`. No custom domain or paid service is needed. The app is configured with that subpath so its assets and PWA manifest work on project Pages.

### Hosting decision and current limits

| Option | What the free service gives | Relevant limits | Decision |
| --- | --- | --- | --- |
| GitHub Pages | Static files from this public repo; HTTPS; no database or user-data hosting | Published site up to 1 GB; recommended source repo up to 1 GB; soft 100 GB/month bandwidth; standard Pages builds have a soft 10/hour limit, which does not apply to a custom Actions workflow | Selected for this no-account preview. It cannot run the backend. |
| Cloudflare Pages + D1 | Static hosting plus optional Workers/SQLite backend | Free Pages: 500 builds/month, 20-minute build timeout, 20,000 files/site. D1 stops answering queries after the daily free read/write quota is reached. | Technically capable, but still does not solve Russian data-localization requirements. |
| Supabase Free | Managed Postgres, Auth, Storage and APIs | 500 MB database quota; Free projects can be paused after about 7 days of low activity. Supabase's published regions do not include Russia. | Not enabled for real Russian student data. |

These provider limits can change; re-check the linked official docs before launch or a larger rollout. GitHub Pages and Cloudflare Pages availability from Russian networks has **not** been tested from a Russian connection. A public HTTPS URL does not guarantee access through every ISP.

Official references: [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Supabase plan quotas](https://supabase.com/docs/guides/platform/billing-on-supabase).

## Real group launch is a separate gate

The migration in `supabase/migrations/` sketches PostgreSQL tables and row-level policies for a future shared backend. The browser app in this release does **not** call Supabase and the migration has not been applied or integration-tested. Do not add personal data or claim the backend is live.

This matters for a Russian student group: Article 18(5) of Federal Law 152-FZ generally requires the initial recording, systematization, accumulation, storage, updating, and retrieval of Russian citizens' personal data to use databases located in Russia, subject to statutory exceptions. Supabase's currently published regions do not list a Russian region. Before collecting real names, emails, profiles, posts, or messages, choose an appropriate Russian-hosted backend and get qualified advice on operator notice, privacy information, consent/legal basis, deletion and security obligations. This repository is not legal advice and does not claim compliance.

Official and government references: [current text of Article 18 at Mintrud](https://mintrud.gov.ru/docs/laws/130), [Article 22 on notifying the regulator](https://www.consultant.ru/document/cons_doc_LAW_61801/d996966e22e1320c9de1ab82d9f6be12c3d9d765/), [RKN personal-data portal](https://pd.rkn.gov.ru/), [Supabase available regions](https://supabase.com/docs/guides/platform/regions).

The sample SQL is an architecture starting point, not a production certification. Review and run the RLS policies with a real PostgreSQL/Supabase test project before wiring a client to it. Never place a `service_role` key in browser code.

## Product research

- [Studo](https://studo.com/en/welcome) combines a university calendar/timetable with email, chat, course information, and university-specific services; availability varies by institution.
- [MyStudyLife](https://mystudylife.com/tour/) is strong at the personal planner loop: timetable, tasks, deadlines, rotating weeks, and reminders.
- Mezhpar's first product bet is a shared group space where the timetable and group deadlines bring people back, while feed, comments, materials, and small events make it social. This preview tests the interaction design; it does not yet test demand with students.

## Project layout

```text
src/                 React + TypeScript application and local data model
public/              PWA manifest, icon, and static service worker
supabase/migrations/ Draft shared-backend schema and RLS policies
docs/                Architecture, group admin, and data handling notes
.github/workflows/   CI checks and GitHub Pages deployment
```

## License

Mezhpar is distributed under the GNU Affero General Public License v3.0. See [`LICENSE`](LICENSE). The license requires modified network-accessible versions of the covered program to offer their corresponding source to users over the network. Dependencies retain their own compatible notices and licenses.
