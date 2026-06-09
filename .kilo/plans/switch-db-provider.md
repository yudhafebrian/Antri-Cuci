# Plan: Switch Database Provider Between Neon and Supabase

## Goal
Enable seamless switching between Neon and Supabase databases using the `VITE_DB_PROVIDER` environment variable, without requiring a complete rewrite of the database query logic.

## Current State Analysis
- `src/lib/neon.ts` is hardcoded to use `@neondatabase/serverless` with `VITE_NEON_DATABASE_URL`.
- `src/lib/db.ts` imports the `sql` tagged template function directly from `./neon` and uses it for all queries.
- There is no dynamic routing logic based on `VITE_DB_PROVIDER`.
- Query syntax relies on tagged template literals (`` sql`SELECT...` ``), which is incompatible with the native `@supabase/supabase-js` client (which uses `.from().select()`).

## Proposed Solutions

### Option A: Universal PostgreSQL Driver (Recommended for Minimal Changes)
Use a standard PostgreSQL client library that supports tagged template literals and works with **both** Neon and Supabase direct connection strings. The `postgres` npm package is ideal for this.

**Pros:**
- Zero changes required to the existing SQL query syntax in `src/lib/db.ts`.
- Fast implementation (1-2 files modified).
- True "drop-in" replacement for the database layer.

**Cons:**
- Requires using the **Direct Connection String** for Supabase (not the session pooler, as poolers restrict certain DDL/complex queries).
- **Security Warning:** If this is a pure frontend Vite app, direct connection strings exposed via `VITE_` variables are visible in the browser. This is only safe if the database has strict Row Level Security (RLS) or is for internal/trusted use.

**Implementation Steps (Option A):**
1. Install the `postgres` package: `npm install postgres`.
2. Create a new file `src/lib/db-client.ts` to replace `src/lib/neon.ts`.
3. In `db-client.ts`, read `import.meta.env.VITE_DB_PROVIDER`.
   - If `'neon'`, initialize `postgres` with `VITE_NEON_DATABASE_URL`.
   - If `'supabase'`, initialize `postgres` with a new `VITE_SUPABASE_DIRECT_URL` (derived from the direct connection string).
4. Export the `sql` function from `db-client.ts`.
5. Update `src/lib/db.ts` to `import { sql } from './db-client'`.
6. Update `.env` to include `VITE_SUPABASE_DIRECT_URL` (cleaned of any `psql` prefixes).

---

### Option B: Native Supabase Client (Recommended for Security & Ecosystem Features)
Fully embrace the Supabase ecosystem by refactoring the data layer to use `@supabase/supabase-js`.

**Pros:**
- Unlocks Supabase-specific features: Built-in Auth, Realtime subscriptions, and Row Level Security (RLS).
- More secure for frontend applications (uses `anon` key instead of direct DB credentials).

**Cons:**
- Requires a **major refactor** of `src/lib/db.ts`. Every `` sql`...` `` query must be rewritten to Supabase's chainable API (e.g., `supabase.from('table').select('*')`).
- Authentication logic in `src/lib/db.ts` and `src/lib/auth.ts` must be migrated to use Supabase Auth instead of custom SHA-256 hashing.

**Implementation Steps (Option B):**
1. Ensure `@supabase/supabase-js` is installed and initialized in `src/lib/supabase.ts`.
2. Rewrite all functions in `src/lib/db.ts` to use the Supabase client.
3. Replace custom `loginUser`/`registerUser` in `src/lib/db.ts` with `supabase.auth.signInWithPassword` and `signUp`.
4. Remove `src/lib/neon.ts` and clean up Neon-specific dependencies.

---

## Clarifying Questions for the User
Before proceeding with implementation, please confirm:

1. **Which option do you prefer?** 
   - **Option A** (Fast, keeps current SQL syntax, uses direct DB connection).
   - **Option B** (Slower, requires rewriting queries, but more secure and uses native Supabase features).
2. **Is this application purely frontend (Vite running in the browser), or is there a backend server (e.g., Node.js/Express, Next.js API routes)?** 
   - *If purely frontend*, Option A carries a security risk unless you have strict database-level permissions. Option B is the industry standard for frontend apps.
3. **Do you want to keep the custom `users` table authentication, or migrate to Supabase Auth?** (Relevant if choosing Option B).

## Next Steps
Awaiting your decision on the preferred option and answers to the clarifying questions. Once confirmed, I will execute the chosen plan.
