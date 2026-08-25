# PEGASOS 2.0 — Phase 0 audit

## Executive finding
PEGASOS has a sound Next.js/Supabase core and real user data, but the product surface has expanded into many peer-level destinations and several visual systems. The rebuild should preserve the data/actions and replace the presentation progressively, starting with the shared shell and Today.

## Current architecture
- Next.js 16 App Router, React 19, TypeScript and Server Components for reads.
- Supabase SSR authentication with cookie refresh in `proxy.ts`.
- Feature-oriented folders with `queries.ts`, `actions.ts`, schemas, types and components.
- Server Actions validate most mutations with Zod.
- One assistant route with explicit tool schemas and owner-scoped writes.
- PWA manifest, safe-area viewport configuration and installed-app support.

## Current routes
Primary/product routes: Today, Calendar, Journal, Nutrition, Workouts, Profile.
Supporting routes: Products, Recipes, Promotions, Shopping List, Assistant and edit/detail routes.
The supporting routes must stay addressable, but Products, Recipes, Promotions and Shopping List should not remain primary navigation.

## Live data inventory
The live public schema has 21 tables and RLS policies on every user-facing table inspected.
Data already exists in calendar events, tasks, nutrition, workouts, journal, photos, profiles, goals, products/prices and legacy/dynamic meal plans.
No existing table should be dropped or reset.

Key overlap to manage:
- `nutrition_entries` and relational `day_meals/meal_items`.
- `nutrition_goals` and newer `user_goals`.
- legacy `daily_meal_plans` and dynamic meal templates.
These are migration/compatibility concerns, not deletion candidates.

## Keep
- Supabase authentication and SSR clients.
- Calendar recurrence, agenda, stickers and CRUD.
- Journal rich text/photos CRUD.
- Nutrition products, prices, recipes, meals and templates.
- Workout sessions and active workout tracker.
- Profile/goals and daily wellness.
- Assistant typed tools and global popup.
- Existing routes as compatibility/deep links.

## Refactor
- Navigation into Today / Health / Planner / Journal / Progress.
- Today into one composed read model rather than unrelated widgets.
- Design tokens into a single PEGASOS 2 namespace.
- 198 KB global stylesheet into feature CSS modules progressively.
- Giant Quick Add and workout components into smaller flows in later phases.
- Nutrition goal sources behind one domain adapter before Health redesign.

## Temporarily hide from primary navigation
Products, Recipes, Promotions, Shopping List, standalone Assistant and Workout History. They remain reachable from their parent area or existing deep links.

## Likely obsolete or duplicated UI
- Multiple root color/token systems (`--ink`, `--life-*`, `--pegasos-*`).
- Repeated calendar correction blocks in the global stylesheet.
- Legacy meal chooser data embedded in Quick Add alongside relational meals.
- Separate desktop/mobile information architectures.
Do not delete these until their replacement is verified route by route.

## Risks
1. Nutrition duplication can double-count if legacy and relational records are combined indiscriminately.
2. Styling changes can regress the heavily customized calendar and PWA safe areas.
3. AI tools currently write both legacy and current nutrition representations.
4. Supporting routes are linked from existing flows and must not disappear.
5. Database grants and RLS are separate; both must be tested for every new table.

## Target architecture
- `components/shell`: app shell, five-area navigation and global assistant affordance.
- `components/ui`: small token-driven primitives only.
- `features/today`: composed daily read model, brief rules and presentation.
- `features/health`, `planner`, `journal`, `progress`: future area shells reusing existing domain queries/actions.
- Existing domain features remain the source for CRUD until intentionally migrated.
- AI tools call validated application actions; no arbitrary SQL or model-shaped database writes.

## Implementation sequence
1. Foundation: PEGASOS 2 tokens, five-area navigation, shared responsive shell.
2. Today: parallel real-data reads, daily brief, nutrition/activity/planner/status hierarchy, one Quick Add, loading/error/empty states.
3. Stop and verify mobile, desktop, auth, build and production.
4. Health, Planner, Journal, Progress and AI actions follow as separate reviewed phases.
