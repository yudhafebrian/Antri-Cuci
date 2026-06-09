import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('VITE_NEON_DATABASE_URL or DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(connectionString);

const NAMES = [
  'Budi Santoso', 'Siti Nurhaliza', 'Ahmad Hidayat', 'Dewi Lestari',
  'Eko Prasetyo', 'Rina Wati', 'Fajar Nugroho', 'Gita Permata',
  'Hendra Wijaya', 'Indah Sari', 'Joko Susilo', 'Kartini Putri',
  'Agus Setiawan', 'Maya Anggraini', 'Rudi Hartono', 'Lina Marlina',
  'Dedi Kurniawan', 'Nina Zatulini', 'Tono Sujarwo', 'Ratna Sari',
];

const PLATE_PREFIXES = ['B', 'D', 'L', 'AB', 'AD', 'F', 'T', 'C'];
const BRANDS_CAR = ['Toyota Avanza', 'Honda Brio', 'Suzuki Ertiga', 'Daihatsu Xenia', 'Toyota Fortuner', 'Honda CR-V', 'Mitsubishi Pajero', 'Toyota Innova', 'Honda Civic', 'Suzuki Swift'];
const BRANDS_MOTOR = ['Honda Vario', 'Yamaha NMAX', 'Honda PCX', 'Yamaha Mio', 'Honda Beat', 'Kawasaki Ninja', 'Yamaha R15', 'Honda CBR', 'Vespa Sprint', 'Kawasaki KLX'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPlate(): string {
  const prefix = randomItem(PLATE_PREFIXES);
  const numbers = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  const letters = [0, 1, 2].map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `${prefix} ${numbers} ${letters}`;
}

function randomPhone(): string {
  const prefix = randomItem(['0812', '0813', '0821', '0822', '0851', '0811', '0852', '0853']);
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `${prefix}${suffix}`;
}

function getDayTarget(day: number): number {
  if (day >= 1 && day <= 4) return randomInt(25, 45);
  if (day === 5) return randomInt(25, 40);
  if (day === 6) return randomInt(55, 95);
  return randomInt(45, 85);
}

function getRandomHour(): number {
  const rand = Math.random();
  if (rand < 0.20) return randomInt(7, 8);
  if (rand < 0.50) return randomInt(9, 10);
  if (rand < 0.60) return randomInt(11, 12);
  if (rand < 0.85) return randomInt(13, 15);
  return randomInt(16, 17);
}

function getRandomStatus(): string {
  const rand = Math.random();
  if (rand < 0.90) return 'diambil';
  if (rand < 0.98) return 'selesai';
  return 'cancel';
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

async function runWithConcurrency(tasks: (() => Promise<void>)[], concurrency: number) {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < tasks.length) {
      const i = index++;
      await tasks[i]();
    }
  });
  await Promise.all(workers);
}

async function ensureVehicles(targetCount: number) {
  const res = await sql`SELECT COUNT(*) as count FROM vehicle_history` as { count: string }[];
  const currentCount = parseInt(res[0].count, 10);
  
  if (currentCount >= targetCount) {
    console.log(`Vehicle history already has ${currentCount} records.`);
    return;
  }

  const toGenerate = targetCount - currentCount;
  console.log(`Generating ${toGenerate} additional vehicles...`);
  
  let generated = 0;
  const tasks: (() => Promise<void>)[] = [];
  
  for (let i = 0; i < toGenerate; i++) {
    const isMotor = Math.random() < 0.3;
    const vehicleName = isMotor ? randomItem(BRANDS_MOTOR) : randomItem(BRANDS_CAR);
    const vehicleType = isMotor ? 'bike' : 'car';
    const plateNumber = randomPlate();
    const ownerName = randomItem(NAMES);
    const whatsappNumber = randomPhone();
    
    tasks.push(async () => {
      try {
        await sql`
          INSERT INTO vehicle_history (plate_number, owner_name, whatsapp_number, vehicle_name, vehicle_type)
          VALUES (${plateNumber}, ${ownerName}, ${whatsappNumber}, ${vehicleName}, ${vehicleType})
          ON CONFLICT (plate_number) DO NOTHING
        `;
        generated++;
        if (generated % 500 === 0) {
          console.log(`  Generated ${generated}/${toGenerate} vehicles...`);
        }
      } catch (err) {
        console.error(`  Error inserting vehicle:`, err);
      }
    });
  }
  
  await runWithConcurrency(tasks, 10);
  console.log(`Generated ${generated} vehicles.`);
}

