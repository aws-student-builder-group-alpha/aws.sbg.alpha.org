# AI Workflow Rules

## Membership invitations and layout recovery — 10 November 2026

The owner authorized a pending invitation and member acceptance flow for existing members, plus fixing the overlapping Staff management and Organization members sections. The owner separately approved transferring the existing verified Gmail app password into Vercel production Secret ALPHA_GMAIL_APP_PASSWORD for aws-alpha-recruitment. This setting was saved without printing or committing its value. Do not send live invitations while verifying this task; administrators explicitly review/send them in the product. SMTP verification without sending passed. Existing active memberships must be preserved.


The owner's 9 November expansion explicitly authorizes required enrollment uploads, staff-composed interview/decision emails, in-app notifications and approved membership IDs. It supersedes earlier out-of-scope/link-only/manual-email statements for these features. Preserve existing role/decision/capacity guards and free-only services. The nominated first System Admin is the verified Alpha mailbox account; do not silently elevate the separate applicant account to resolve a sign-in mistake. Record schema installation, account bootstrap, UI verification and actual email delivery as separate facts. Mail remains disabled until owner-provided server credentials are configured and verified. Never invent Calendly availability or a sent receipt.

## Start with the current context

Follow [AGENTS.md](../AGENTS.md). At every implementation start, context reset or resumed session, read the six mandatory context documents: [project overview](project-overview.md), [architecture](architecture.md), [code standards](code-standards.md), this workflow, [progress tracker](progress-tracker.md) and [UI direction](ui-direction.md). Before each major unit, reread the tracker and affected specifications.

Use the [manual testing flow](manual-testing-flow.md) for guided tests, [UI direction](ui-direction.md)/[tokens.css](../tokens.css) for shared visuals and [GLOSSARY.md](../GLOSSARY.md) for language. Read the relevant installed Next.js guidance before framework edits. The owner's latest explicit decisions govern; historical prototype behavior and old Git narratives are not current requirements where they conflict.

## Bounded work units

- Complete one feature or behavior-changing fix with its interface, authorization, persistence, checks and documentation. Split unrelated workflows, infrastructure, retention and backups into separate units.
- Preserve unrelated local edits. Do not expand routine work into dependency upgrades, repository restructuring or redesign without a requirement.
- Inspect code/configuration before asking for discoverable facts. Ask for missing decisions affecting scope, permissions or behavior. Record blockers and keep dependent work incomplete; choose routine details from existing standards.
- Preserve one November cycle, two tracks, sixteen opportunities, one application per account, one assigned evaluator and administrator publication. New submissions require an accessible HTTPS resume link; portfolios remain optional and email manual.
- Documentation work does not authorize hosted mutations, new features, deployment or Git delivery. Prior authorization persists within its actual scope; do not ask again for the same authorized step.

## Current owner decisions

- Focus on existing flows, reported bugs and deployment preparation. Backup activation and retention/finalization/deletion-ledger work are **deferred**; prepared backup tooling stays disabled.
- Remaining advanced hosted staff checks were waived as a prerequisite to subsequent features. Keep them unverified without weakening access rules or declaring the milestone fully verified.
- The **27 October full reset** explicitly included every identity, the original administrator, MFA and recruitment history. Its dated empty baseline supersedes older preservation instructions. Do not recreate accounts/data, grant a former email, enroll MFA, replay migrations or reopen intake automatically.
- Fresh staff setup requires a nominated Google identity that has signed in once and separately authorized owner bootstrap. A temporary development intake window needs explicit scope, captured originals and verified restoration under the owner's stated policy. Resume never bypasses dates.
- For the specific 28 October early testing opening, the owner selected restoration only when they request it. Preserve the original November 30 deadline; do not restore automatically after two hours, completion of submissions, cancellation or a session interruption. The tracker holds the original snapshot. On a restoration request, recheck current state/revision, preserve monotonic revisions and do not silently overwrite another administrator's changes or reverse final Close.
- Ordinary membership suspension/revocation does not turn staff into applicants. One-time owner resets add no app reset workflow or reusable destructive migration.
- The approved seven-route redesign covers `/apply`, `/application`, `/staff`, `/admin`, `/admin/applications`, `/reviewer` and `/admin/intake`. Both implementation phases are complete; current verification and delivery status belong in the tracker. Continue improvements in bounded units, with verification and documentation after each. Preserve existing permissions, workflow rules and shared branding; use scoped presentation without a new component library. The owner reported the existing manual flow worked before this redesign; keep that baseline distinct from new verification.
- The owner rejected the initial two-route visual pass and selected expressive Alpha branding. Their latest global-navbar plan supersedes compact and fixed-color route headers: use the landing navbar's appearance, adaptive colors, scroll motion and mobile menu everywhere, with consistent role-aware links. Preserve Home/Privacy's full footer and each page's task navigation; all seven process routes omit their footer. Home keeps its preloader, particle headline, gradient, catalog transitions and staged entrance. Its mobile supporting text remains 16px with natural wrapping. Rendered review and owner acceptance remain separate from passing checks.
- Commit/push, backup activation, secret setup and deployment remain separate actions unless already authorized by the current request.
- The latest Apply presentation uses a minimal dark promotional Google entry and white preparation/editor cards with navy text and lightly tinted fields over near-black Alpha waves; preserve the shared navbar, four steps, in-card progress, in-card normal-flow Save & exit/navigation and no secondary toolbar/global footer or repeated Privacy/Contact row. Preserve shared inline feedback, layouts and command/announcement behavior while applying the approved working/auth palette. Keep entry copy minimal and compact preparation/consent after Google; retain its privacy link and explicit no-JavaScript help while Home/Privacy footers keep privacy/contact access. Preparation uses Ready to start?, the approved short lead and consent, and Application details collapsed below Start application; preserve errors/recovery outside it. Apply validation is field-only: remove its repeated summary, focus the earliest affected step/first invalid control in visual DOM order after explicit blocked actions and open optional details before focus. Autosave/typing must not steal focus. Keep group associations, compact eligibility with Switch to Committee, and one compact fallback for unsupported form/stage/server errors. Other routes retain shared summaries. Routine intake success belongs only to explicit Refresh as quiet polite text; focus refresh stays silent. Preserve real read-error retries and frozen uncertain-submission recovery. Preserve all fields, eligibility, hosted v2 contracts, exact retries and legacy records. The simplified-form migration is already installed as `20261101061419`; this visual unit authorizes no hosted change, dependency, commit, push or deployment.
- The latest approved applicant simplification uses four sections, one page with three short responses (nonblank, at most 150 words), optional-profile disclosure and a final Review & submit step with required resume/optional portfolio links. Remove the separate experience/commitment essays for both tracks; keep resume mandatory and forward gates. Preserve answers on opportunity changes with explicit refreshed-scenario review. Upgrade unfinished drafts without truncation, keep retired text draft-only for copying, and preserve legacy submitted records/uncertain retries. Other routes retain their workflows; UI direction and architecture own detail.

