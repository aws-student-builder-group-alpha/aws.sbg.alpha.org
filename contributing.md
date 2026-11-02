# Contributing

Thanks for helping improve the AWS Student Builder Group - Alpha website. This guide covers the local setup and checks used in this repository.

## Set up locally

Use Node.js and npm, then install the locked dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Some member and admin features need a Supabase project. Ask a maintainer for development credentials and configure them in `.env.local`. The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server-side admin actions also use `SUPABASE_SERVICE_ROLE_KEY`. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local auth flows. Never commit `.env.local`, service-role keys, OAuth secrets, or real member data.

## Before opening a pull request

Run the repository's validation command:

```bash
npm run verify
```

This runs ESLint on `src`, `scripts`, and `next.config.ts`, then checks TypeScript types. To check a production build, run:

```bash
npm run build
```

The build runs `npm run fetch-events` first and needs network access to retrieve public Meetup event data. The generated event JSON is ignored by Git; make source changes in the event data layer or fetch script instead of editing generated output.

## Make a focused change

- Create a branch from the target agreed with the maintainers. Existing branch names use prefixes such as `feat/` and `fix/`.
- Keep each change focused and follow the surrounding TypeScript, React, and Tailwind patterns. Use the `@/*` import alias and kebab-case filenames for new modules.
- For UI work, check the affected pages at mobile and desktop widths, and preserve keyboard access, semantic HTML, and readable contrast.
- For authentication, authorization, or database-related work, validate inputs on the server and keep privileged Supabase operations in server-only code. Do not weaken role or approval checks to make local testing easier.
- Do not commit generated build output, local environment files, credentials, or personal/member data.

Use commit subjects that describe the change. The repository history uses prefixes such as `feat:` and `fix:` (for example, `fix(admin): preserve table scrolling`).

## Open a pull request

Open a pull request against the branch specified by the maintainers. Include:

- What changed and why.
- The commands you ran and whether they passed.
- Screenshots for visible UI changes, including the viewport size when useful.
- Any required environment or Supabase setup, schema changes, or follow-up work.

Keep the pull request description and review discussion free of secrets and private member information.
