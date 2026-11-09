# Architecture

## Standalone recruitment delivery — 10 November 2026

Recruitment deploys independently from apps/recruitment at https://aws-alpha-recruitment.vercel.app with APP_URL set to that origin. The production basePath is empty and output is .next. Only local combined previews use /recruitment and build/combined. Main-site Apply now links use the standalone hostname; main authentication, routes and session checks remain unchanged. Preserve existing backend data and do not replay migrations.


## Source consolidation and membership presentation — 9 November 2026

Recruitment is delivered as `apps/recruitment` inside Alpha's existing main-site repository. Keep its own package/lockfile, framework runtime, environment and migration ledger. The main app proxies `/recruitment` in combined mode; this source consolidation does not migrate accounts, change hosted configuration or combine the two authorization systems. Do not copy ignored credentials, build output, dependency directories or Git metadata into source delivery.

Recruitment explicitly sets its Turbopack and output-file-tracing roots to its configuration directory. Its builds must resolve its own PostCSS/Tailwind setup without inheriting the main application's configuration, including on CI where only recruitment dependencies are installed.

Existing-member creation reuses `issueMember` and the existing MFA-protected SQL function. A verified first Google sign-in is required; a recruitment application is not. The UI adds explicit create/manage actions, opaque white working surfaces and distinct acknowledged, failed and revoked states. Confirmation, private reasons, existing ID preservation, acceptance guards and audit records remain authoritative on the server.

## Sequential text department cards — 9 November 2026

Each department card now sits inside a normal-flow department-step wrapper. On sufficiently tall screens native CSS sticky holds the card briefly inside its own step; one GSAP timeline per step handles entrance, reading hold and handoff to the following department. Direct scrub supports pause/reverse without a new pin or React frame updates. Short screens retain normal flow; reduced motion removes the long intervals and presents stationary cards. Catalog header/card photos and photo-only credit were removed. Grouping, track filters, role popup, application IDs and form scenarios are unchanged.

## Department disclosures and direct scroll motion — 9 November 2026

The catalog groups the existing sixteen roles into eight departments before rendering one ImmersiveCard/button per department. A selected department uses those same filtered catalog records to render labeled role articles and exact Apply actions in one existing Modal. No extra nested modal, new request or altered form requirement is introduced. Department photo/copy use separate direct-scrub GSAP timelines plus bounded inner-photo parallax; matchMedia/useGSAP cleanup reverts them after filtering, reduced-motion changes or unmount. Geometry refresh waits for fonts with an active guard. The catalog stays in normal flow without new pins or per-frame React state; other site motion remains unchanged.

## Public role-card presentation — 9 November 2026

The public catalog renders the same sixteen catalog opportunities as individual ImmersiveCard articles with one accessible dialog-trigger button each. Track filters and department counts still derive from the existing catalog. The public dialog omits scenario data; authenticated form selection, required scenario response/review and submission validation retain their existing behavior. Three local optimized Student Community Day photos decorate the cards with source credit. Existing scoped GSAP entrances and bounded pointer variables provide motion, with normal document flow and a reduced-motion fallback. No schema, authentication, server API or main-site Events/Team motion changes belong to this unit.

## Private documents, outreach and membership services — 9 November 2026

The additive `20261109005924_alpha_membership_and_recruitment_services.sql` migration adds enrollment_documents, applicant_notifications, applicant_messages, alpha_members, alpha_membership_history and alpha_audit_events. The existing staff enums, assignment model, immutable snapshot/receipts, capacity and versioned decision contracts are reused. Public writes remain guarded RPCs with fresh verified Google identity and current database role/assignment checks. Only the existing MFA administrator can issue memberships or read security logs; actors cannot alter their own roles through these services. Private trigger/helper functions deny browser execution. Authenticated SECURITY DEFINER entry points intentionally mediate writes to otherwise inaccessible tables, have empty search paths, revoke PUBLIC/anon access and recheck authorization; their advisor warnings require review rather than granting direct table writes.

Enrollment is independent of draft JSON. A private Storage bucket accepts PDF/JPEG/PNG up to 3 MiB. The upload HTTP handler checks exact origin, account identity, bounded body size and file signature/MIME agreement, then uses the request-scoped user client. It saves metadata only after confirming a matching owned Storage object. Replacements lock the same draft row used by submission; a before-insert application trigger rejects missing proof and an after-insert trigger attaches it permanently. The forward enrollment-presence migration additionally requires matching Storage size/MIME at submission. Exact submission receipt handling and legacy submitted records remain unchanged. RLS restricts objects to their owner or current authorized reviewer, and denies deletion of any current registered proof, including draft proof. Replacement cleanup can delete the previous object after metadata points to its replacement. API downloads recheck access and use private/no-store, attachment, nosniff and sandbox headers. This is type/size validation, not malware scanning or automatic registrar verification.

Member portraits use a separate private 2 MiB JPEG/PNG bucket. Sharp bounds input pixel count, rotates/crops to 512×640 and re-encodes PNG without source metadata. Only active approved members can upload or edit their own name/photo. Position, date and access are administrator controlled. Membership IDs are random, immutable identifiers. `alpha_member` returns only the caller's active record and optional exact-ID match. The browser downloads the same canvas it previews, using only local brand assets and an authenticated photo blob; user text is drawn as text, never HTML/SVG markup. Alphy is the supplied local brand asset. No public member search or photo URL is exposed.

Application status triggers create private notifications keyed by application/version, without duplicate events. The portal refreshes on focus and once per visible minute, and can mark its own notifications read. Outreach preparation checks current assignment, application version, status/message compatibility and HTTPS calendly.com links; the recipient is the immutable verified application email. Confirmed requests use actor-bound immutable IDs and one atomic sending claim. Replaying a claim cannot send twice. Limits are three requests per application and 100 overall per rolling 24 hours, serialized by a database advisory lock. The app sends plain text from the fixed Alpha mailbox through TLS Gmail SMTP using Nodemailer with file/URL loading disabled. Only server credentials can record sent/failed/uncertain receipts. Uncertain or sending states never automatically resend; SMTP acceptance is not inbox delivery.

`/api/community` JSON reads/commands, `/api/community/upload`, `/api/community/file` and `/api/community/session` use private responses. Mutations enforce the configured exact origin and input bounds. Account-bound requests reject a changed identity. The combined main navbar reads the minimal session endpoint; it does not reuse the main project's profile role as recruitment authority. Signed-out Google entry explicitly requests the account chooser; the staff access screen offers switching accounts. Membership has a whitelisted OAuth return destination.

