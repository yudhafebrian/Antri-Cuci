import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const neonUrl = process.env.VITE_NEON_DATABASE_URL;

if (!supabaseUrl || !supabaseAnonKey || !neonUrl) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const sql = neon(neonUrl);

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function createUsersTableSupabase() {
  console.log('Creating users table in Supabase...');

  const { error } = await supabase.rpc('create_users_table_if_not_exists');

  if (error && error.message.includes('function does not exist')) {
    console.log('RPC function not found, trying direct SQL via Supabase management API...');
    console.log('Note: Supabase requires running migrations via CLI or Dashboard SQL Editor.');
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log(`
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
`);
    return false;
  }

  console.log('Users table created in Supabase');
  return true;
}

async function seedAdminSupabase() {
  console.log('\nSeeding admin user in Supabase...');

  const email = 'admin@fipautoshop.com';
  const password = 'admin123';
  const passwordHash = hashPassword(password);

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking existing:', fetchError.message);
    return;
  }

  if (existing) {
    console.log('Admin user already exists in Supabase');
    return;
  }

  const { error } = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash, display_name: 'Administrator', role: 'admin', is_active: true });

  if (error) {
    console.error(`Failed to seed admin: ${error.message}`);
    return;
  }

  console.log('Admin user seeded in Supabase: admin@fipautoshop.com / admin123');
}

async function main() {
  console.log('Setting up users table in Supabase...\n');

  const tableCreated = await createUsersTableSupabase();
  if (!tableCreated) {
    console.log('\nPlease create the users table in Supabase first, then re-run this script.');
    return;
  }

  await seedAdminSupabase();
  console.log('\nDone');
}

main();
