# AWS Student Builder Group - Alpha

Static landing page for **AWS Student Builder Group - Alpha**, a student-led AWS community at Rizal Technological University (RTU), Philippines.

## Tech Stack

- **Framework:** Next.js (App Router) with static export
- **Language:** TypeScript (strict mode) + React
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animation:** GSAP + ScrollTrigger
- **Hosting:** Vercel

## One Alpha website

This repository contains Alpha's main website at the root and the recruitment application under [`apps/recruitment`](apps/recruitment). They share one local website at `http://127.0.0.1:4300`; recruitment, Google sign-in, application forms, staff tools and Membership ID use `/recruitment`. Each app keeps its locked framework dependencies and private environment. Recruitment's database/auth/storage policies remain separate from the existing main-site Skillbuilder backend.

Use Node **24.22.1**, then install both lockfiles:

```sh
npm ci
npm ci --prefix apps/recruitment
npm run dev:combined
```

For a production-mode local preview:

```sh
npm run build:combined
npm run start:combined
```

The launcher starts the main app on 4300 and recruitment on 4301, with the existing proxy serving both through 4300. Stop the launcher to stop both servers. Combined builds use the checked-in event archive; use `npm run fetch-events` explicitly when syncing the feed. Keep recruitment secrets only in ignored `apps/recruitment/.env.local`, using its `.env.example` and [setup instructions](apps/recruitment/README.md). Set its APP_URL to `http://127.0.0.1:4300/recruitment` for this local origin, and retain the matching OAuth redirect allowlist. Never enable practice-form mode on the real recruitment server.

This source consolidation does not deploy either app or change Google/Supabase hosting settings. The current combined rewrite targets localhost; production hosting must provide the recruitment server and a verified production rewrite before switching live routing. Existing standalone build/deployment behavior remains available below.

## Ponytail cleanup

Removed verified unused UI scaffolds, orphan helpers/styles and 35 unused main-site direct dependencies, without upgrading retained packages. Declared the existing Sharp version directly because the media optimizer imports it. Kept active Alpha waves, Team scrolling, event zoom/slideshows, form validation, authorization, MFA, private uploads and audit records. Recruitment's [progress tracker](apps/recruitment/docs/progress-tracker.md) records measured source counts, verification and remaining provider/device limits. Dependency directories, build outputs and documentation are excluded from line counts; recruitment tests are included.

Recruitment's synthetic verification pipeline is runnable with `npm --prefix apps/recruitment run verify:ci`; its active organization workflow lives at `.github/workflows/recruitment-ci.yml`. Main-site checks remain `npm run verify`, plus `npx tsx --test scripts/community-gallery.test.ts scripts/event-history.test.ts`.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Static export to `/dist` (auto-fetches Meetup events first) |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm run fetch-events` | Manually sync events from Meetup |

## Meetup Events Integration

