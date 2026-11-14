# Alpha Recruitment


## QA revision - 14 November 2026

The entry is now /opportunities: search roles, select Core Team/Committee/Member and open a role dialog for Google and processing consent. General Member uses the existing reviewed application without a fixed acceptance cap. Evidence is edited in Your story before weekly availability. Existing IDs and submissions remain compatible.

Forward migration 20261114080000_qa_member_opportunities.sql is installed on confirmed recruitment project xndpudtctuqxnbkhhmre as hosted version 20261114010319. Database SDK types are regenerated. The architecture ledger records the verified mapping; do not replay historical migrations. Configured application/staging checks and website deployment remain separate. Missing aggregate configuration displays unavailable counts. No provider/domain/paid-plan change is required.


This application is part of Alpha's main website and is delivered under `apps/recruitment` in the organization's `aws.sbg.alpha.org` repository. Use that repository's combined commands for a single local website on port 4300. Keep this application's separate lockfile and ignored environment; source consolidation does not change hosted accounts or permissions.

System Admins can use **Organization members → Add existing member** after the member signs in once with Google at Membership ID. They do not need a recruitment application. Staff record position, joining date and a private reason; the member completes their own portrait/name. See [setup](docs/community-services-setup.md#enrollment-and-membership).

Recruitment for AWS Student Builder Group Alpha: one **1–30 November 2026** cycle, two tracks and sixteen opportunities. Google sign-in, private drafts, immutable applications, evaluation, decisions/capacity, intake controls, CSV export and CI are implemented. [Current evidence and gaps](docs/progress-tracker.md) distinguish implementation from production readiness.

The 9 November expansion adds required private enrollment proof, System Admin/Organization Head labels over the existing guarded roles, status notifications, a staff email composer and approved membership IDs featuring Alphy. See [community-service setup](docs/community-services-setup.md). Email stays disabled until the Alpha sender's server credentials are connected; no live email-delivery claim follows from the local tests. The local practice form and membership preview remain separate from real submissions and registry records.

The **27 October full reset** removed the then-existing accounts, administrator/MFA setup and recruitment data while preserving schema/configuration. A nominated Google identity was subsequently bootstrapped as administrator, and the owner later reported the overall manual flow worked. These are dated records, not a current account inventory or a fresh MFA-session check. Future first-administrator setup requires separate owner authorization; do not repeat bootstrap automatically. Backup activation and retention/finalization are deferred. Deployment has not started.

## Run locally

Use Node **24.22.1** from [.node-version](.node-version) and locked dependencies:

```sh
npm ci
npm run dev
```

Set the public project URL/publishable key and exact local APP_URL in `.env.local` using [.env.example](.env.example). Keep Google OAuth secrets in Supabase provider settings. Use the terminal's Local URL, normally http://localhost:3000, and restart after environment edits. Missing configuration fails closed; there is no demo fallback.

The existing project is migrated. Read [local/owner setup](docs/architecture.md#owner-setup-and-recovery) and the [hosted migration ledger](docs/architecture.md#hosted-migration-ledger) before any schema or administrator setup; differing version IDs do not authorize replaying applied migrations.

## Test the application

Follow the [simple manual testing flow](docs/manual-testing-flow.md) with separate Admin, Evaluator and two Applicant accounts. It covers expected results for drafts/privacy, intake, submissions, reviews, publication, capacity, amendments, filtered CSV and withdrawal. New admin bootstrap and any bounded development test window require separate owner-authorized setup. Submission remains date-gated; reviews and decisions do not require open intake.

Install project Chromium once (`npx playwright install --with-deps chromium` on Linux, `npx playwright install chromium` on Windows), then run:

```sh
npm run verify:ci
```

This pipeline is designed to run lint, all Node tests, build, TypeScript, eight synthetic browser harnesses and source integrity without hosted credentials or a running app server. Consult the tracker for the current result and blockers; historical passing runs do not verify the latest UI. See [verification and diagnostics](docs/code-standards.md#verification). Synthetic claims/fixtures do not replace real Google/MFA or concurrent-load checks.

## Documentation

| Document | Use |
| --- | --- |
| [Project overview](docs/project-overview.md) | Scope, user flows and enduring product decisions |
| [Architecture](docs/architecture.md) | System/security contracts, migration ledger, owner setup/recovery and deferred operations |
| [Code standards](docs/code-standards.md) | Implementation conventions, CI commands and required checks |
| [AI workflow rules](docs/ai-workflow-rules.md) | Agent workflow and documentation ownership |
| [Progress tracker](docs/progress-tracker.md) | Current state, concise milestone evidence, gaps and next work |
| [Manual testing flow](docs/manual-testing-flow.md) | Easy-to-follow account-by-account testing checklist |
| [UI direction](docs/ui-direction.md) | Shared visual contract, page layouts, interaction, accessibility and motion |

The root [tokens](tokens.css), [glossary](GLOSSARY.md) and [agent instructions](AGENTS.md) retain their roles. UI direction also owns the shared design guidance. Detailed old investigations/decisions are in Git history. Current/former staff use separate applicant accounts; new submissions require an HTTPS resume link, portfolios remain optional, emails manual and the UI fixed light. Obsolete demo modules, tests, styles and scaffold assets have been removed; synthetic regression fixtures remain under tests.

Prepared backup tooling remains disabled; its [recovery prerequisites](docs/architecture.md#deferred-operations) are reference material, not the next automatic setup task. This README does not authorize activation, database changes, new accounts, a deployment or paid services.
