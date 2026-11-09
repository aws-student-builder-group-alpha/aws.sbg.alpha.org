# AWS Student Builder Group – Alpha

Official website of **AWS Student Builder Group – Alpha**, a student-led AWS community at Rizal Technological University (RTU), Philippines.

## Tech Stack

- **Framework:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Animations:** GSAP, ScrollTrigger
- **Hosting:** Vercel
- **Recruitment Backend:** Supabase

## Project Structure

- `/` – Main website
- `apps/recruitment` – Recruitment, authentication, applications, and membership management

## Getting Started

Requires **Node.js 24.22.1**.

```bash
npm ci
npm ci --prefix apps/recruitment
npm run dev:combined
```

Open `http://127.0.0.1:4300`.

For the main website only:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start main website |
| `npm run dev:combined` | Start both applications |
| `npm run build:combined` | Build both applications |
| `npm run start:combined` | Preview combined build |
| `npm run lint` | Run ESLint |
| `npm run verify` | Run checks |
| `npm run fetch-events` | Sync Meetup events |

## Features

- Responsive community website
- Interactive animations and event gallery
- Meetup event integration
- Recruitment and membership management
- Google authentication
- Optimized media and accessibility

## Configuration

Configure recruitment environment variables in `apps/recruitment/.env.local` using `.env.example`.

For local development, set:

```env
APP_URL=http://127.0.0.1:4300
```

## Deployment

The main website deploys through **Vercel** on pushes to `main`. Recruitment requires separate server hosting and verified production routing.

Both Vercel projects must build this same repository: the main project uses the repository root, and recruitment uses `apps/recruitment`. Deploy recruitment first and verify its `/recruitment` page before enabling the main-site proxy.

The verified recruitment project is `aws-alpha-recruitment` in the owner's Hobby team, with the production alias `aws-alpha-recruitment.vercel.app`. The root `vercel.json` supplies only public routing settings at build/runtime so the main site's existing Git deployment can activate this connection. No credential belongs in that file. These settings can move to the main project's Environment Variables page when its owner/team access is available; keep build and runtime values consistent.

| Project | Variable | Production value |
|---|---|---|
| Both | `NEXT_PUBLIC_ALPHA_COMBINED_SITE` | `1` |
| Both | `NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW` | Unset; local testing only |
| Main | `ALPHA_RECRUITMENT_ORIGIN` | The verified recruitment deployment's HTTPS origin, with no path |
| Main | `NEXT_PUBLIC_ENABLE_STATIC_EXPORT` | `false` |
| Recruitment | `APP_URL` | `https://aws-sbg-alpha.vercel.app` (origin only) |

Keep each project's existing Supabase configuration separate. Preserve existing production data; do not substitute a test project or replay migrations during deployment. Recruitment also needs its own publishable key and the exact `https://aws-sbg-alpha.vercel.app/recruitment/auth/callback` redirect in its Supabase auth allowlist. Keep mail credentials server-only. No paid feature or plan upgrade is required by this source change.

Production Apply now and My application use `/recruitment` on Alpha's domain; Next rewrites proxy the page, assets, API routes and callbacks to the verified recruitment origin. Cross-app links use full document navigation. The build rejects missing upstream configuration, insecure/credential-bearing URLs, a recursive main-site upstream and static export mode. The production switch does not enable local preview shortcuts in Skillbuilder's session checks. Check the route configuration with `node --test scripts/recruitment-routing.test.mjs`.

The new recruitment hostname redirects its root to the combined main-site application. Requests to recruitment on the older awsc-alpha.cloud main domain redirect to the selected canonical main domain before Google sign-in, keeping the PKCE cookie and callback on the same host. The unrelated old aws-recruitment.vercel.app deployment is not changed automatically. Once the owner has verified the combined production flow, separately update that deployment/alias so saved links cannot keep serving the old website.

## Documentation

- [Recruitment Setup](apps/recruitment/README.md)
- [Progress Tracker](apps/recruitment/docs/progress-tracker.md)
- [Community Gallery Sources](docs/community-gallery-sources.md)
