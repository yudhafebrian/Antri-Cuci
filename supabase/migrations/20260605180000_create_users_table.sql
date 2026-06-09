/*
# Create users table for admin authentication

## Overview
Stores admin user credentials for the FIP Autoshop login system.
Password hashes are stored as SHA-256 hex strings (client-side hashing via Web Crypto API).

## New Table
### `users`
- `id` (uuid, primary key)
- `email` (text, unique, not null)
- `password_hash` (text, not null) — SHA-256 hex hash of the password
- `display_name` (text) — optional friendly name
- `role` (text) — 'admin' or 'super_admin'
- `is_active` (boolean) — account status
- `created_at` (timestamptz)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_users" ON users;
CREATE POLICY "public_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_users" ON users;
CREATE POLICY "public_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_users" ON users;
CREATE POLICY "public_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_users" ON users;
CREATE POLICY "public_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);
