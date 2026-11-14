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

Development startup and both build commands automatically prepare the Git-ignored Meetup event JSON. Each request has a 10-second timeout. If Meetup is unavailable, startup keeps the existing feed or creates an empty feed on first run; bundled event history remains available. Use `npm run fetch-events` to refresh the feed manually.

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

## Documentation

- [Recruitment Setup](apps/recruitment/README.md)
- [Progress Tracker](apps/recruitment/docs/progress-tracker.md)
- [Community Gallery Sources](docs/community-gallery-sources.md)


## Recruitment deployment

The owner selected standalone recruitment at https://aws-alpha-recruitment.vercel.app. Only the main-site Apply now links point there; main routes, account navigation and backend stay unchanged. Build the recruitment Vercel project from apps/recruitment with Node 24.x. Keep NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW=0 and NEXT_PUBLIC_ALPHA_COMBINED_SITE=0; production uses the standard .next output directory. Set APP_URL=https://aws-alpha-recruitment.vercel.app (origin only), and allow its exact /auth/callback in the existing recruitment Supabase project. Local combined preview remains separate. No paid upgrade or schema replay is required.
