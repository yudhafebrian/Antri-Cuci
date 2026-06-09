/**
 * Seed script: generate dummy service_orders for report testing.
 * Run with: npx tsx src/scripts/seedReportData.ts
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { MERK_DB_MOBIL, MERK_DB_MOTOR } from '../lib/constants';

const connectionString = process.env.VITE_NEON_DATABASE_URL;
if (!connectionString) {
  console.error('VITE_NEON_DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(connectionString);

// ── Helpers ───────────────────────────────────────────────────────────────────

const NAMES = [
  'Budi Santoso', 'Siti Nurhaliza', 'Ahmad Hidayat', 'Dewi Lestari',
  'Eko Prasetyo', 'Rina Wati', 'Fajar Nugroho', 'Gita Permata',
  'Hendra Wijaya', 'Indah Sari', 'Joko Susilo', 'Kartini Putri',
];

const PLATE_PREFIXES = ['B', 'D', 'L', 'AB', 'AD', 'F', 'T', 'C'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPlate(): string {
  const prefix = randomItem(PLATE_PREFIXES);
  const numbers = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  const letters = [0, 1, 2].map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `${prefix} ${numbers} ${letters}`;
}

function randomPhone(): string {
  const prefix = randomItem(['0812', '0813', '0821', '0822', '0851']);
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `${prefix}${suffix}`;
}

function randomVehicleName(isMotor: boolean): string {
  const db = isMotor ? MERK_DB_MOTOR : MERK_DB_MOBIL;
  const brands = Object.values(db).flat().filter((m) => m !== 'Lainnya' && m !== 'Motor Lainnya');
  return randomItem(brands);
}

function randomDateWithinLast30Days(): Date {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
}

function minutesAfter(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60000).toISOString();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const count = 120;
  console.log('Fetching packages and variants from DB...');

  const packages = await sql`
    SELECT p.id, p.name, p.vehicle_type, p.workflow_type,
           pv.id AS variant_id, pv.variant_name, pv.price,
           pv.sop_basah_minutes, pv.sop_kering_minutes,
           pv.sop_qc_minutes, pv.sop_poles_minutes
    FROM packages p
    JOIN package_variants pv ON pv.package_id = p.id
    WHERE p.is_active = true AND pv.is_active = true
  ` as Array<{
    id: string; name: string; vehicle_type: string; workflow_type: string;
    variant_id: string; variant_name: string; price: number;
    sop_basah_minutes: number; sop_kering_minutes: number;
    sop_qc_minutes: number; sop_poles_minutes: number;
  }>;

  if (packages.length === 0) {
    console.error('No packages found. Run migration 004 first.');
    process.exit(1);
  }

  console.log(`Found ${packages.length} package variants. Seeding ${count} orders...`);

  for (let i = 0; i < count; i++) {
    const pkg = randomItem(packages);
    const isMotor = pkg.vehicle_type === 'bike';
    const vehicleName = randomVehicleName(isMotor);
    const vehicleType = isMotor ? 'motor' : 'mobil';
    const platNumber = randomPlate();
    const ownerName = randomItem(NAMES);
    const createdAt = randomDateWithinLast30Days();

    const t0 = createdAt;
    const t1 = new Date(t0.getTime() + randomItem([5, 8, 10, 12, 15]) * 60000);
    const t2 = new Date(t1.getTime() + (pkg.sop_basah_minutes + randomItem([-5, 0, 5, 10])) * 60000);
    const t3 = new Date(t2.getTime() + (pkg.sop_kering_minutes + randomItem([-3, 0, 5])) * 60000);
    const t4 = new Date(t3.getTime() + (pkg.sop_qc_minutes + randomItem([-2, 0, 3])) * 60000);
    const t5 = new Date(t4.getTime() + randomItem([5, 10, 15]) * 60000);

    const isRegular = pkg.workflow_type === 'regular';
    let times: Record<string, string | null>;

    if (isRegular) {
      times = {
        menunggu: t0.toISOString(), basah: t1.toISOString(),
        kering: t2.toISOString(), qc: t3.toISOString(),
        antri_poles: null, poles: null,
        selesai: t4.toISOString(), diambil: t5.toISOString(), cancel: null,
      };
    } else {
      const tp1 = new Date(t3.getTime() + randomItem([0, 5, 10]) * 60000);
      const tp2 = new Date(tp1.getTime() + (pkg.sop_poles_minutes + randomItem([-5, 0, 10])) * 60000);
      const tSelesai = new Date(tp2.getTime() + pkg.sop_qc_minutes * 60000);
      times = {
        menunggu: t0.toISOString(), basah: t1.toISOString(),
        kering: t2.toISOString(), qc: t3.toISOString(),
        antri_poles: tp1.toISOString(), poles: tp2.toISOString(),
        selesai: tSelesai.toISOString(),
        diambil: minutesAfter(tSelesai, randomItem([5, 10, 15])),
        cancel: null,
      };
    }

    try {
      const hist = await sql`
        INSERT INTO vehicle_history (plate_number, owner_name, whatsapp_number, vehicle_name, vehicle_type)
        VALUES (${platNumber}, ${ownerName}, ${randomPhone()}, ${vehicleName}, ${vehicleType})
        ON CONFLICT (plate_number) DO UPDATE SET owner_name = EXCLUDED.owner_name, updated_at = now()
        RETURNING id
      ` as Array<{ id: string }>;

      const vehicleId = hist[0]?.id;
      if (!vehicleId) { process.stdout.write('x'); continue; }

      await sql`
        INSERT INTO service_orders
          (vehicle_id, package_id, package_variant_id, package_name, variant_name,
           package_price, current_status, notes, times, created_at)
        VALUES (
          ${vehicleId}, ${pkg.id}, ${pkg.variant_id}, ${pkg.name}, ${pkg.variant_name},
          ${pkg.price}, 'diambil', '', ${JSON.stringify(times)}, ${createdAt.toISOString()}
        )
      `;
      process.stdout.write('.');
    } catch (err) {
      console.error('\nInsert failed:', err);
      process.stdout.write('x');
    }
  }

  console.log('\nDone seeding!');
}

main().catch(console.error);
