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

## Sweet Tape sequence reconstruction

Observed https://sweet-tape.com/ in Chrome while scrolling through the hero, curved ribbon, rotating product showcase, and oversized benefit canvas. The reference combines individual letter transforms, a rolling central object, a bending text path, photographs at different depths, and large background lettering. Browser observations establish those visible mechanics; Alpha uses its own components and imagery.

Implemented corresponding sequences with Alpha's wolf: opening letters scatter on scroll, the wolf rolls into the handoff, an SVG ribbon bends while its text moves, and benefit scenes place photo collages over oversized type. Role panels fan into place, the community photo stack tilts into view, and two wolves enter the final invitation. Native scrolling and existing track URLs remain intact.

Desktop browser checks confirmed the moving ribbon and wolf transforms, no document overflow, and no browser console errors. At 390px and 320px, the photo area was shortened to keep both headline lines readable. The longer “Build real” line has a smaller mobile size to fit within the viewport. Reduced motion reports zero CSS animations and exposes all benefit text with its accessible heading labels. The mobile menu and section navigation remain reachable. All three navigation tests pass; type checking still reports the same six unrelated errors.

## Continuous interactive journey

Replaced timed entrances with timelines controlled by each section's full scroll range. Photos and headings move through entry, center, and exit states; scrolling back reverses them. The role cards fan with scroll, and the gallery rotates as its section passes through the viewport.

A single fixed wolf now interpolates between seven measured scene checkpoints. It scales from the opening into the benefit scenes, then visits roles, community, and the final invitation. Scroll speed adds a temporary lean; the wolf's eyes follow the pointer, and its accessible high-five button triggers a bounce. The movement uses passive scroll listeners and animation frames that stop when the lean settles. Resize observers and font readiness update its route. Off-screen wolves leave the tab order and pause decorative motion.

Photo frames and role panels react to pointer position independently of their scroll transforms. Browser verification caught GSAP's inline normalization of individual transform properties; scoped pointer styles now take precedence while keeping the scroll transform intact.

Chrome verification:

- High-five click sets the excited state and starts its animation.
- At scroll 0 the wolf measured about 805px wide; at scroll 612 it measured about 464px. Returning to scroll 0 restored its opening size and position. The role checkpoint places it above the application links, with no overlap.
- Pointer movement on a role card produced an X rotation of 4.2 degrees and a translation of approximately -3.6px/-2.1px.
- At 390px and 320px there is no horizontal document overflow. The wolf's width is constrained to the viewport.
- Reduced motion removes the traveling wolf, restores the original scene mascots, and disables decorative animations. Static content and actions remain visible.
- No browser console errors were observed.

`node scripts/journey-geometry.test.mjs`: 3 passing tests for checkpoint alignment, reverse scrolling, and mobile bounds/missing checkpoints. Existing navigation tests: 3 passing. Type checking reports the same six unrelated errors and no errors in the new journey components.

## Background continuity and smooth scrolling

The hero, page wrapper, ribbon gap, and first benefit previously used three different dark colors. The hero also had a curved lower clipping edge, exposing a plum band above the ribbon. They now share `--alpha-night` (`#111015`); the hero glow fades into that background and the separate curved clipping edge is removed. The orange ribbon retains its scroll-driven wave.

Chrome confirmed the same computed background (`rgb(17, 16, 21)`) on all four surfaces, a zero-radius hero boundary, and no horizontal overflow at desktop and 390px. The original screenshot position was reproduced and checked visually.

Enabled the existing Lenis smoother on the desktop homepage with one-second cubic easing and its standard CSS. ScrollTrigger and the traveling wolf continue following the actual scroll position. The benefits link still clears the fixed header by 16px. Reduced motion disables smoothing immediately, restores the original mascots, and reports zero decorative animations. Coarse pointers use native scrolling; preference listeners and the smoother are cleaned up on unmount.

Checks: 4 navigation/smoothing tests and 3 journey geometry tests pass. Tests cover the desktop smoother, touch fallback, reduced-motion changes, and cleanup. The separate type check still reports the same six unrelated errors.

## Header and opening refinements

- The recruitment banner now has a fixed opaque orange background at every scroll position. The navigation surface still gains its backdrop with scrolling.
- The navigation row is 60px high on desktop and 56px on narrow screens, with a 1240px content limit, smaller logo/actions, and tighter link gaps.
- The journey reads each mascot anchor's layout width instead of its transformed bounding-box width. The pose is capped at 520px, the viewport width minus 16px, and 55% of viewport height. Negative scroll positions clamp to the top pose. The original hero mascot uses a matching responsive size and remains centered when its entrance animation finishes.
- “It’s always” sits above DAY. The group name uses a compact outlined badge with an orange alpha mark.
- Positive ribbon spacing keeps the orange wave below the opening viewport: 1052px at the checked 1020px desktop height, 868px at 390×844, and 804px at 320×780.

Chrome confirmed the banner's opaque `rgb(255, 177, 62)` background at the top and after scrolling. Returning to the top restores a 510px mascot in the checked desktop viewport, compared with the earlier roughly 805px transformed measurement. Desktop, 390px, and 320px layouts have no horizontal overflow. The compact mobile menu closes and the Roles anchor clears the 89px header by 16px. Reduced-motion layout remains available.

All 4 journey geometry tests and 4 navigation/smoothing tests pass. The new regression covers oversized anchors, negative overscroll, and short viewport height. Type checking reports the same six unrelated errors and none in the changed files.

## Readability, animated backgrounds, and roster grid

Separated hero text from its mascot/photo composition. Benefits now reserve independent columns for text and photographs on desktop and stack text above photographs on mobile. Photo translation and rotation are limited to those spaces. Section headings move as complete readable blocks. The traveling wolf checks current heading, copy, button, and roster bounds; it fades before crossing protected content and leaves the tab order while hidden.

Added six dedicated color-transition bands between different section backgrounds. Each band's curved fill expands with scroll and reverses when scrolling up, without covering section content. Reduced motion uses a complete static fill. Section glows fade out at the boundaries, preserving their shared colors. Buttons, badges, cards, and frames use gradients and highlights for a glossy finish; the recruitment banner retains an opaque base.

Replaced the team's horizontal browsing strip with a responsive portrait grid (six columns on wide desktops, four/five on intermediate widths, and two on phones). All portraits load eagerly. Restored the existing Emmanuel Toraja Fabella entry, image, Executive Secretary role, and original contact links. The roster now contains eleven people. Social/contact links remain available.

Requested @Browser verification was attempted, but the tool reported `Browser is not available: iab`. Verification continued in the connected Chrome preview. At 1280px, all three benefit scenes had zero text-glyph intersections with either photo, and the gallery did not intersect its heading. At 390px and 320px, benefits had zero text/photo overlap and no horizontal page overflow. At 320px the closing heading wraps inside the viewport, and reduced motion preserves complete readable lines. All eleven portraits loaded in the grid, including Emmanuel. A partial background sweep was observed at `ellipse(81.0638% 85.2998% at 50% 100%)`. The traveling wolf's opacity is zero while passing over the roster.

Checks: 5 journey geometry tests (including text/control collision margins) and 4 navigation/smoothing tests pass. Type checking still reports the same six unrelated errors.
