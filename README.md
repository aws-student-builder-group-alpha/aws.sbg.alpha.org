# Unified Alpha application

Run `npm ci`, configure `.env.local` using `.env.example`, then run `npm run dev`. Recruitment starts at `/recruitment` on the same host as the main site.

Run `npm run verify`, `npm run test:recruitment`, and `npm run build`. Recruitment browser fixtures run through `npm run test:browser` after a build and browser installation.

## Supabase and deployment

Set the main site and Skillbuilder credentials under `NEXT_PUBLIC_SUPABASE_*` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `RECRUITMENT_SUPABASE_URL` and `RECRUITMENT_SUPABASE_PUBLISHABLE_KEY` for the existing Recruitment project `xndpudtctuqxnbkhhmre`. The deployment uses its existing records and staff grants.

Set both groups of variables on the existing Vercel project, with `APP_URL` set to the exact deployment origin for each environment. Allow `/auth/callback` on that origin in the main Supabase project and `/recruitment/auth/callback` in the Recruitment project. Recruitment uses its own Google session and administrator MFA. Configure `RECRUITMENT_SUPABASE_SECRET_KEY` and `ALPHA_GMAIL_APP_PASSWORD` for Recruitment email when enabled.

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
