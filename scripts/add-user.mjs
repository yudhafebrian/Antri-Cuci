import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const neonUrl = process.env.VITE_NEON_DATABASE_URL;

if (!neonUrl) {
  console.error('Missing VITE_NEON_DATABASE_URL');
  process.exit(1);
}

const sql = neon(neonUrl);

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function addUser(email, password, displayName, role) {
  const passwordHash = hashPassword(password);

  try {
    const result = await sql`
      INSERT INTO users (email, password_hash, display_name, role, is_active)
      VALUES (${email}, ${passwordHash}, ${displayName}, ${role}, true)
      RETURNING id, email, display_name, role
    `;
    console.log(`User created: ${email} (${displayName}, ${role})`);
    return result;
  } catch (err) {
    console.error(`Error creating user ${email}:`, err.message);
  }
}

async function main() {
  console.log('Adding user to NeonDB...');
  await addUser('owner@fipautoshop.com', 'kosandi', 'Owner', 'admin');
  console.log('Done');
}

main();
