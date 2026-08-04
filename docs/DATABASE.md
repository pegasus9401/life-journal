# Database design

Supabase PostgreSQL is the source of truth. `auth.users` owns identity; `public.profiles` stores application profile data. We do not duplicate credentials in a public `users` table.

## Conventions

- UUID primary keys; `timestamptz` timestamps in UTC; trip-local calendar dates use `date`.
- `created_at` and `updated_at` on mutable records; optional `archived_at` for recoverable removal.
- `owner_id` references `auth.users(id)` and is indexed on every private aggregate root.
- Foreign keys define deliberate cascade/restrict behavior.
- User text remains original. AI outputs live separately and record provenance.
- Database types are generated from Supabase after every migration.

## Travel model

- `profiles`: display preferences and journal identity for an authenticated user.
- `trips`: title, destinations, dates, timezone, cover, status, and owner.
- `trip_days`: ordered local dates within a trip; the anchor for daily capture.
- `moments`: user-authored memories, notes, local time, visibility, and ordering.
- `photos`: private storage path, metadata, capture time, location, caption, and order; may attach to a trip, day, or moment.
- `places`: normalized trip places with coordinates and optional provider identifiers.
- `moment_places`: many-to-many relationship when one memory spans places.
- `stories`: versioned AI or user-edited narratives with scope (`day` or `trip`), status, model, prompt version, and source snapshot.
- `packing_items`: reusable-style checklist items scoped to a trip, with category and state.
- `trip_checklists`: checklist groups for preparation or trip-time tasks.
- `trip_checklist_items`: ordered items belonging to a checklist.

## Key integrity rules

- Trip end date cannot precede start date.
- A trip day must fall inside the trip range when dates exist.
- Coordinates are validated to latitude/longitude ranges.
- Ordering uses explicit integer positions and stable IDs.
- Generated stories never overwrite moments or prior story versions.

## RLS model

Access is granted through ownership of the parent trip. Policies cover select, insert, update, and delete separately. Storage paths begin with the owner's UUID and private bucket policies enforce the same boundary.

## Future modules

Future modules receive independent tables and schemas where useful. They may reference `auth.users`/`profiles`, but Travel tables never become generic containers for unrelated life data.

## Migration policy

All schema changes are forward migrations in `supabase/migrations`. Production history is immutable; fixes use a new migration. Seeds contain synthetic data only. Backups, export, and restore are verified before storing irreplaceable memories.
