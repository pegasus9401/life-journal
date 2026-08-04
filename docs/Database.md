# Database foundation

Supabase will provide authentication, PostgreSQL storage, and later photo storage.

No database schema is created in this foundation phase. The first migration should be introduced alongside the “create a trip” flow so that the data model is driven by working product behavior.

## Expected first entities

- `profiles`
- `trips`
- `moments`
- `moment_photos`

All user-owned tables should use Row Level Security before production data is stored.
