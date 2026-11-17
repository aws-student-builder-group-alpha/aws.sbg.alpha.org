# Landing page validation

Checked locally on 2026-11-17. No push or deployment.

- Opening, benefits, role panels, community carousel, roster, closing invitation, and footer render in Chrome. The requested @Browser surface reports unavailable; the connected Chrome extension was used.
- Desktop at 1280px and the default 1723px, mobile at 320px and 390px: no horizontal document overflow. Role buttons fit at both mobile widths; desktop navigation clears the brand and account controls.
- Both existing recruitment track URLs load the portal with the corresponding track selected. Generic recruitment actions use the existing opportunities URL.
- Benefits, recruitment, events, members, and contact anchors remain available; `#vision` and `#alpha-community` point to benefits.
- Login opens the existing Google sign-in screen. No sign-in or sign-out was performed; authenticated account states require a credentialed check.
- Existing team social/contact links and footer destinations are retained. No external messages or applications were submitted.
- Carousel pause, selection, and arrow-key navigation work. Below-fold photos load lazily. The existing swipe handlers remain in place.
- Reduced-motion emulation reports zero CSS animations on the landing page. The carousel stops automatic playback. The homepage has zero pin spacers and uses native scrolling.
- Fixed mobile menu navigation so it unlocks scrolling before following a section link; Escape closes the menu and restores toggle focus. Menu link typography is readable sans serif.

## Checks

`node scripts/section-navigation.test.mjs`: 3 passing, including native homepage scrolling, reduced motion, and navigation lifecycle cleanup.

`git diff --check`: passing.

`npm run verify` stops before linting because the installed typescript-eslint does not support TypeScript 7.0. The installed versions are TypeScript 7.0.2 and ESLint 10.15.0.

A separate `tsc --noEmit` reports six errors in unchanged files: missing `dotenv/config` in `prisma.config.ts`, profile update types in `approve-member.ts` and `auth/callback/route.ts`, and three `member_id` column references in `delete-member.ts`. It reports no errors in the changed landing files. These existing toolchain and application failures prevent claiming a clean full-project check.

## Wolf branding and motion refinement

- Used the existing `public/Mascot.png` and logo as the visual reference for a reusable SVG pixel wolf: gray fur, cream muzzle, orange cap, and wave/wink poses. The opening uses a dimensional version; the benefit scenes, roles, community, and closing use the same character.
- Removed repeated scene captions and shortened benefit descriptions, recruitment summaries, and opening actions.
- Studied https://sweet-tape.com/ in Chrome. Added short heading entrances, photo reveals, staggered role panels, a mascot entrance, waves/blinks, hover responses, and desktop scroll-linked photo movement. Scrolling remains native with no pinned sections.
- Chrome confirmed that the navigation starts with a fully transparent background and zero backdrop blur. At scrollY 255, its opacity was 0.718 and blur was 14.34px; it reaches its cream backdrop at scrollY 320.
- Checked desktop and 320px/390px layouts, mobile menu section navigation, and recruitment track destinations. No horizontal document overflow or browser console errors were observed.
- Reduced-motion emulation disables all CSS animations, restores unclipped photos and fully visible role panels, and removes the GSAP decorative entrances/parallax. Observers, media queries, and scroll triggers clean up on unmount; off-screen mascot animations pause.
- Navigation tests still pass (3/3). Type checking reports the same six unrelated errors recorded above and no errors in the changed files.