async function main() {
  console.log('Ensuring vehicle history...');
  await ensureVehicles(3000);

  console.log('Fetching packages and variants...');
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
    console.error('No packages found.');
    process.exit(1);
  }

  console.log(`Found ${packages.length} package variants.`);

  const now = new Date();
  const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  const vehicleIdsRes = await sql`SELECT id FROM vehicle_history` as { id: string }[];
  const vehicleIds = vehicleIdsRes.map(v => v.id);

  let totalGenerated = 0;
  let totalErrors = 0;

  console.log('Generating service orders...');

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const tasks: (() => Promise<void>)[] = [];

  for (let d = 0; d < 365; d++) {
    const currentDate = addDays(startDate, d);
    const dayOfWeek = currentDate.getDay();
    const countForDay = getDayTarget(dayOfWeek);

    for (let i = 0; i < countForDay; i++) {
      const pkg = randomItem(packages);
      const isRegular = pkg.workflow_type === 'regular';
      const status = getRandomStatus();
      const isOvertime = Math.random() < 0.15;

      const hour = getRandomHour();
      const minute = randomInt(0, 59);
      const second = randomInt(0, 59);
      
      const createdAt = new Date(currentDate);
      createdAt.setHours(hour, minute, second, 0);

      const vehicleId = randomItem(vehicleIds);
      
      let t0 = createdAt;
      let t1 = addMinutes(t0, randomInt(5, 15));
      let t2 = addMinutes(t1, pkg.sop_basah_minutes + randomInt(-5, 10) + (isOvertime ? randomInt(15, 45) : 0));
      let t3 = addMinutes(t2, pkg.sop_kering_minutes + randomInt(-3, 5) + (isOvertime ? randomInt(10, 30) : 0));
      let t4 = addMinutes(t3, pkg.sop_qc_minutes + randomInt(-2, 5) + (isOvertime ? randomInt(5, 20) : 0));
      
      let tAntriPoles: Date | null = null;
      let tPoles: Date | null = null;
      let tSelesai: Date | null = null;
      let tDiambil: string | null = null;
      let tCancel: string | null = null;

      if (status === 'cancel') {
        tCancel = addMinutes(t0, randomInt(5, 30)).toISOString();
        t1 = null as any; t2 = null as any; t3 = null as any; t4 = null as any;
      } else {
        if (!isRegular) {
          tAntriPoles = addMinutes(t4, randomInt(5, 30) + (isOvertime ? randomInt(20, 60) : 0));
          tPoles = addMinutes(tAntriPoles, pkg.sop_poles_minutes + randomInt(-5, 15) + (isOvertime ? randomInt(30, 90) : 0));
          tSelesai = addMinutes(tPoles, pkg.sop_qc_minutes + randomInt(0, 10));
        } else {
          tSelesai = t4;
        }
        
        if (status === 'diambil') {
          tDiambil = addMinutes(tSelesai!, randomInt(10, 120) + (isOvertime ? randomInt(60, 240) : 0)).toISOString();
        }
      }

      const times = {
        menunggu: t0.toISOString(),
        basah: t1 ? t1.toISOString() : null,
        kering: t2 ? t2.toISOString() : null,
        qc: t3 ? t3.toISOString() : null,
        antri_poles: tAntriPoles ? tAntriPoles.toISOString() : null,
        poles: tPoles ? tPoles.toISOString() : null,
        selesai: tSelesai ? tSelesai.toISOString() : null,
        diambil: tDiambil,
        cancel: tCancel,
      };

      tasks.push(async () => {
        try {
          await sql`
            INSERT INTO service_orders (
              vehicle_id, package_id, package_variant_id, package_name, variant_name,
              package_price, current_status, notes, times, created_at
            ) VALUES (
              ${vehicleId}, ${pkg.id}, ${pkg.variant_id}, ${pkg.name}, ${pkg.variant_name},
              ${pkg.price}, ${status}, ${isOvertime ? 'Overtime due to high volume' : ''}, ${JSON.stringify(times)}::jsonb, ${createdAt.toISOString()}
            )
          `;
          totalGenerated++;
          if (totalGenerated % 1000 === 0) {
            console.log(`Inserted ${totalGenerated} orders...`);
          }
        } catch (err) {
          totalErrors++;
          if (totalErrors <= 10) {
            console.error(`Error inserting order:`, err);
          }
        }
      });
    }
  }

  await runWithConcurrency(tasks, 20);
  console.log(`Done! Total generated: ${totalGenerated}, Errors: ${totalErrors}`);
}

main().catch(console.error);