## Protected artifacts and private data

The latest owner-approved shared process unit covers all six non-Apply recruitment routes: near-black waves, white task-specific surfaces, no process footer, dark anonymous staff/portal entry, compact inline field validation and normal-flow commands. Desktop lists remain bounded/sticky; phones retain list/detail state. It supersedes older utility-footer/white-page instructions for these routes. Apply now shares this working/auth palette; preserve Home/Privacy appearance, native confirmations, exact retry/access rules and current validation limits. No backend, schema, dependency, hosted or Git delivery change is authorized by this visual unit.

- Manage dependencies and lockfiles through npm. Do not patch installed packages, generated build output or SDK types by hand. Regenerate types through the owning Supabase tool and retain its output unchanged.
- Never edit applied migrations. Check the [hosted ledger](architecture.md#hosted-migration-ledger); reconcile the manually installed baseline and differing hosted version IDs before a generic CLI push.
- Retain generated Next.js blocks in AGENTS and perform its final feedback review. Keep only qualifying anonymized framework issues, not routine application/test bugs.
- Keep credentials, tokens, personal account identifiers, answers, notes, QR/setup material and decrypted backups out of source, fixtures, reports and logs. Use synthetic identities and narrow counts/assertions or opaque in-database fingerprints for hosted checks.
- Before connected operations, match the selected project to local public configuration, inspect schema/dependencies and follow current Supabase guidance. Use owner-only bootstrap and request-scoped application authorization. Constructed claims do not establish Google/MFA/browser verification.

## Seven-document ownership

`docs/` has seven canonical documents. The owner supplied [checklist.md](checklist.md) for the staged redesign and subsequently requested an easy tester handoff. It is now an auxiliary testing/review checklist linking to the canonical manual testing flow; implementation evidence stays in the tracker. Add specifications to their canonical home; do not add another runbook, ADR directory or archive without an explicit owner decision.

| Topic | Canonical home |
| --- | --- |
| Product scope, flows and enduring decision rationale | project-overview.md |
| APIs, storage, permissions, migration ledger, owner setup/recovery and operational boundaries | architecture.md |
| Coding conventions, implementation guidance and runnable checks | code-standards.md |
| Agent workflow and documentation policy | ai-workflow-rules.md |
| Current state, concise milestones, evidence/limits and next work | progress-tracker.md |
| Manual actions and expected results | manual-testing-flow.md |
| Layout, interaction, accessibility and motion | ui-direction.md |

README is the entry point; UI direction owns the shared design contract, while the root tokens and glossary retain their roles. Link to canonical sections and source contracts rather than repeating rules. Git history holds old detailed investigations/decisions; migrate important uncommitted facts before removing their originals.

## Finish documentation with the unit

After every meaningful unit, review all six context documents, update affected ones in the same unit and leave unaffected specifications unchanged. Always update the tracker with completed/remaining work, decisions, blockers and actual results. Identify documents reviewed, changes made and why others needed no edit. Keep current status/milestone evidence rather than a debugging transcript.

Distinguish planned, implemented, locally verified, hosted SQL-simulated and real-provider-verified behavior. Do not rewrite requirements to justify a shortcut, invent passing checks or call partial work complete. Saving a checklist is not executing it. Finish documentation before reporting completion or moving to the next unit.

## Verification and handoff

Follow [code standards](code-standards.md#verification). Application changes need appropriate regressions, lint, TypeScript and build; UI changes need keyboard/mobile/reduced-motion checks. Documentation-only work needs structure, UTF-8, local links/anchors and whitespace checks. Executable documentation examples retain their regression coverage.

Verify affected authorization, retry/conflict/failure paths and data/configuration preservation. Single-connection synthetic tests do not prove multi-connection load or provider/session behavior. Review the diff for unrelated changes and private/generated material, then report changes, real checks, limits and delivery state. A build or historical CI success alone is not production readiness.

The latest owner direction removes redundant recruitment page-title banners, including the Apply editor title strip. Keep accessible page headings, status/reference information and functional access explanations within content; preserve the shared navbar, Home hero and Apply welcome.

Application flow refinements: the reference section explains each current status and confirms server-acknowledged submission; Review warns that answers/URLs lock and withdrawal prevents reapplication. Administrator Unassigned, Awaiting recommendation and Ready for decision shortcuts preserve applied search/track/opportunity and reuse existing guards/filters. Evaluators can explicitly open the next unreviewed active assignment in the current search, using paginated reads and access rechecks; failures retain the current record. No new API, permission, notification or schema contract.