The existing free Alpha test project has both private buckets. A per-owner bucket budget allows fewer than three objects before insert, and replacement cleanup is best effort. This does not prove support for 1,000 uploaded documents within free storage. No automated document/member/message deletion is active. Audit records contain actor, object ID, action and time; private membership reasons and message bodies have separate protected tables. Role-change and review histories remain in their existing audit systems. See [sender setup](community-services-setup.md) for the two server-only email variables and actual activation requirements.

## Form workspace and homepage event presentation — 9 November 2026

The existing DraftEditor renders a white workspace, an application sidebar and its current task content above ProcessShell's viewport-bounded Alpha wave canvas. The sidebar remains in normal document flow. ProcessProgress receives optional step descriptions; completed steps still call the existing guarded stage transition. The canvas retains its visibility, reduced-motion and touch rendering budgets. All draft, auth, eligibility, consent and submission operations are unchanged.

The main homepage uses the existing CommunityGallery with `presentation="showcase"`, category filters and the complete `getCommunityStories()` catalog. Gallery mode shows only photos; list mode retains metadata. Mode/filter selections remain transient component state. Both modes share StoryCard and the existing event dialog/slideshow. `useGalleryZoom` pins a viewport-bounded photo field and projects each image from a different depth. Native scroll progress advances the camera without a timed scrub delay; reverse scrolling retraces the projection. Geometry is measured only on refresh; per-progress work updates transforms, opacity and changed visibility/interaction states without React renders. Explicit zero refresh priority enables GSAP's document-order sorting so sibling pins are included in the gallery's start position. Cleanup removes its pin and restores card styles/tab order on view, filter or motion-preference changes. List view and reduced motion use normal-flow layouts; tiny/offscreen photos are not keyboard targets until large enough to interact. Compact previews remain lazy-loaded; full photos mount only inside an open dialog. The separate Events page retains its filterable grid. No video asset, extra animation dependency or service is introduced.

Explicit showcase filter/view changes restore the gallery toolbar after the existing scroll-layout refresh, preventing the page from jumping into following sections. Passive resizing does not request this restoration. Refresh listeners and observers clean up with the component; other section timelines are unchanged.

## Public media and animation work — 8 November 2026

The main site serves prebuilt WebP derivatives from `public/optimized`: a 256px logo, 768px team photos, 960px gallery previews and 1600px popup photos. Original media and attribution remain available. The sibling main-site `scripts/optimize-public-media.mjs` also exports recruitment logo/banner derivatives with `--recruitment-root ../AWS-Recruitment--main`. This uses the installed image library locally; no hosted image service or paid resource is added. Update these derivatives when changing their source photos. Gallery popup content remains mounted only while open.

Both hero wave renderers pause offscreen, on hidden documents and with reduced motion. Touch/coarse-pointer rendering uses a 30fps draw budget and a backing resolution capped at 1.25 device pixels per CSS pixel (rounded to whole pixels); desktop retains the original wave motion with a 60fps budget. Main-site touch scrolling uses the browser's native scrolling. Navbar section measurements are coalesced into one animation-frame callback per scroll update.

The two applications share only a non-personal `sessionStorage` flag, `alpha-intro-shown`, to avoid replaying the decorative intro during navigation in the same tab. Storage failures do not block navigation. Applicant identity, consent, drafts and authorization retain their existing server contracts.

## Combined local Alpha preview — 7 November 2026

The Alpha main site serves the combined preview at `http://127.0.0.1:4300`. It serves the chapter and events pages and forwards `/recruitment` to the recruitment build listening on `127.0.0.1:4301`. The recruitment build uses the same prefix for its pages, framework assets, images, API calls and callback URLs. The main site also forwards the two existing root-relative recruitment fonts. Navigation across the two applications uses ordinary links. Each application still owns its routes and access checks.

Set `NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW=1` during build and start in both repositories. Both builds write to `build/combined`. Start recruitment with `next start --hostname 127.0.0.1 --port 4301` and Alpha with `next start --hostname 127.0.0.1 --port 4300`. The combined preview uses signed-out chapter navigation and can run without hosted authentication credentials. The existing standalone configuration applies when the flag is unset.

For practice applications, set `ALPHA_PRACTICE_FORM=1` when starting the combined recruitment server. Apply renders the same wizard with a sample profile and a draft held in browser memory. Validation runs in the wizard, and completing practice shows local feedback. Practice answers and submission actions stay in the browser.

For authenticated testing, leave `ALPHA_PRACTICE_FORM` unset and configure the recruitment server with the test Supabase project URL and publishable key. The app origin is `http://127.0.0.1:4300`. Enable Google in the test project and allow the exact return URL `http://127.0.0.1:4300/recruitment/auth/callback`. The recruitment server verifies the session and routes applicants to consent, their draft or application status.

Application actions on the recruitment homepage start OAuth through a server action. A verified session goes directly to the application route. Applicant failures and signed-out visits to the application route return to the recruitment homepage, preserving catalog-approved role choices. Staff sign-in uses its separate return route.

The navbar's My application link requests draft resume from the application portal. After verifying the account, the portal opens an existing draft in the editor. The editor uses the saved step and checks its prerequisites. Submitted applications stay in the status portal, and Save & exit continues to open the draft summary.

Chapter navigation and footer quick links share a link list within each repository. Recruitment uses ordinary links to the main site so its base path is not added to chapter destinations. The main site's section links include the homepage path, allowing entry from Events or Skillbuilders. Privacy and staff entry remain separate footer utilities.

## Home scroll motion — 6 November 2026

The recruitment Home uses a scoped GSAP context for its hero canvas, hero message, Opportunities introduction and selected section content. One timeline follows the position of Opportunities in either scroll direction. Section entrances, including the staggered FAQ labels, run once per page visit. The context reverts on unmount or when reduced motion is enabled. FAQ disclosure uses native details with a CSS enhancement for the answer transition. Both sections remain in normal document flow.

## Recruitment logic preservation — 5 November 2026

Only the redundant ApplicationIntroduction identity paragraph is removed in this unit. Existing verified Google/account gates, processing consent before draft creation, mutation retries, submission and portal routing remain owned by the original application source. Public event records live in the main-site repository with credited local media and organizer links; they do not access recruitment accounts or data.


## Alpha application presentation boundary — 5 November 2026

