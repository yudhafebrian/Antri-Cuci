import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL);

(async () => {
  const count = await sql`SELECT COUNT(*) as total FROM service_orders`;
  console.log('service_orders count:', count[0].total);
  const vhCount = await sql`SELECT COUNT(*) as total FROM vehicle_history`;
  console.log('vehicle_history count:', vhCount[0].total);
})();
