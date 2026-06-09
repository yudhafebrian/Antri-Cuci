import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config();

const neonUrl = process.env.VITE_NEON_DATABASE_URL;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!neonUrl || !supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const sql = neon(neonUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function createUsersTable() {
  console.log('Creating users table in NeonDB...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      display_name text DEFAULT '',
      role text NOT NULL DEFAULT 'admin',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)`;
  console.log('Users table created');
}

async function seedAdminUser() {
  console.log('\nSeeding admin user...');

  const email = 'admin@fipautoshop.com';
  const password = 'admin123';
  const passwordHash = hashPassword(password);

  const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log('Admin user already exists');
    return;
  }

  await sql`
    INSERT INTO users (email, password_hash, display_name, role, is_active)
    VALUES (${email}, ${passwordHash}, 'Administrator', 'admin', true)
  `;

  console.log('Admin user seeded: admin@fipautoshop.com / admin123');
}

async function migrateUsersToSupabase() {
  console.log('\nMigrating users to Supabase...');

  const neonUsers = await sql`SELECT * FROM users`;
  if (neonUsers.length === 0) {
    console.log('No users in NeonDB to migrate');
    return;
  }

  console.log(`Found ${neonUsers.length} users in NeonDB`);

  let migrated = 0;
  for (const user of neonUsers) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          display_name: user.display_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
        }, { onConflict: 'email' });

      if (error) {
        console.error(`  Failed to insert ${user.email}: ${error.message}`);
      } else {
        migrated++;
      }
    } catch (err) {
      console.error(`  Failed to migrate ${user.email}:`, err.message);
    }
  }

  console.log(`Migrated ${migrated}/${neonUsers.length} users to Supabase`);
}

async function verifyMigration() {
  console.log('\nVerifying migration...');

  const neonCount = await sql`SELECT COUNT(*) as count FROM users`;
  console.log(`NeonDB users: ${neonCount[0].count} rows`);

  const { data: supabaseUsers, error } = await supabase
    .from('users')
    .select('email, display_name, role');

  if (!error && supabaseUsers) {
    console.log(`Supabase users: ${supabaseUsers.length} rows`);
    supabaseUsers.forEach(u => console.log(`  - ${u.email} (${u.display_name}, ${u.role})`));
  }
}

async function main() {
  console.log('Starting users table migration...\n');

  try {
    await createUsersTable();
    await seedAdminUser();
    await migrateUsersToSupabase();
    await verifyMigration();
    console.log('\nUsers migration completed successfully');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  }
}

main();