The entry introduction and public four-step roadmap are static presentation. They collect nothing and create no draft; consent, account checks and all existing mutations remain authoritative. The same compact entry card supports sign-in, unavailable and consent states. Editor progress keeps the same four indices and past-stage guards, with numeric visual markers. Main-site hero/navigation use the centralized APPLICATION_URL; Team remains #members. No session sharing, route rewrite, auth, schema, dependency or domain-rule changes.


## Main-site navigation and Apply presentation — 5 November 2026

The shared header uses fixed official main-site origins for Home, About Us and Events, plus the local recruitment FAQ; its existing applicant/staff destinations remain role-derived. Existing unsaved/pending navigation and sign-out guards apply to these links. The main site's `APPLICATION_URL` is derived from its portal URL and targets `/apply`; no cross-site session sharing, rewrite or deployment is introduced. `ApplicationIntroduction` and `ApplicationOverview` render public orientation content without data access or state. Apply's privacy summary describes existing processing only; the verified-account `StartDraft` consent and mutation remain authoritative. Labeled editor progress retains the same four stage indices and enabled/disabled rules. The latest owner request supersedes older instructions omitting an Apply introduction; backend, schema, catalog and account boundaries remain.

## Public preparation boundary — 5 November 2026

Home's preparation composition is presentation only. `HomePreparation` contains public requirements and links, without account reads, inputs, consent, storage or draft commands. Track comparison changes only Home's existing filter state; opportunity dialogs retain `/apply?opportunity=<approved-id>`. Shared main-site links use the fixed official Alpha origin. The latest main-site visual request places preparation in its own normal-flow section and removes the hero/introduction pin calls while retaining the existing catalog behavior. Home's route-scoped `immersive-home.css` does not theme authenticated forms. `ImmersiveCard` updates only bounded transform/glare CSS variables through coalesced pointer frames, cancels queued work on exit/unmount and resets when the fine-pointer/no-reduced-motion query stops matching. It performs no requests, storage or commands. No API, schema, identity or workflow contract changes.

## Boundaries and current baseline

The [project overview](project-overview.md) owns product scope; this document owns system contracts and owner procedures. The [tracker](progress-tracker.md) distinguishes implementation, local/hosted verification and remaining work. The 27 October full reset removed all then-existing accounts and recruitment records while leaving schema/configuration installed. A nominated Google identity was subsequently bootstrapped as administrator; SQL confirmed its active role and audit entry. The owner later reported that the overall manual testing flow worked, before the workspace redesign. This report does not independently verify every provider or failure scenario. The reset is dated evidence, not a current account inventory.

| Layer | Responsibility |
| --- | --- |
| Next.js / React / TypeScript | Routes, server rendering, forms and server operations; use installed versions/guides |
| Tailwind / semantic tokens / scoped GSAP | Fixed route-scoped UI, responsive access and reduced-motion-aware interactions |
| Supabase Auth | Verified Google identity, request-scoped cookies and administrator TOTP MFA |
| Supabase PostgreSQL | Drafts, immutable submissions, staff access, reviews, decisions, intake, history and capacity |
| Vercel | Planned hosting; no deployment has started |
| GitHub Actions | CI verification; separate prepared backup workflow remains disabled |

The free-tier target is Vercel Hobby/Supabase Free. Verify current hosting eligibility, quotas and measured traffic before deployment; no paid upgrade is authorized. Project/application accounts are separate from hosting-team membership.

- `app/` owns pages, Server Actions and narrow Route Handlers. `app/components/` owns UI state, never authorization. MFA mutations use Server Actions; staff/application/evaluation/decision/intake commands use bounded JSON HTTP handlers.
- `lib/server/` and `lib/supabase/` own verified sessions, request-scoped clients, authorization and DTO shaping. `lib/catalog.ts` owns approved catalog/questions/eligibility; generated `lib/supabase/schema.ts` describes schema, not runtime authority.
- `proxy.ts` refreshes cookies and preserves refresh/cache headers. An early GET gate returns 404 for wrong-role staff routes before streaming; pages and commands authorize independently. Private responses are private/no-store.
- `supabase/` owns versioned migrations, RLS, constraints, RPCs and configuration seeds. Inspect actual objects and the ledger below before installing anything.
- `tests/` owns synthetic fixtures and regressions; reusable synthetic identities/data stay there. Production app/lib contain no demo provider, personas, sample reducer or preview tools. Shared submitted-status UI uses the current `ApplicationStatus` contract in `lib/applications.ts`.
- `public/` is public assets only. Applicant data, private notes and evidence contents never belong there.

The approved redesign uses explicit presentation variants on seven recruitment routes: `/apply`, `/application`, `/staff`, `/admin`, `/admin/applications`, `/reviewer` and `/admin/intake`. Shared frame coverage is installed; current implementation and verification status belong in the tracker. Nested layouts emit static `workspace-frame` markers, including around loading/access-error states; one parent administrator layout covers all three administrator destinations. The root header/footer derive their own frame attributes from `useSelectedLayoutSegments`, which also resolves during prerendering for these static routes. Scoped CSS selects their presentation from the initial HTML without an after-mount effect. Use active router segments rather than the presence of a workspace anywhere in the DOM: Cache Components retains inactive pages under hidden Activity boundaries. These presentation markers/navigation variants confer no access. Privacy keeps its reading/footer presentation and receives the shared navbar without moving route files or changing URLs. Home alone renders a timed client-side preloader overlay; reduced-motion and no-JavaScript CSS hide it. Preloader completion enables one scoped GSAP timeline that keeps the decorative background visible, reveals every public-header instance together, and then reveals the headline lines and supporting copy in order. The catalog renders the filtered department groups in normal flow with a result count; its decorative ScrollTriggers move each department card a short distance once without pinning, changing focusability or hiding role actions. Reduced motion disables that entrance. The catalog's native dialog previews the role scenario and links to the existing Apply route with its approved opportunity ID. Your story reads the same catalog question as the label for the existing scenario response; the jump link only changes page focus. These presentation changes confer no access and create no draft or application. Home's separate decorative background canvas is scoped to its hero, pauses offscreen/hidden and renders one stable reduced-motion frame. ParticleText mounts when the post-loader timeline is enabled; semantic DOM lettering remains the accessibility and no-canvas fallback. Fine-pointer letter displacement applies only to Home's white first headline line; the orange second line uses ParticleText's own pointer response. Neither overlay nor either canvas has access or data responsibility.

