# Code Standards

## QA verification implementation - 14 November 2026

Browser fixtures compile the real directory/availability helper and use real isolated SQL aggregates. Retain consent/save/retry/withdrawal/account-loss coverage after moving evidence. Historical baseline tests compare their original catalog; current-schema tests include Member. Wait for computed CSS transitions rather than advancing only a mocked JavaScript clock. Production-page checks and synthetic authenticated checks remain separate from real provider evidence.


## QA contracts - 14 November 2026

Track handling must be exhaustive for CORE_TEAM, COMMITTEE and MEMBER, including validation, staff filters, CSV labels and UI readers. Unlimited capacity is null, allowed only for General Member; do not substitute a large numeric limit. Public vacancy data is aggregate-only and does not authorize writes or guarantee a place. Keep SQL and runtime tests for legacy records, new Member submissions, aggregate privacy, capacity release and exact retries. Existing generated SDK files and installed migrations remain untouched.


## Quick links and member portraits — 10 November 2026

Test multipart uploads through the actual client helper and actual upload handler; a successful mock that ignores FormData fields does not verify a browser/server contract. The membership photo regression reproduces the old photo-field rejection, then verifies private persistence and 512×640 processed PNG retrieval. The root section-navigation lifecycle test simulates pin refresh, user interruption and reduced motion and runs in recruitment CI with its installed SWC runtime.


## Membership invitations and layout recovery — 10 November 2026

Use memberEntry for verified membership/invitation routing; a failed lookup must not be interpreted as no membership. Preserve submitted-application receipt access. Invitations do not create Auth identities or assume first sign-in. Keep request IDs stable across uncertain invitation creation and prohibit automatic email resends after a claim. Test the database boundary and actual HTTP transport using synthetic recipients, including wrong accounts, missing MFA, duplicate acceptance and forged delivery receipts. Regenerate schema.ts from the owning Supabase tool after additive DDL.


The main-site repository keeps this app under `apps/recruitment` with its own lockfile, lint configuration and TypeScript scope. Run its checks from that directory or with `npm --prefix apps/recruitment`. Root main-site lint/types exclude the nested app so framework versions and generated types cannot leak between apps. Remove code only after checking callers, dynamic/framework entry points and current tests; preserve generated SDK types and applied migrations.

Keep the explicit app-local Turbopack and tracing roots in `next.config.ts`. Verify the default Turbopack build through recruitment CI as well as the combined launcher's webpack build; one bundler passing does not establish configuration isolation for the other.

## General and TypeScript

- Scroll-scrubbed transforms/opacity must not also have CSS transitions on those properties. Keep hover transitions on separate properties/elements, and verify that stopping/reversing scroll stops/retraces the rendered state without lag.

- Enrollment uploads and membership portraits use bounded multipart handlers, signature/MIME checks, private Storage and per-request identity. Never trust a filename or client role. Re-encode portraits with a pixel bound and strip metadata. Keep submitted proof immutable and enrollment review distinct from automated verification.
- Outreach recipients come from the authorized immutable application, never a free-form email input. Keep fixed sender, plain text, exact request IDs, one sending claim, bounded quotas and honest uncertain acknowledgements. SMTP passwords and privileged Supabase keys are server-only and never logged, returned, committed or prefixed NEXT_PUBLIC_.
- Member ID rendering draws untrusted text through canvas text methods and loads only local brand assets or an authenticated own-photo blob. No arbitrary remote image fetch, HTML injection or public membership enumeration. Preserve accessibility outside the canvas and a reduced-motion layout.
- Keep composition, interaction, domain validation, transport, authorization and storage responsibilities separate. Prefer small coherent changes and fix causes rather than compensating behavior.
- Match existing two-space indentation, double quotes, semicolons, PascalCase components and camelCase functions/variables. Use kebab-case filenames and installed framework conventions.
- Keep strict TypeScript. Treat external values as unknown until validated; avoid any, unchecked casts and non-null assertions. Define narrow role-specific DTOs instead of exposing full records.
- Strip-types Node tests import pure TypeScript modules with explicit `.ts` extensions; use strip-compatible syntax and the existing built-in test runner.
- Add dependencies only for a requirement, through npm with the corresponding lockfile. Do not patch installed code, generated build files, generated SDK types or applied migrations.
- Keep secrets, personal account identifiers, answers, notes and authenticator material out of code/logs/reports. Synthetic data supplies fixtures; operational logs contain only narrow metadata.