Events displayed on the landing page and `/events` page are automatically pulled from the [AWS Cloud Club at RTU Meetup group](https://www.meetup.com/aws-cloud-club-at-rizal-technological-university/).

### How it works

A build-time scraping script (`scripts/fetch-meetup-events.ts`) fetches the Meetup group page, extracts event data from Meetup's embedded `__NEXT_DATA__`, and writes it to `src/data/meetup-events.generated.json`. The site's data layer reads from this JSON file.

### When to sync events

Run this command whenever a new event is posted, edited, or cancelled on Meetup:

```bash
npm run fetch-events
```

This updates `src/data/meetup-events.generated.json` with the latest data. Commit and push the updated file to trigger a Vercel redeploy.

> **Note:** `npm run build` also runs the sync automatically via the `prebuild` script, so every build gets fresh data.

### What gets synced

For each Meetup event, the script extracts:
- Title, description, date, time, location
- Event banner image (from Meetup's CDN)
- Registration link (for upcoming/active events only)
- Event type (Online / In-Person)

### Key files

| File | Purpose |
|------|---------|
| `scripts/fetch-meetup-events.ts` | Scraping script (run at build time) |
| `src/data/meetup-events.generated.json` | Generated event data (committed to git) |
| `src/data/events.ts` | Data layer with Event interface and helpers |
| `src/app/events/page.tsx` | `/events` page (Upcoming / Held tabs) |
| `src/app/(landing)/events/events.tsx` | Landing page events section |

### Troubleshooting

- **Events not showing?** Run `npm run fetch-events` and check the console output. The script logs how many events were found.
- **Script fails?** It fails gracefully — if the fetch fails, it keeps the existing JSON file or writes an empty array. The build is never broken by scraping failures.
- **Meetup changed their page structure?** The script relies on `__NEXT_DATA__` embedded in Meetup's HTML. If Meetup changes this, the script may need updating.

## Deploy

Push to `main` to trigger a Vercel deployment. The build process automatically fetches the latest Meetup events before generating the static site.

## Event history

Feed compatibility and the SCD date override remain in `src/data/event-highlights.ts`; the current public gallery uses `src/data/community-stories.json` as described below. Public photos are local under `public/events`; credits and original recap/video links stay visible. The organizer recap on AWS Builder Center confirms SCD on September 11, 2026, replacing the conflicting September 27 Meetup listing. YGG shows only its confirmed year; the December 4 Facebook post date is not treated as the event date.

`src/data/alpha-workshops.json` preserves four verified Meetup workshops during feed outages. The build fetches the current group URL; fresh records replace archived records by ID. Update the archive only from organizer sources, preserving attribution. Run `npx tsx --test scripts/event-history.test.ts` for merge, outage, conflicting-date and media/source checks.

## Community gallery

The Events page and homepage use `src/data/community-stories.json` and the gallery adapter for chapter events, partnerships, member achievements and scholarships. Both expose the complete catalog and all four category filters. Photos open the existing accessible details dialog with slideshow, image credits, source posts and available Meetup records. Recruitment cards use bounded decorative depth while the main site’s existing motion modules remain intact.

Homepage events use the gallery's `showcase` presentation: a pinned field of small, distant photos that grow as scrolling advances a projected camera. Scrolling back retraces the zoom; stopping scroll stops the camera. All records remain available through the category filters and Gallery view/List view switch. Gallery metadata appears in the popup; List view keeps its text and ordinary document flow. Reduced motion uses an unpinned image grid. Both modes reuse all records and the same dialog, including three-second automatic slides when reduced motion is off. The separate Events page keeps its filterable grid. The existing GSAP dependency controls pinning and scroll progress; geometry is cached on refresh and card transforms update without per-frame React rendering. No embedded reference video or extra animation dependency is used.

See [source notes](docs/community-gallery-sources.md) and the accompanying media manifest for attribution and date interpretation. Run `npx tsx --test scripts/community-gallery.test.ts scripts/event-history.test.ts` to check source coverage, local media, duplicate prevention and feed fallback. Browser verification should cover filters, modal focus/Escape, slide controls, keyboard navigation, touch layouts and reduced motion.

## Public media and motion performance

Run `node scripts/optimize-public-media.mjs` after updating source logos, banners, team photos or gallery media and before building. To refresh recruitment assets too, add `--recruitment-root ../AWS-Recruitment--main`. The script writes static WebP derivatives under `public/optimized` and optional recruitment `public/brand` derivatives, retaining original files and credits. Gallery cards use 960px previews and popups use 1600px versions. The generated assets need to accompany the source when deploying. This uses the installed local image library and adds no paid service.

Hero waves pause offscreen, when the document is hidden and for reduced motion. Coarse pointers use a 30fps draw budget and lower canvas backing resolution; touch scrolling stays native. The navbar coalesces section measurements into one animation-frame update. The shortened intro plays once per tab across the combined site, using the non-personal `alpha-intro-shown` session flag. Existing wave appearance, card motion, reveal transitions and slideshow timing remain in place.