SiteHeader uses one role-aware menu on all routes; active route markers still select the existing footer/body variants. Its background stays opaque near-black on scroll. The Home header is fixed and other headers are sticky; none sample underlying surfaces or move based on scroll direction. A ResizeObserver publishes the actual row height through --site-header-height for sticky/focus offsets. The mobile dropdown is absolute, scrolls within the available viewport and does not increase the row height. A 75em header container query keeps the normal 1200px breakpoint and moves enlarged text into the dropdown earlier. Home's initial GSAP entrance still targets only Home header content. No session, authorization, API or storage contract changes.

Tab selection, mobile list/detail visibility and expanded filters are in-memory view state; native help/history/count/shortcut disclosures keep their children mounted and add no read/write/reset. History read errors reveal recovery. Search and advanced Apply share the existing explicit queue handler, so applied filters/export scope and dirty/pending guards are unchanged. These views perform no writes. Staff directory Back/reopen preserves the selected account or grant form and its unfinished input; confirmation dialogs remain outside the hidden panels. Administrator filters start collapsed at every width and retain unapplied values. Selected record panels stay mounted when hidden, preserving edit/retry state and access checks. Shared evaluation presentation derives tab labels from the verified response role: administrator Application/Review & decision/History versus evaluator Application/Recommendation/Previous reviews. Administrator-only controls and history are not instantiated for evaluators. Changing records or applied filters still uses the existing dirty/pending guards. Back to list preserves the selected record and scroll position but is blocked during an uncertain command. No API, DTO, schema or storage contract changes for this visual unit.

The `/apply` process shell retains the shared landing navbar and suppresses the global footer and repeated Privacy/Contact row. Linked processing consent and explicit no-JavaScript privacy/contact help remain; Home/Privacy footers stay unchanged. It owns a viewport-sized, decorative background host, not another toolbar: anonymous authentication uses dark orange/violet waves and a translucent sign-in card; preparation, editor, loading and recovery use near-black waves, white cards, navy text and lightly tinted fields through shared process tokens. Progress remains inside the editor card, Save & exit shares the normal-flow actions immediately after the form inside the card; no action bar sticks to or spans the viewport. Account actions use the shared navbar. `WaveGradient` extracts the existing Canvas2D renderer; `HeroGradient` retains Home defaults and pointer response. Apply disables pointer response, caps DPR, pauses when hidden/inactive and uses a stable reduced-motion frame/CSS fallback. Preparation is capped at 600px and keeps its short lead, read-only email and consent/action above a native collapsed Application details disclosure; errors and exact draft-creation recovery remain outside that disclosure. These components confer no authorization.

The `/apply` writer displays its three responses together and keeps four-step navigation in React state, with stable persisted stage identifiers 1/2/3/5. All editable values remain in the serialized save queue; see the versioned application contract below. Fresh drafts start at About you (`stage: 1`). Continue validates prerequisites; progress offers backward movement only. Apply shows inline field errors without a summary/list. Explicit blocked navigation/submission/manual-save recovery chooses the earliest affected step and then the first invalid control in current DOM order, opening optional details before focus. Autosave and typing never move focus. Unknown or non-renderable form/stage/server keys produce one compact action-area fallback rather than an invented field target. Save & exit drains the same queue and navigates to `/application` only after acknowledgement; failure keeps input and recovery controls. There is no separate manual Save draft action. Review omits duplicated evidence through an opt-in summary prop; portal/evaluator readers keep their default evidence sections. Intake reads keep typed routine status/read-error state separate from submission-error/uncertain recovery. Only explicit Refresh intake availability announces routine success; focus reads are silent. New checks clear routine status and obsolete reads cannot replace a newer check/submission. Missing receipts or failed reconciliation never clear an uncertain command or its exact retry. Server contracts, access checks and exact uncertain-command handling are unchanged.

## Identity, permissions and transport

The latest six-route process presentation uses `RecruitmentShell` at the application/staff/reviewer layouts and the common administrator layout. It owns only a viewport-bounded decorative wave host; protected editors and their outage-preserved state remain inside their existing access boundaries. `.recruitment-process` explicitly scopes shared surface/control styles with a shared working/auth palette; Home/Privacy defaults remain unchanged. Active route information suppresses process footers; hidden retained pages confer neither chrome state nor authorization. Client-only inline validation owns field presentation/focus, not command state or server authority. Existing payloads, counting rules, confirmation/frozen-retry contracts and access rules remain unchanged; MFA code errors and operation errors have separate presentation.

Applicants/staff sign in with Google; the app requests identity only. The server calls verified Auth identity checks rather than trusting cookie-embedded user data. Ownership comes from the verified subject, never a submitted user ID or user-editable metadata. Protected operations independently verify current identity, membership/assignment and administrator AAL2. Session initialization is request-time: session components stay behind Suspense and the server factory awaits `connection()` before SDK initialization. No private data uses shared caching.

Staff have one administrator/evaluator membership, active/suspended/revoked state, revision and private history. Any membership, including former/revoked staff, excludes applicant access without deleting earlier drafts. Ordinary commands prohibit self-changes and removing the last active administrator. Owner bootstrap/recovery remain outside the app. A fresh Google sign-in after an explicitly authorized account deletion creates a new identity; that maintenance exception is not a staff-to-applicant workflow.

| Route | Contract |
| --- | --- |
| `/apply`, `/application`, `/api/application` | Own applicant draft/submission/portal/withdrawal; staff excluded |
| `/staff` | Google staff sign-in and administrator authenticator enrollment/challenge |
| `/admin`, `/api/staff` | Current administrator/AAL2 staff management; JSON commands up to 8 KiB |
| `/admin/applications`, `/reviewer`, `/api/evaluations` | Administrator application workbench or assigned-only evaluator access; commands up to 32 KiB |
| `/api/decisions` | Administrator/AAL2 state/history/publication/amendments; commands up to 8 KiB |
| `/admin/intake`, `/api/intake` | Administrator/AAL2 settings/history/pause/resume/final Close |
| `/api/applications/export` | Same-origin administrator/AAL2 POST producing a private CSV attachment |

JSON commands validate origin, media type, body size and closed runtime DTOs before dispatch. Client account IDs detect account changes; they never confer authority. Access/DTO failures fail closed. Typical outcomes distinguish unauthenticated, forbidden, missing, conflict, validation and unavailable states with 401/403/404/409/422/503.

