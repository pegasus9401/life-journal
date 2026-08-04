# Architecture

## System shape

Life Journal is a modular monolith: one Next.js application and one Supabase project, separated internally by product capability. This keeps delivery and transactions simple while preserving boundaries that can support future modules.

- **Next.js App Router:** routing, server rendering, Server Actions, and route handlers.
- **Supabase:** PostgreSQL, Auth, Storage, Row Level Security, and database migrations.
- **Vercel:** builds, previews, production hosting, and environment configuration.
- **External AI and mapping providers:** adapters introduced only when their phase begins.

## Code boundaries

```text
app/                 routes, layouts, metadata, error boundaries
components/          truly app-wide visual primitives only
features/auth/       authentication use cases and UI
features/travel/     complete Travel Journal product module
  components/        travel-specific presentation
  actions/           authenticated mutations
  queries/           server-only reads
  schemas/           input validation
  types/             domain-facing types
shared/              cross-feature utilities and composition
lib/                 framework/provider adapters (Supabase, maps, AI)
hooks/               shared hooks only when reuse is proven
services/            external service orchestration when introduced
styles/              tokens and global visual foundations
types/               cross-module types only
```

Directories are created when they contain real code; empty scaffolding is avoided. Travel lives under `features/travel`, rather than a duplicate root `travel`, so ownership is unambiguous.

## Dependency rules

- `app` may compose features; features must not import from `app`.
- Features may use `shared`, `lib`, and cross-module types, but not another feature's internals.
- Provider SDKs are wrapped in `lib` or `services`; product components do not call them directly.
- Reads happen in Server Components or server queries. UI mutations use Server Actions. Route handlers exist for callbacks, webhooks, or external clients.
- Client Components are limited to interaction boundaries; private data is loaded on the server.

## Security and reliability

Every user-owned table has `owner_id`, Row Level Security, explicit policies, and indexes supporting those policies. Authorization is enforced in the database, not only in routing. Uploads use private buckets and signed URLs. Destructive operations use archival or explicit confirmation where appropriate.

## Evolution

Begin with a modular monolith. Extract a service only when scale, isolation, or operational ownership makes the cost worthwhile. Future Life modules get their own feature boundary and migrations without sharing Travel-specific entities.
