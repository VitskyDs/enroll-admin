# Enroll admin — Claude instructions

## Project overview

Enroll is a white-label loyalty platform for small service businesses, split across four repos. This repo (`enroll-admin`) holds the business owner-facing admin app — owners configure their loyalty program, manage their customer list, and take targeted action to retain at-risk customers. One platform, multiple businesses (multi-tenant), but each admin login manages a single business.

This repo lives as a sibling folder inside a shared `enroll-repos/` parent alongside the other Enroll repos and the shared backlog — see "Related repos" below. If you only have this one repo checked out standalone (not inside `enroll-repos/`), the `../backlog` and `../enroll-*` paths referenced throughout this file won't resolve; get the sibling layout set up first (ask the user, or see `enroll-backlog`'s README).

## Related repos

| Repo | Purpose |
|---|---|
| `enroll-admin` (this repo) | Admin app (business owner dashboard) |
| `enroll-consumer` | Consumer app |
| `enroll-ui` | Design system — `@vitskyds/enroll-ui`, GitHub Packages |
| `enroll-core` | Shared app code — `@vitskyds/enroll-core` (Supabase client, types, AuthContext, i18n), GitHub Packages |
| `enroll-backlog` | Shared task tracker + docs (Backlog.md) for all of the above |

## Docs (read these before working on any task)

The backlog lives in the sibling `enroll-backlog` repo, at `../backlog` relative to this repo.

**Always read `../backlog/docs/doc-12` first** — before planning, before implementing, before asking clarifying questions. It is the master PRD and single source of truth for what the platform is, what every feature does, and what is in or out of scope. If this doc conflicts with any other doc, doc-12 wins.

After reading doc-12, consult the specific doc it points you to for the area you're working in:

| Doc | Purpose |
|---|---|
| `../backlog/docs/doc-12` | **Master PRD** — read first, every time. Feature index, scope, and doc map |
| `../backlog/docs/doc-11` | Admin app product spec |
| `../backlog/docs/doc-7` | Developer guide — conventions, patterns, file layout |
| `../backlog/docs/doc-8` | Consumer app data model — schema, types, RLS rules (shared Supabase project, still relevant here) |
| `../backlog/docs/doc-10` | Loyalty program design — mechanics, tiers, earn rules |
| `../backlog/docs/doc-13` | App login — how to sign in to every app/environment, test credentials |

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| UI components | `@vitskyds/enroll-ui` — design system package, GitHub Packages (shadcn/ui-based, new-york style, zinc base) |
| Shared app code | `@vitskyds/enroll-core` — Supabase client, types, AuthContext, i18n, GitHub Packages |
| Database + auth | Supabase (Postgres + Auth) — same shared project as `enroll-consumer`, no separate admin database |
| Font | Inter + Public Sans via `@fontsource-variable`, bundled in `enroll-ui` |
| Package manager | npm |

## Key file locations

- Entry point: `src/main-admin.tsx` (not `main.tsx` — a naming leftover from the original combined-repo split, harmless but worth knowing so it isn't mistaken for missing)
- Router/layout shell: `src/AppAdmin.tsx`
- Owner pages: `src/pages/owner/` (Dashboard, Customers, Products, Rewards, Program, Settings, CatchUp, Onboarding)
- Shared-with-consumer pages (duplicated, not in `enroll-core` — see "Known duplication" below): `src/pages/SignIn.tsx`, `src/pages/AuthCallback.tsx`
- Types: `src/types/index.ts` (re-exports `@vitskyds/enroll-core`)
- Supabase client: `src/lib/supabase.ts` (wraps `@vitskyds/enroll-core`)
- Auth context: `src/contexts/AuthContext.tsx` (wraps `@vitskyds/enroll-core`)
- UI primitives: `@vitskyds/enroll-ui` package — do not import from `src/components/ui/`
- Owner-only components: `src/components/owner/`, `src/components/owner-layout.tsx`
- Hooks: `src/hooks/`

## Known duplication (from the TASK-114 repo split)

A handful of files were copy-pasted into both `enroll-admin` and `enroll-consumer` rather than factored into `enroll-core`, because they weren't purely shared logic: `SignIn.tsx`, `AuthCallback.tsx`, `useTenant.ts`, `useBusiness.ts`, `CurrencyContext.tsx`, `dev-sign-in.tsx`. This is an accepted tradeoff, not an oversight — but it means:
- Some of these files still contain **leftover consumer-app logic that doesn't apply here** (this admin app has no tenant/multi-business-per-login concept). TASK-128 fixed one instance of this (`AuthCallback.tsx`'s non-owner redirect fallback calling a dead consumer-app tenant-routing helper). `useBusiness.ts` has a similar latent issue (falls back to a hardcoded `DEFAULT_TENANT` when there's no tenant in the URL, which is always true here) — it happens to work by accident, not filed as a bug yet.
- If you change one of these files for an admin-specific reason, the consumer repo's copy does NOT get the change automatically — check whether the change is admin-only or should be ported to `enroll-consumer` too (or promoted into `enroll-core` if it's genuinely shared and diverging copies would be a problem).

## Path alias

`@/*` maps to `./src/*`. Always use the alias for imports within the project.

## Writing and style conventions

- **Sentence case only** for all headings, labels, and UI copy — never Title Case
- No emojis unless explicitly requested
- Keep code concise — no unnecessary abstractions or comments
- No hard-coded hex values in JSX except for brand-color theming

## Git workflow

- Create a branch per task: `task/<id>-<slug>`
- When starting a new task: merge the previous task branch into `main`, then branch off `main` for the new task
- Commit and push freely on task branches
- Merging a task branch into `main` locally is fine as part of finishing a task
- **Pushing to `main`** (including `origin/main` after a local merge) **requires the user's explicit go-ahead in that turn** — e.g. "push", "merge and deploy", "deploy this". This is standing authorization: when the user says so, push `main` directly, no PR needed. Do not treat approval from an earlier turn as still valid later — ask again if it's been a while or the context has shifted.
- Never open a PR for this repo unless asked — the user handles PRs

## Task workflow

- Use the backlog MCP tools (`mcp__backlog__task_list`, `mcp__backlog__task_view`, `mcp__backlog__task_edit`) to manage tasks — the backlog is shared across all Enroll repos (see `enroll-backlog`), not specific to this one
- When filing or editing tasks that reference source files, name which repo the file lives in (e.g. `enroll-admin/src/pages/AuthCallback.tsx`), since a task's references may span this repo, `enroll-consumer`, or both
- Mark a task as `In Progress` when starting it
- Mark a task as `Done` when implementation is complete (user acts as QA but does not update task status)

## Node

Node is at `~/.nvm/versions/node/v24.14.0/bin` — always prepend to PATH in Bash calls.

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`VITE_ENABLE_EMAIL_AUTH=true` also enables the email/password test sign-in form on production custom domains (always on for localhost/preview) — see `../backlog/docs/doc-13`.