Reads/access checks have an **8-second** deadline; browser commands have **15 seconds**, including response parsing. Unknown acknowledgement does not prove rollback: freeze the exact account, mutation ID, expected revisions and input for retry/reconciliation. Acknowledged success updates immediately; later directory/history failures do not erase it. Old reads or recorded receipts cannot downgrade newer revisions. An empty reconciliation read never unlocks an uncertain submission.

Verify access on actions, focus/visibility and every 30 seconds while visible. Confirmed account/access loss clears private views and aborts requests. Temporary verification outages hide staff workspaces while preserving edits and uncertain commands for re-verification. Applicant input stays visible in memory with a warning; saving and submission verify the account again. No answers or notes enter local storage/IndexedDB; unsaved edits stay in memory and navigation warns before loss. Working process appearance is fixed light, with unchanged public Home/Privacy palettes and no stored preference.

## Storage and workflow contracts

### Drafts and submission

- `applicant_drafts` has one unique Auth owner, server-owned email, bounded JSON, Draft-only status, revision, mutation ID, privacy version, consent and timestamps. Incomplete drafts may omit submission requirements/minimum words; processing consent and storage validation still apply. Autosave, explicit retry and Save & exit share a serialized queue; conflicts preserve local answers until explicit reload/discard.
- `draft_opportunities` contains the approved sixteen IDs/tracks. `recruitment_settings` is an owner-only singleton with no client table access. Official opening is `2026-10-31T16:00:00Z` inclusive; closing is `2026-11-30T16:00:00Z` exclusive: November 1–30 in Asia/Manila. The owner authorized an early development opening on 28 October until they request restoration, with the original deadline retained. Current configured state/finalization and the restoration snapshot are evidence in the tracker; use server time, not client clocks.
- `applications` has unique ownership/reference and immutable answers/evidence/email/consent/source revision. `application_public_history` exposes only public status/revision/time for the owned application. Submitted records and settings deny direct client writes.
- Submission shares the applicant Auth-row lock with draft saves/staff grants, takes settings FOR SHARE and the draft FOR UPDATE, validates full requirements and atomically creates one snapshot/Submitted event. References are `ALPHA-2026-` plus twelve uppercase hex characters; only reference collisions retry, at most five times.
- Existing operation receipts are checked after current applicant authorization and before intake gating. Retrying does not create another application/reference/history event. After submission/withdrawal, even old idempotent draft saves are rejected. Snapshot triggers protect submitted fields.
- The editor freezes, flushes serialized saves and submits only the acknowledged revision. `/apply` redirects submitted accounts to `/application`; portal revisions merge monotonically.
- Withdrawal from Submitted, Under Review or a published outcome is terminal, preserves answers/reference/history, prevents resubmission and removes evaluator access. Accepted withdrawal releases a place transactionally.

New submissions require a nonblank resume URL in the fresh-submission RPC branch, after existing receipt handling. The legacy snapshot validator/CHECK and DTO parsing remain compatible with historical resume-less applications. The earlier resume-only change retained legacy parsing and RPC signatures; the versioned simplification below adds JSON fields. UI progress is view state: shared typed validation gates every forward destination, while incomplete saves and backward movement remain available. Track eligibility belongs to Opportunity; Review declarations gate final submission only. Resume contents/permissions stay external and are not fetched or verified.

### Versioned simplified application

A missing formVersion denotes legacy v1. V2 JSON adds exactly `formVersion: 2` and `scenarioReviewedOpportunityId`; RPC names/arguments and authorization stay unchanged. Keep exact closed payload key sets for each version. V2 requires three nonblank responses of up to 150 words, available days, the existing profile/eligibility/declarations and a resume for fresh submission. The scenario-review opportunity must equal the selected opportunity. The first selection initializes it; later role/track/eligibility changes clear it while preserving answer text, and explicit review restores it.

Retain stored stage IDs 1/2/3/5 for the four visible sections. The new editor upgrades unfinished v1 drafts in memory, maps 0 to 1 and 4 to 5, and persists through its serialized version-checked save. Preserve every string, including retired experience/availability/pathway slots for applicant copying. The v2 submit RPC blanks retired slots in the immutable snapshot while leaving the draft untouched. Shared review/portal/staff readers choose prompts by version. Legacy snapshot CHECK validation retains v1 limits so later status updates remain possible.

Do not rewrite existing rows or mutation IDs in the migration. Drain frozen v1 saves unchanged before a fresh v2 save; never upgrade while a submission is uncertain. Receipt lookup stays before intake/current-draft checks, and saves reject v2-to-v1 downgrade after exact receipt handling. Existing old-tab v1 operations remain compatible during rollout; new/refreshed editors use v2. The server cannot distinguish an uncommitted pending v1 submission from another fresh old-tab operation without a separate operation registry.

The simplified-form migration is installed on the verified AWS Recruitment project as hosted version `20261101061419`. Rollback rehearsal and rollback-only hosted v1/v2 contract checks passed; all sixteen public and twenty-seven Auth table count/hash fingerprints and existing function grants were preserved. No public SDK function signature changed; regenerated public TypeScript types match the existing file. Version fields live inside JSON. Real Google/MFA, physical-device and concurrency evidence remain separate; see the tracker.

### Staff access and MFA

`staff_memberships` allows authenticated own-membership reads; direct writes are denied. `staff_access_history` is private and immutable through ordinary workflows. Commands serialize through the shared staff advisory lock, lock the target account, recheck authority/last-admin protection/revisions and append history and actor-bound retry receipts atomically. Reasons are required. Historical actor/target IDs remain attributable; normal revocation does not erase them.

TOTP enrollment supports QR and manual setup key, cancellation of an unverified setup, verification and later challenges. The QR normalizer accepts at most 1 MiB, handles provider prefixes/XML/comments and performs single encoding/validation. A missing/broken image keeps the enrolled factor, manual key and verification usable. Diagnostics contain only input length/rejection category; keys, QR payloads, codes and IDs stay transient. Enrollment alone does not unlock administration; rejected codes retain enrollment for retry.

### Assignments and recommendations

`evaluation_assignments` stores one current numbered generation per application. Initial reasons are optional; reassignment reasons are private and bounded to 500 Unicode code points. Selecting the same evaluator preserves the current review; switching, even back to a previous evaluator, requires a fresh generation/recommendation. An applicant cannot evaluate their own application.

`evaluation_reviews` stores current recommendations/notes and revisions; `evaluation_review_history` preserves earlier revisions; `evaluation_commands` stores actor-bound request hashes/narrow receipts. Notes are optional and bounded to 5,000 Unicode code points. All four tables deny direct client reads/writes; guarded RPCs shape access.