## Next.js and UI

Follow [AGENTS.md](../AGENTS.md) and read the relevant installed guide under `node_modules/next/dist/docs/` before framework changes. Default to Server Components; add client boundaries only for interaction/browser APIs. Keep privileged modules server-only.

Create a request-scoped Supabase client/session for every protected operation; never reuse mutable user sessions. With Cache Components, keep request-time identity behind Suspense and follow the established `connection()` initialization. Never cache private views/data across users. Proxy cookie refresh and page gates complement, rather than replace, authorization in every action/handler/RPC.

MFA mutations use Server Actions; the bounded JSON Route Handlers described in [architecture](architecture.md#identity-permissions-and-transport) handle staff/application/evaluation/decision/intake commands. Preserve OAuth callback origin validation and private/no-store responses.

Use the shared visual contract in [UI direction](ui-direction.md), [tokens](../tokens.css) and [glossary](../GLOSSARY.md). Keep stylesheet order: base globals, canonical tokens, scoped redesign. Public Home/Privacy keep their fixed palette; working process surfaces are light and anonymous entry is dark; verify both device preferences, legacy choices and JavaScript-disabled rendering. Use semantic controls/headings, labels, field/error associations, visible focus, responsive layouts and native confirmation dialogs. Existing GSAP hooks must clean up, pause ambient work offscreen/hidden and respond to reduced motion; never delay validation or hide essential content behind animation.

Derive display state rather than synchronously copying it in effects; use effects for external synchronization. Preserve edits after errors/conflicts/outages. Success requires acknowledgement; render loading, empty, failed and acknowledged states distinctly.

Stage workspace presentation through explicit route/component opt-ins and scoped CSS. Preserve shared defaults for routes awaiting design review; replace superseded wizard selectors instead of stacking broad overrides. Tabs use linked tab/panel semantics and arrow/Home/End keyboard behavior. Keep selected record panels mounted while hidden so tab changes and mobile Back to list preserve edits and exact retries. View changes perform no writes; different-record/filter navigation retains dirty-edit confirmation and pending-command guards. Form controls moved outside a disabled fieldset must explicitly preserve its frozen state and form association.

Keep static route-layout markers and derive root header/footer frame attributes from active layout segments during SSR/rendering. Applicant, staff-entry, administrator and evaluator frame variants are presentation only; one administrator parent layout covers its three destinations. Use one shared landing navbar and scope footer visibility through the chrome's own attributes, never a body-wide search for workspace content: Cache Components retains hidden prior pages in the DOM. Preserve the public frame and authorization boundaries without an after-mount appearance switch. Disclosure controls expose expanded state and keep inputs mounted. Selecting a previous application progress segment focuses the section heading; forward steps use Continue and prerequisite validation. Check actual production CSS and shared-shell screenshots: retain 44px targets, the specified first-field/row folds and unobscured keyboard focus.

Measure the real closed navbar row for sticky/focus offsets and clean up its ResizeObserver. Keep the navbar dark and visible while scrolling without reading the content underneath it. Keep the Home entrance scoped to its navbar context. Menus use one configuration per verified account state, remain reachable in short viewports and scale their desktop breakpoint with text.

Responsive checks must compare visible controls' actual left/right bounds with the viewport as well as document scroll width. The shared root overflow clipping can hide an offscreen action from a scroll-width assertion. Apply coverage includes all four sections at six widths, writing controls at 320/375/414px with 200% text size, and a short viewport with unobscured focused writing.

The latest `/apply` process shell retains the shared navbar and suppresses only the global footer, with no secondary toolbar/account menu. Keep progress inside the form card and all actions immediately after the form inside that same card. Omit the repeated Privacy/Contact row; retain linked processing consent and explicit no-JavaScript privacy/contact help. Preserve unsaved/pending markers and all save/retry guards. Bound decorative canvas allocation to the viewport with DPR at most 1.5; pause offscreen/hidden, disable Apply pointer effects, clean up observers/listeners and provide reduced-motion/static CSS fallbacks. Preserve Home renderer defaults. Entry alone uses a 220ms fade/rise; the existing 160–200ms step entrance must not restart during typing/autosave. Keep actions static in normal document flow at every viewport, with a top divider and no separate viewport background. Preserve explicit form association and disabled-command semantics. Use typed routine intake status/read errors separate from submission recovery; manual refresh success is compact polite text, focus refresh is silent and unknown receipts retain exact retries. Use shared scoped process tokens for near-black waves, white cards, navy text and lightly tinted fields with visible accessible control borders; retain shared severity colors and Home defaults. Keep preparation within 600px with a full-width Start action and collapsed details below it. Stack fields, place Back/Continue together and quiet Save & exit below on phones, and verify contrast, long-email wrapping, 200% text and first-field visibility under both device preferences.

Use shared required-field rules for step gates, readiness and blur feedback. Structural safety must not suppress required errors when another section has an invalid URL. Apply validation stays inline without a repeated error list. Explicit blocked navigation/submission/manual-save recovery selects the earliest affected step, scans actual DOM-order controls/groups and opens hidden optional details before focusing the first invalid target. Preserve aria-invalid/error IDs, navbar scroll margins and no focus movement during typing/autosave. Unknown form/stage/server errors get one compact recovery message near actions. Blocked navigation shows the earliest relevant errors without advancing saved progress; navigation-target blur must not move a pointer target before activation. Keep legacy record parsing and retry paths compatible when tightening fresh-submission validation.

## API and database rules

For the shared recruitment process presentation, scope new styles to `.recruitment-process`; Apply retains its separate opt-in. Use one layout background host, including fallback/access states, with the administrator host shared across its child routes. Preserve hidden Activity cleanup and active-route chrome selection. Reuse `useInlineValidation` for field presentation: preserve native constraints and exact existing length semantics, focus only after an attempted action or identifiable code rejection, and wait for disabled transition controls to become available before focus. Avoid pointerdown-to-click layout shifts and behind-dialog focus. Keep generic server failures with the command owner; do not match message text to invent field mappings or change server DTOs. Extend existing browser suites with real layout composition, field associations, enlarged-text/short-viewport checks and recovery assertions.

- Validate origin, media type, body/query size, closed field sets and runtime DTOs. Derive ownership from verified identity; supplied account IDs only detect account switches. Recheck current staff state, assignment generation and administrator MFA as applicable.
- Keep handlers thin and use stable errors: authentication/permission/missing/conflict/validation/unavailable are distinct. Do not return raw SQL errors, records or stack traces.
- Reads/access checks are eight seconds and commands fifteen seconds, including body parsing. Forward cancellation; cancellation does not prove rollback. Retain exact uncertain input/mutation ID/revisions for retry and ignore obsolete responses. Refresh failures cannot erase acknowledged success; revisions merge monotonically.
- Business conflicts use PT409. Do not throw custom 40001 serialization errors for revisions/duplicates: PostgREST can retry them indefinitely. Test the current migration fixtures and legacy server mapping without restoring the old SQL behavior.
- Enable RLS on exposed tables and grant only needed operations. Prefer invoker functions; guarded SECURITY DEFINER transitions require restricted EXECUTE, an empty search path, qualified objects, verified identity/current authority and narrow results. Direct grants must not bypass the RPC-only workflow.
- Use atomic PostgreSQL transactions for snapshots, receipts, history, decisions and capacity; sequential SDK calls are not a transaction. Follow the account/application/assignment/review/capacity lock order and authority checks before cached receipts. See [storage contracts](architecture.md#storage-and-workflow-contracts).
- Preserve immutable submitted answers and private review/decision history. Use current-assignment reviews only. Count accepted occupancy after the capacity lock. Return explicit CAPACITY_FULL feedback and never promote a waitlist automatically.
- Store UTC and render Asia/Manila. Server time gates intake. New submissions require a validated HTTPS resume URL; portfolios are optional; do not fetch/embed/scan linked documents. No applicant data or appearance preference is stored in local storage/IndexedDB.
- CSV generation escapes/neutralizes formulas without changing stored values. Downloads validate allowed metadata, complete bytes and the 64 MiB/fifteen-second limits; reject partial/error bodies and never await stalled cancellation. Revoke Blob URLs and preserve unsaved editors. The fixed header source is linked in the [CSV contract](architecture.md#csv-export-contract).
- Regenerate `lib/supabase/schema.ts` through the owning Supabase tool and preserve exact output. Check the [hosted ledger](architecture.md#hosted-migration-ledger) before DDL; add forward migrations instead of editing applied ones. Hosted verification uses narrow assertions and independent preservation fingerprints.
- Operational automation remains deferred. If later authorized, protected maintenance validates CRON_SECRET and uses bounded resumable/repeat-safe jobs. Recovery must reapply independently preserved deletions before reconnecting the app.

## Code ownership and regression coverage

| Area | Code and checks |
| --- | --- |
| Catalog and drafts | `lib/catalog.ts`, drafts/save-queue helpers, draft domain/database/action tests |
| Identity/staff/MFA | Request-scoped session/server modules, staff/client/HTTP helpers, staff database/HTTP/client tests and authenticator browser harness |
| Submission/portal/withdrawal | Application validation/server/client modules, application database/HTTP/client tests and submission browser harness |
| Evaluation | Evaluation contracts/server/client/editor state, database/HTTP/editor tests and evaluator browser harness |
| Decisions/capacity | Decision contracts/server/client/editor state, database/HTTP/client tests and decision browser harness |
| Queue/intake/export | Their closed contracts/server/client helpers, dedicated Node/database tests and browser harnesses |
| Generated/hosted schema | Supabase tool output and forward migrations; constructed claims are not provider-session evidence |
| CI/backup tooling | `scripts/`, workflows and process-policy regressions; real backup crypto/PostgreSQL evidence needs its separate synthetic drill |

Keep production code in app/lib, schema work in supabase, public-only assets in public and fixtures/regressions in tests. Test current domain/server behavior rather than retaining superseded prototype implementations; shared UI types come from current contracts. Before pruning CSS, check all live class references and preserve the remaining selectors, declarations and media conditions. The seven canonical documents have ownership defined by [workflow rules](ai-workflow-rules.md#seven-document-ownership); the owner-authorized testing/review checklist is an auxiliary handoff, not another specification. Do not add separate feature runbooks/ADRs by default.

Downloaded agent tooling under `.agents/skills/` and `.aider-desk/` is maintained independently and excluded from application ESLint. Preserve owner-installed tooling; application source, scripts and browser regressions remain in lint scope. Redesign browser fixtures render the real shared masthead/footer and compiled stylesheet order around the affected components while keeping synthetic identities under tests. Their shared browser-motion fixture loads the installed GSAP and React hook bundles, preserving real header/dialog dependencies, media handling and cleanup; ordinary decorative entrance hooks remain synthetic. Keep navigation behavior assertions in the existing browser suites rather than replacing missing animation imports with silent no-ops.

Test allowed/denied roles, account/assignment loss, exact duplicate requests, current/old receipts, revision conflicts, field/Unicode/byte bounds, timeouts/body stalls, obsolete reads and dirty-edit preservation where affected. Intake tests include schedule boundaries, final Close and explicit replacement-read races. Export tests include queue predicate parity, exclusion of private/evidence values, complete output over 4.5 MB, 1,000 synthetic records, formulas/Unicode/quotes/newlines, interruption and cancellation. Local benchmarks are not deployed/concurrent measurements.

## Verification

The applicant browser harness defaults to `.next`. For the combined local production build, run it with `ALPHA_BROWSER_BUILD_DIR=build/combined`; it reads that build's CSS references and handles their `/recruitment` asset prefix. Do not validate current TSX against stale standalone styles. The harness keeps synthetic identity, HTTP and SQL coverage separate from live provider checks.

Use **Node 24.22.1** from [.node-version](../.node-version), locked packages and project-pinned **Playwright 1.63.0**. Initial setup:

```sh
npm ci
```

Install Chromium/system dependencies on Linux:

```sh
npx playwright install --with-deps chromium
```

On Windows:

```sh
npx playwright install chromium
```

Run the full portable pipeline:

```sh
npm run verify:ci
```

It validates the Node pin, then runs zero-warning lint, every Node test through two-worker `test:ci`, production build, TypeScript, all eight standalone browser harnesses and source integrity. Build precedes standalone type/browser checks so generated types/stylesheet shell exist in a clean checkout. The harnesses require no running Next server, external Playwright path, hosted credentials, migration or Docker. `playwright test` is not a substitute for these custom scripts.

For ordinary local checks use `npm test`, `npm run lint -- --max-warnings=0`, `npx tsc --noEmit` and `npm run build`; browser checks after building are `npm run test:browser`. Run checks appropriate to the change, including the required suite/static/build checks for application changes. Broaden/repeat only for new changes, failures or unresolved concerns. UI changes also need mobile/keyboard/dialog/reduced-motion checks. Documentation-only changes need structure, UTF-8, local links/anchors, stale references and whitespace checks. A relocated executable SQL example retains its existing regression test; do not drop coverage to make a cleanup pass.

### CI process and diagnostics

[CI](../.github/workflows/ci.yml) runs push/main, PR/main and manual dispatch on Ubuntu 24.04 with the Node pin, npm ci/download cache, official Chromium installer, full official Action SHA pins, contents/read, no stored checkout credential, a twenty-minute job and superseded-run cancellation. No privileged PR trigger, branch-protection change, service credential or deployment is configured.

`verify:ci` requires npm invocation and the exact runtime. Child environment strips known hosted/service tokens and explicitly empties public Supabase configuration so dotenv cannot enable access. APP_URL is localhost and telemetry disabled. Before/after fingerprints cover tracked and nonignored source, including existing local edits; generated/ignored output is excluded. Source mutation fails the pipeline.

Browser suites run authenticator, staff manager, applicant submission, evaluations, decisions, queue, intake and export sequentially. Each has a two-minute process-tree timeout; failures/timeouts remain failures, later suites continue and the aggregate exits nonzero without automatic retries. Browser/aggregate overall bounds are twelve/fifteen minutes. Cancel/timeout kills descendants. Missing build/dependency/Chromium setup produces actionable failure summaries. Tests exercise real child failures, descendant termination, cancellation, environment isolation, YAML/pins/artifact policy and source mutation.

Ignored `.next/verification/ci/` holds bounded logs and metadata-only summaries. Earlier stage logs survive build cleanup in memory. The workflow uploads only its explicit CI log/JSON and known synthetic PNG paths for seven days; it excludes environment files, downloads, profiles, database files and the full build. Cleanup refuses symlinked diagnostic paths. A cancelled/missing-artifact run is not passing evidence. Local Windows, GitHub Ubuntu and real provider/load checks remain distinct.

### Owner recovery and deferred backup checks

The canonical [lost-authenticator recovery SQL](architecture.md#lost-authenticator-recovery) is executed by the existing staff database regression against synthetic identities. Match the named section, not the first arbitrary SQL fence in the document; preserve its suspension/restoration, revision and append-only history assertions.

Backup tests cover source/local-target guards, encrypted-only job policies, streaming failure/partial cleanup/redaction, cancellation/time/byte bounds and integrity. The separate command below needs Docker, age and age-keygen and uses disposable synthetic resources only:

```sh
node --experimental-strip-types scripts/backup-drill.mjs
```

If executables are outside PATH, set BACKUP_AGE_BIN and BACKUP_AGE_KEYGEN_BIN. It verifies real encryption, wrong-key/tamper rejection before SQL, PostgreSQL/schema/grant recovery and idempotent post-snapshot deletion replay; failed replay cannot report success. Regular fake byte-transformer tests verify process plumbing, not cryptography. Real managed Auth/provider recovery and deletion reconciliation remain unverified/deferred; see [deferred operations](architecture.md#deferred-operations).

Application flow refinements: the reference section explains each current status and confirms server-acknowledged submission; Review warns that answers/URLs lock and withdrawal prevents reapplication. Administrator Unassigned, Awaiting recommendation and Ready for decision shortcuts preserve applied search/track/opportunity and reuse existing guards/filters. Evaluators can explicitly open the next unreviewed active assignment in the current search, using paginated reads and access rechecks; failures retain the current record. No new API, permission, notification or schema contract.

Version application JSON and question definitions when requirements change. Preserve closed v1/v2 schemas, legacy snapshot CHECK validity and original prompt rendering. Test upgrades alongside exact frozen retries, monotonic form versions, retired-draft exclusion and mixed CSV column alignment. The simplified editor has three nonblank responses capped at 150 words, without word targets, and a persisted opportunity-bound scenario review after changes.


### Shared feedback verification

Use typed shared Callout variants and explicit announcement roles. Do not derive assertive announcements from color or nest live regions when migrating existing messages. Keep routine loading/count/save status quiet. Preserve field-error IDs and existing linked-summary consumers; Apply instead focuses its first invalid control and uses compact recovery. Preserve command freezing, input retention and exact retries. Test severity appearance and announcement ownership as well as recovery interactions; appearance changes do not authorize new notifications or validation rules.
