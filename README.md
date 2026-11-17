# Unified Alpha application

Run `npm ci`, configure `.env.local` using `.env.example`, then run `npm run dev`. Both areas use the main site's Supabase project. Recruitment starts at `/recruitment`; existing main-site URLs remain unchanged.

Run `npm run verify`, `npm run test:recruitment`, and `npm run build`. Recruitment browser fixtures run through `npm run test:browser` after a build and browser installation.

## Fresh recruitment database setup

No historical recruitment records are imported. Inspect the main project's live schema, policies and migration ledger first. `npm run db:recruitment:sql` prints transactional setup SQL without connecting. It refuses existing recruitment tables and existing private functions that need grant review. Historical migration files remain unchanged.

After verifying the target, configure server-side `RECRUITMENT_SETUP_DATABASE_URL`, `RECRUITMENT_SETUP_PROJECT_REF`, and matching `NEXT_PUBLIC_SUPABASE_URL`, then run `node scripts/setup-recruitment-db.mjs --apply`. Apply only to the reviewed main project. Do not run a generic migration push against either existing project.

Allow the site's exact `/auth/callback` in Supabase Google OAuth configuration. Nominate the first recruitment administrator explicitly, use the documented owner bootstrap procedure, and enroll MFA. Main-site administrator access does not grant recruitment administration. Leave mail credentials blank until email delivery is configured.

The old recruitment project remains intact. Database installation, staff bootstrap and deployment have not been performed by this source change.

## Project and checks

Alpha is the AWS student community at Rizal Technological University. The website uses Next.js, React, TypeScript, Tailwind CSS and GSAP. Use Node.js 24.22.1 for CI parity.

Startup and builds prepare the ignored Meetup JSON feed. If the network is unavailable, the existing feed is retained or an empty fallback is generated; bundled event history remains available.

- Main routes and layouts: `src/app/(main)`.
- Recruitment routes and layouts: `src/app/(recruitment)/recruitment`.
- Recruitment domain code, tests, SQL and specifications: `src/recruitment`.
- [Progress tracker](src/recruitment/docs/progress-tracker.md).
- [Recruitment architecture](src/recruitment/docs/architecture.md).
- [Community gallery sources](docs/community-gallery-sources.md).

Deploy the root package as one server application. Publishing is separate from local validation.