The administrator can read submitted/withdrawn applications and full private history. An active evaluator can read only current Under Review or published assignments. They see each earlier assignment's latest saved review as read-only context, not full revisions or reassignment reasons. Withdrawal removes their access. Published reviews/assignments are read-only; inactive staff retain records but cannot access them until reactivated/reassigned.

Assignment/review commands use the staff advisory lock, then applicant account, application, assignment and review locks in consistent order. Check authorization before cached retries and validate expected revisions/generation. First assignment adds one Under Review public event; reassigning/saving reviews does not publish outcomes. Lists/history use deterministic 25-row pages.

### Decisions and capacity

`opportunity_capacities` stores the sixteen private catalog limits. Accepted occupancy is derived from current application statuses after locking the relevant capacity row; there is no mutable counter or automatic waitlist promotion. `decision_history` preserves actor, outcomes, private reason, application/assignment/exact review-history revision and time; `decision_commands` stores hash-bound narrow receipts. These tables have RLS and no direct client privileges.

Administrator/AAL2 decision RPCs require a saved review from the current assignment generation, but the administrator chooses the outcome independently. A current saved review remains valid after its evaluator loses access. Publication does not depend on intake. Lock authority, applicant account, application, assignment/review and capacity in the documented order; commit status, public history, private audit and receipt together. Withdrawal follows compatible account/application/capacity order.

Publication freezes assignment/review editing. Amendments require a different outcome and private reason up to 500 Unicode code points, preserve review basis/history, revalidate capacity and never reopen evaluation. `CAPACITY_FULL` is explicit feedback. Applicants receive public outcomes/history without evaluator identities, notes, private reasons or audit data.

### Queue filters and counts

`admin_application_queue` requires current administrator/AAL2, an empty search path and no anonymous execution. It exposes a deterministic 25-row page, matching total and six public-status counts from one materialized matching set. All applied status/track/opportunity/assignment/current-review filters and literal name/email/reference search affect every count. Drafts are excluded; default status includes Withdrawn. Assigned includes inactive current assignment records; Saved requires a review in the current generation only.

Non-list modes reject filter keys; evaluators retain assigned-only search without administrator filters/counts. Validate bounded search/offsets and compatible track/opportunity. Draft UI filters are distinct from applied filters. Apply/Clear resets page/selection only after dirty-edit confirmation; uncertain commands block navigation/filter changes. Failed reads hide stale counts/results and obsolete responses cannot replace newer queries. Counts are request-time snapshots, not subscriptions; filters remain in memory.

### Intake state and history

Settings include revision/update time. `intake_history` records future actor/action/previous/new state/reason/time/revision in private 25-row pages; `intake_commands` holds hash-bound retry receipts. Neither has client table grants. Do not invent actors for changes before audit installation.

Open can pause/close; Paused can resume/close. Pause/resume require time before the deadline; resuming before opening restores the schedule without accepting early. At/after deadline only Close is available. Closed is final through the app. Every command requires a private reason up to 500 Unicode code points and exact settings revision. Dates/finalization never change through these controls. Staff authority/settings/receipts are locked consistently; submission's settings FOR SHARE serializes against intake writes. Fresh drafts, reviews, decisions and withdrawal remain independent.

Conflicts preserve choice/reason until explicit discard/reload; uncertain requests keep exact retries. Explicit replacement reads hide/freeze transition input to prevent reload races. Acknowledged success is independent of later history/read failure. Final Close must only be tested in disposable data, not used to prepare this cycle for tests.

### CSV export contract

`admin_application_export(jsonb)` is one read-only statement snapshot using the same applied queue predicates/order across all matching pages. It is administrator/AAL2-only with no anonymous execution or direct table grant. Drafts, evidence URLs, private reviews/notes/reasons, evaluator identities, Auth/application/owner/mutation IDs, revisions and private history are excluded before the SQL response. Unexpected snapshot/profile fields fail validation.

The fixed **30-column** order is the authoritative `exportHeaders` in [application-export.ts](../lib/application-export.ts): reference/public status/submission/withdrawal times; profile/contact/enrollment; track/opportunity/availability/experience; five legacy answer columns; accuracy and consent choices; appended Form version. The first 29 column positions remain stable. Version 2 uses Reason for joining for combined motivation/contribution and leaves retired Experience, Time commitment and Pathway answer cells blank. Times use explicit +08:00, booleans Yes/No and available days semicolon-separated. UTF-8 BOM, quoted cells, doubled quotes and CRLF preserve answer newlines. Formula-looking prefixes, including Unicode whitespace/control/format characters and full-width operators, are neutralized only in CSV; stored values are unchanged. Spreadsheet re-save/import behavior needs separate verification.

The SQL snapshot and actual CSV are independently bounded to **64 MiB**, with explicit narrower-filter guidance rather than truncation. Generation/complete download is bounded to **15 seconds**, RPC read to eight seconds, including synchronous serialization checks and response-body consumption. The private/no-store attachment uses Web streams and expected decoded byte/row counts. Body cleanup must not wait on an unresponsive cancellation.

The browser validates content type, filename, counts, size and complete bytes before creating a Blob download. Partial/error/cancelled/oversized output creates no file. Filters freeze while dirty assignment/decision edits survive; attachment clicks bypass ordinary leave prompts. Revoke object URLs after use/unmount. A known-zero queue disables export; a fresh empty snapshot yields headers and zero rows. Cancel on outage/account/access loss. Success means Download started, not Saved. No retained export/job/email is created; staff-owned copies need manual protection/retention.

## Owner setup and recovery

### Configure a local environment

