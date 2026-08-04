# Architecture decision log

Accepted decisions are append-only. Superseded decisions remain for context and link to their replacement.

## ADR-001 — Modular monolith

**Status:** Accepted  
**Decision:** Use one Next.js application and Supabase project with strict feature boundaries.  
**Why:** It minimizes operational complexity while supporting independent future product modules. Services may be extracted only under measured pressure.

## ADR-002 — Feature-first organization

**Status:** Accepted  
**Decision:** Put Travel Journal in `features/travel` and authentication in `features/auth`; keep routes thin.  
**Why:** Product capabilities evolve together. This prevents route folders and generic layer folders from becoming coupling points. A duplicate top-level `travel` directory is intentionally avoided.

## ADR-003 — Server-first Next.js

**Status:** Accepted  
**Decision:** Use Server Components for reads, Server Actions for internal mutations, and route handlers for callbacks/webhooks.  
**Why:** Private data stays server-side, client JavaScript stays small, and framework conventions remain clear.

## ADR-004 — Supabase identity and authorization

**Status:** Accepted  
**Decision:** Use `auth.users` for identity, `public.profiles` for product profile data, and RLS as the authorization boundary. Begin with passwordless email sign-in.  
**Why:** Avoid duplicated credentials, simplify entry, and enforce ownership even if application code is incorrect.

## ADR-005 — Separate generated stories from source memories

**Status:** Accepted  
**Decision:** Store AI narratives as versioned outputs with provenance; never overwrite moments.  
**Why:** Memories are irreplaceable and AI outputs must remain reviewable, reversible, and reproducible.

## ADR-006 — No speculative future-module implementation

**Status:** Accepted  
**Decision:** Future modules influence boundaries but receive no pages, navigation, or tables yet.  
**Why:** Architecture should preserve options without converting guesses into maintenance burden.

## ADR template

`ID / title`, `status and date`, `context`, `decision`, `consequences`, and `supersedes` when relevant.
