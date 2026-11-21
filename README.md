# Unified Alpha application

Run `npm ci`, configure `.env.local` using `.env.example`, then run `npm run dev`. Recruitment starts at `/recruitment` on the same host as the main site.

Run `npm run verify`, `npm run test:recruitment`, and `npm run build`. Recruitment browser fixtures run through `npm run test:browser` after a build and browser installation.

## Supabase and deployment

Set the main site and Skillbuilder credentials under `NEXT_PUBLIC_SUPABASE_*` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `RECRUITMENT_SUPABASE_URL` and `RECRUITMENT_SUPABASE_PUBLISHABLE_KEY` for the existing Recruitment project `xndpudtctuqxnbkhhmre`. The deployment uses its existing records and staff grants.

Set both groups of variables on the existing Vercel project, with `APP_URL` set to the exact deployment origin for each environment. Allow `/auth/callback` on that origin in the main Supabase project and `/recruitment/auth/callback` in the Recruitment project. Recruitment uses its own Google session and administrator MFA. Configure `RECRUITMENT_SUPABASE_SECRET_KEY` and `ALPHA_GMAIL_APP_PASSWORD` for Recruitment email when enabled.

### Unified Vercel production releases

The [release workflow](.github/workflows/vercel-production.yml) stages the exact successful Recruitment CI commit from `main` on `awslc-alpha-org`. It skips obsolete commits and gives production jobs exclusive access to the release queue.

1. In Vercel, confirm the unified project's root is the repository root, its Production configuration has both sets of application variables, and both callback URLs are allowlisted. Review the failed Production build in Vercel. Turn off **Auto-assign Custom Production Domains** in the unified project's Production branch tracking settings.
2. In GitHub, configure the `unified-vercel-production` environment to accept only the `main` branch. Set its `VERCEL_TOKEN` secret and its `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_SLUG` variables using the authorized Vercel scope.
3. Set the GitHub **repository** variable `VERCEL_RELEASE_MODE` to `stage`. The next merge with successful CI creates a staged production deployment and reports its SHA, ID, and URL. To stage the current verified tip after setting the variable, rerun its Recruitment CI **push** run on `main`.
4. Verify the staged SHA and both site entry points. Check Google sign-in, the Recruitment staff MFA path, and the exact callback origins using authorized test access. Confirm the staged SHA still matches `main`, then promote that deployment in Vercel and check the production domain. Set `VERCEL_RELEASE_MODE` to `live` to automate promotion after later successful pushes to `main`. Clear the variable to pause this workflow.

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
