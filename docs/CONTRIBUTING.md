# Contributing

## Feature workflow

1. State the user goal and success criteria.
2. Design the complete flow, including empty, loading, error, offline, and permission states.
3. Explain data ownership, boundaries, security, and migration impact.
4. Implement the smallest complete vertical slice.
5. Review UX, accessibility, security, performance, and maintainability before continuing.

## Local setup

1. Install with `pnpm install`.
2. Copy `.env.example` to `.env.local` and add project values.
3. Run `pnpm dev`.

## Quality gates

Before a change is ready: `pnpm lint` and `pnpm build` pass; changed flows are tested on mobile and desktop; keyboard and screen-reader basics are verified; new data access has RLS; migrations are reversible by a forward fix; documentation and `DECISIONS.md` are updated when architecture changes.

## Code standards

- TypeScript strict mode; avoid `any` and unsafe casts.
- Server Components by default; Client Components only for interaction.
- Feature code stays inside its feature boundary.
- Reuse follows demonstrated repetition, not prediction.
- No secrets in source, logs, screenshots, seeds, or client bundles.
- Dependencies require a clear maintenance and bundle-cost justification.

## Changes and review

Keep commits focused and explain the reason, not only the mechanism. Reviews prioritize user harm, data loss, privacy, accessibility, and architectural coupling before style. Never modify production schema manually; use reviewed migrations.
