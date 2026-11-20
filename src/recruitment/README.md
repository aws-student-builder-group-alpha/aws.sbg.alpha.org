# Recruitment domain

Recruitment is part of the root Next.js application at `/recruitment`. Install dependencies and run all commands from the repository root. Configure the root `.env.local`; no separate recruitment package or server remains.

See the [root setup guide](../../README.md), [architecture](docs/architecture.md), and [progress tracker](docs/progress-tracker.md). Recruitment uses its existing Supabase project and its own Google session on the main website deployment. Its OAuth return is `/recruitment/auth/callback`.

Recruitment administrators open Overview at `/recruitment/admin`. The sidebar links to Applications, Intake, Staff accounts, Organization members and Security activity. See the [recruitment user guide](docs/recruitment-user-guide.md) for role-specific steps.