Use the installed dependencies and [verification setup](code-standards.md#verification). Set the public project URL/publishable key and exact `APP_URL` in `.env.local`, following [.env.example](../.env.example). Keep Google OAuth secrets in Supabase provider settings; allow the intended local origin/callback. If Google consent is in Testing, add the chosen test identities there. Restart the server after environment edits. Missing configuration fails closed; there is no demo fallback.

The existing project is migrated. For a genuinely new project, apply only verified-missing migrations in ledger order, configure Google/redirect URLs, regenerate schema types unchanged and verify permissions. Do not replay the installed baseline or issue a generic push based only on filename/history differences.

### Bootstrap the first administrator

The reset removed the old administrator/MFA; a new administrator has since been bootstrapped. For a future first-administrator setup, have the owner explicitly nominate a separate staff Google account and sign in once at `/staff`. Only after separate owner authorization, run the following as database owner with the exact verified email; do not auto-select an applicant or former email.

```sql
select public.bootstrap_first_staff_admin(
  'your-google-email@example.com',
  'Project owner approved initial administrator access'
);
```

Only the database owner can call this bootstrap, and it refuses when an administrator record already exists. History records the owner operation. After the grant, return to `/staff`, enroll with the QR/manual key, verify a current six-digit code and confirm `/admin` opens. Subsequent administrator sign-ins must satisfy MFA again. Keep secrets/codes in the app.

If a QR fails, retain the factor and use the manual-key fallback/verification. Cancel only matching unverified enrollment through the supported app action; never remove a verified factor to troubleshoot image display. Check real MFA separately from synthetic image/claim tests.

### Lost-authenticator recovery

This is owner-operated outside the application. Never remove factor rows with SQL or send setup keys, tokens or privileged keys through chat.

1. Verify the person's identity through an established contact channel. An available administrator should suspend the affected membership through Staff management.
2. If nobody can enter, the database owner may use the tested SQL below to suspend the existing administrator with revision/history preservation. Do not delete membership or convert it into an applicant.
3. Use supported Auth-user MFA reset controls or the privileged `auth.admin.mfa.deleteFactor` API outside the app. Verify session revocation. Signed access tokens can remain cryptographically valid until expiry.
4. Keep membership suspended for the project's **maximum access-token lifetime after revocation**; inspect that setting, do not assume a duration. Do not reactivate early and make an old AAL2 token useful again.
5. An authorized administrator/owner restores active membership with a new reason. The person signs in, enrolls and verifies a new authenticator before returning to administration.

The emergency owner can temporarily suspend the only administrator; ordinary app commands cannot. Replace the placeholder email/reason and run as owner with `suspended` first. Only after all recovery/revocation/waiting steps, run again with `active` and a fresh reason. The block is regression-tested from this named section. No self-service reset, SMS or experimental recovery codes are included.

```sql
do $$
declare
  account_email text := 'your-google-email@example.com';
  desired_status text := 'suspended'; -- later: 'active'
  change_reason text := 'Owner verified identity; suspended for authenticator recovery';
  target uuid;
  previous public.staff_memberships;
  changed public.staff_memberships;
  recovery_action text;
begin
  perform pg_advisory_xact_lock(20261019, 1);
  if char_length(btrim(change_reason)) not between 1 and 500 then
    raise exception 'Provide a short recovery reason';
  end if;
  select id into target from auth.users where lower(email) = lower(btrim(account_email));
  if target is null then raise exception 'Account not found'; end if;
  perform 1 from auth.users where id = target for update;
  select * into previous from public.staff_memberships where user_id = target for update;
  if not found or previous.role <> 'administrator' then
    raise exception 'Existing administrator membership required';
  end if;
  if desired_status = 'suspended' and previous.status = 'active' then
    recovery_action := 'suspend';
  elsif desired_status = 'active' and previous.status = 'suspended' then
    recovery_action := 'reactivate';
  else
    raise exception 'Recovery only supports active to suspended, or suspended to active';
  end if;
  update public.staff_memberships
    set status = desired_status, version = version + 1, updated_at = clock_timestamp()
    where user_id = target returning * into changed;
  insert into public.staff_access_history(
    actor_id, target_id, action, previous_role, previous_status,
    new_role, new_status, reason, target_version, mutation_id, request, result
  ) values (
    null, target, recovery_action, previous.role, previous.status,
    changed.role, changed.status, btrim(change_reason), changed.version,
    gen_random_uuid(), '{"source":"owner-authenticator-recovery"}'::jsonb,
    private.staff_member_json(changed)
  );
end;
$$;
```

### Hosted migration ledger

Repository and hosted versions differ. The first baseline was manually installed without a history entry. Inspect actual schema and this mapping; preserve applied files and deliberately reconcile history before a generic CLI push. For new schema changes, add a forward migration and regenerate types using the owning tool.

| Repository migration | Hosted version | Installation |
| --- | --- | --- |
| `202610180001_applicant_drafts.sql` | No migration-history entry | Manually installed before connection; draft tables, catalog, validator, save RPC, and read policy observed before staff installation. Not replayed. |
| `202610190001_staff_access.sql` | `20261019012439` | Applied through the connected Supabase migration tool. |
| `202610190002_staff_reason_validation.sql` | `20261019012443` | Applied through the connected Supabase migration tool. |
| `20261019053837_nonretryable_application_conflicts.sql` | `20261019054010` | Applied through the connected Supabase migration tool; replaces business-conflict SQLSTATEs in staff management and draft saves. |
| `20261019060538_applicant_submission.sql` | `20261019061952` | Applied through the connected integration; immutable applications, public history, owner intake settings, and post-submission draft guard. |
| `20261021110450_evaluator_workflow.sql` | `20261021112244` | Applied through the connected integration; assignment generations, private recommendations/history/receipts, Under Review and review-time withdrawal. |
| `20261021112900_separate_evaluator_identity.sql` | `20261021113034` | Forward correction rejecting assignment of the applicant as their own evaluator after a staff grant; function signatures and generated types unchanged. |
| `20261026120719_decision_publication.sql` | `20261026122247` | Publication/amendments, private decision audit/receipts, fixed capacities, published evaluator read access, and capacity-aware withdrawal. |
| `20261026132311_admin_application_queue.sql` | `20261026133325` | Administrator/MFA-protected read-only queue filters, 25-row pages, and all-matching total/status counts. |
| `20261026144314_intake_management.sql` | `20261026144942` | Intake state/history/commands; fixed November values preserved |
| `20261026155212_application_csv_export.sql` | `20261026155823` | Read-only administrator/MFA-protected complete filtered export snapshot; no data/grant/settings changes. |
| `20261031130046_required_resume_link.sql` | `20261031131551` | Required resume only for fresh submissions; historical snapshots, CHECK validation and receipts preserved. |
| `20261031184003_simplify_applicant_form.sql` | `20261101061419` | Versioned three-response form, legacy validation/receipts, monotonic draft upgrade, retired draft-only text and mixed-version export. Rollback-only hosted assertions passed; existing public/Auth data and grants preserved. |

## Deferred operations

### Backup tools and recovery prerequisites

Backups are prepared but **disabled/deferred**. The separate [backup workflow](../.github/workflows/backup.yml) permits only explicitly enabled private main, with daily 19:17 UTC scheduling, a fifteen-minute job and 35-day encrypted artifact retention. GitHub scheduling/storage policy is not a delivery guarantee. The source repository was verified private during delivery; no secret/key setup or live backup has been verified.

[backup.mjs](../scripts/backup.mjs) streams one read-only custom PostgreSQL snapshot of public/private/auth/supabase_migrations through age into ciphertext, with no plaintext backup file. Direct or port-5432 session-pooler host/user must match `BACKUP_PROJECT_REF`; TLS is required. Connection/lock/transfer bounds are fifteen seconds/ten seconds/ten minutes and 512 MiB. Only complete archives/manifests are published; failures remove partial output and suppress real stderr. Passwords remain in an allowlisted child environment, never arguments/logs. Tool image/version pins and age archive checksums are authoritative in [backup-tools.mjs](../scripts/backup-tools.mjs) and [installer](../scripts/install-backup-tools.mjs).

If the owner later resumes activation, designate the recovery-key custodian; generate an age identity on their trusted device outside GitHub/repository/chat and keep a second secure copy. Set variables `BACKUP_PROJECT_REF`, public `BACKUP_AGE_RECIPIENT` and secrets `BACKUP_PGHOST`, `BACKUP_PGPORT`, `BACKUP_PGUSER`, `BACKUP_PGPASSWORD`. These are database credentials, not API keys. First verify source versions/dependencies, an authorized real backup, compatible isolated recovery and monitoring/retention. Only then explicitly enable `BACKUPS_ENABLED=true`, dispatch on main and verify artifact download, hash and complete decryption. Do not activate during documentation/testing work automatically.

The synthetic-only [drill](../scripts/backup-drill.mjs) creates an isolated disposable PostgreSQL/Auth fixture with temporary keys, authenticates the complete encrypted file before SQL, restores transactionally, requires later-deletion replay and removes restricted plaintext/resources afterward. A replay failure is not recovery success. It is not managed Supabase/Auth/Google/MFA recovery evidence.

Real recovery remains owner-operated with the target isolated/app disconnected. Verify the trusted archive's project/time/commit/hash and fully authenticate decryption before SQL; inspect its TOC, dependencies, grants and target compatibility. A scoped native archive is not the CLI's provider-filtered migration SQL: do not blindly recreate/clean provider-owned schemas or reserved roles on a live project. Follow current provider guidance and rehearse the exact restore selection. Separately preserve provider/JWT/API/OAuth settings, custom roles/secrets, extensions and any Storage objects; they are not covered by this snapshot. Review session invalidation and encrypted MFA compatibility before reconnecting the app, with incident-specific cutover authorization.

Reapply **all deletions since the backup** using a current independently preserved record, not just an old ledger restored from that archive. Missing records/replay keep recovery incomplete. Provider logs, prior backups and staff-downloaded files have separate lifecycles. Production deletion-ledger reconciliation, real recovery and automated monitoring remain unverified/deferred.

### Finalization and retention

Future policy targets: 35-day encrypted backups, inactive drafts 30 days after intake closes, submitted data 180 days after recruitment finalization. No finalization/retention activation was added by intake controls or the reset. If later implemented, maintenance uses protected `CRON_SECRET` validation, bounded resumable batches and durable progress/failure records; daily Vercel Cron is planned and current free-tier limits must be rechecked. Verify replay-safe deletion and restoration before enabling it. Organization-controlled CSV copies require manual handling.

## Security and evidence boundaries

RLS on exposed tables, restricted grants and server authorization all apply. Guarded SECURITY DEFINER RPCs with empty search paths are intentional for atomic narrow transitions; private no-direct-grant tables can intentionally have no client policy. Do not silence advisor findings by exposing tables or removing required authority checks. The previously observed leaked-password-protection warning remains a project-setting item; this Google-only scope has no password workflow. Recheck current advisor status when changing schema/security.

Expected business conflicts use **PT409**, not custom **40001**. PostgREST retried custom 40001 serialization errors and caused the earlier hosted loop; the forward migration corrected them without changing ownership/history rules. The server still maps legacy errors for compatibility. Do not restore that code for version or duplicate-record conflicts.

Local PGlite/browser fixtures and rollback-only hosted constructed claims verify logical permission/workflow paths. They do not prove real Google/cookie/MFA behavior, Linux/Actions execution unless its exact run passed, deployed streaming, spreadsheet behavior or genuine concurrent load. See the [current evidence and gaps](progress-tracker.md) and [manual flow](manual-testing-flow.md).

Recruitment page titles use screen-reader headings rather than WorkspaceHeading banners; the shared banner component and unused selectors are removed. Applicant status remains in the reference section, and staff access messaging remains with its form. No data or authorization contract changes.

Application flow refinements: the reference section explains each current status and confirms server-acknowledged submission; Review warns that answers/URLs lock and withdrawal prevents reapplication. Administrator Unassigned, Awaiting recommendation and Ready for decision shortcuts preserve applied search/track/opportunity and reuse existing guards/filters. Evaluators can explicitly open the next unreviewed active assignment in the current search, using paginated reads and access rechecks; failures retain the current record. No new API, permission, notification or schema contract.


### Shared feedback presentation

Callout accepts typed severity, optional title/actions/id and an explicit optional alert/status role. Consumers retain existing live-region ownership to prevent duplicate announcements. Shared field-error/summary components preserve IDs, descriptions, focus and recovery handlers for their existing consumers. Apply retains inline FieldError but omits ErrorSummary, and uses compact connection/conflict/unknown-acknowledgement recovery without weakening frozen exact retries. MFA, staff, evaluation/decision/intake, portal/export and Apply reuse this presentation without changing transport, state machines, authorization or persistence. GoogleSignInButton reads actual form pending state.

Applicant OAuth initiation and callback return paths preserve only catalog-approved opportunity IDs on both success and failure. Callback redirects stay on the configured app origin and are not cacheable. Existing short-lived context cookies are cleared after the callback and on initiation failure; staff redirects ignore applicant opportunity IDs. The Google provider, callback, session exchange and access checks are unchanged.

A draft can hold an opportunity while its profile is incomplete or ineligible; the current validation still blocks moving past the Opportunity step and submitting an ineligible application. A different requested ID is advisory and cannot replace a saved choice without an explicit action. Accepting it returns the applicant to Opportunity if they were on a later step, retains draft fields and clears any prior role-specific scenario confirmation.
