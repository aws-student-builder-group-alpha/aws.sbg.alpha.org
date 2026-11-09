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
APP_URL=http://127.0.0.1:4300/recruitment
```

## Deployment

The main website deploys through **Vercel** on pushes to `main`. Recruitment requires separate server hosting and verified production routing.

## Documentation

- [Recruitment Setup](apps/recruitment/README.md)
- [Progress Tracker](apps/recruitment/docs/progress-tracker.md)
- [Community Gallery Sources](docs/community-gallery-sources.md)
