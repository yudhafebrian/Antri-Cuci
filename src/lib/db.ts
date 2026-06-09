import { sql } from './neon';
import { hashPassword, verifyPassword, type UserRow } from './auth';
import type { ServiceOrderRow, PackageRow, PackageVariantRow } from './neon';

export type { ServiceOrderRow, VehicleHistoryRow, PackageRow, PackageVariantRow } from './neon';
export type { UserRow } from './auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_TIMES: Record<string, null> = {
  menunggu:    null,
  basah:       null,
  kering:      null,
  qc:          null,
  antri_poles: null,
  poles:       null,
  selesai:     null,
  diambil:     null,
  cancel:      null,
};

function parseJsonb(val: unknown): Record<string, string | null> {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return { ...EMPTY_TIMES }; }
  }
  if (typeof val === 'object' && val !== null) {
    return val as Record<string, string | null>;
  }
  return { ...EMPTY_TIMES };
}

function mapServiceOrderRow(row: Record<string, unknown>): ServiceOrderRow {
  return {
    id:                  String(row.id),
    queue_number:        row.queue_number != null ? Number(row.queue_number) : null,
    vehicle_id:          String(row.vehicle_id),
    package_id:          row.package_id != null ? String(row.package_id) : null,
    package_variant_id:  row.package_variant_id != null ? String(row.package_variant_id) : null,
    package_name:        String(row.package_name ?? ''),
    variant_name:        String(row.variant_name ?? ''),
    package_price:       Number(row.package_price ?? 0),
    current_status:      String(row.current_status ?? 'menunggu'),
    notes:               String(row.notes ?? ''),
    times:               parseJsonb(row.times),
    created_at:          String(row.created_at),
    updated_at:          String(row.updated_at),
    // Joined from vehicle_history
    plate_number:        String(row.plate_number ?? ''),
    owner_name:          String(row.owner_name ?? ''),
    whatsapp_number:     String(row.whatsapp_number ?? ''),
    vehicle_name:        String(row.vehicle_name ?? ''),
    vehicle_type:        row.vehicle_type != null ? String(row.vehicle_type) : null,
    // Joined from packages
    workflow_type:       String(row.workflow_type ?? 'regular'),
    // Joined from package_variants
    sop_basah_minutes:   Number(row.sop_basah_minutes  ?? 15),
    sop_kering_minutes:  Number(row.sop_kering_minutes ?? 15),
    sop_qc_minutes:      Number(row.sop_qc_minutes     ?? 10),
    sop_poles_minutes:   Number(row.sop_poles_minutes  ?? 30),
  };
}

// SELECT list for enriched service_order queries
const ORDER_SELECT = `
  so.id,
  so.queue_number,
  so.vehicle_id,
  so.package_id,
  so.package_variant_id,
  so.package_name,
  so.variant_name,
  so.package_price,
  so.current_status,
  so.notes,
  so.times,
  so.created_at,
  so.updated_at,
  vh.plate_number,
  vh.owner_name,
  vh.whatsapp_number,
  vh.vehicle_name,
  vh.vehicle_type,
  COALESCE(p.workflow_type, 'regular')  AS workflow_type,
  COALESCE(pv.sop_basah_minutes,  15)   AS sop_basah_minutes,
  COALESCE(pv.sop_kering_minutes, 15)   AS sop_kering_minutes,
  COALESCE(pv.sop_qc_minutes,     10)   AS sop_qc_minutes,
  COALESCE(pv.sop_poles_minutes,  30)   AS sop_poles_minutes
`;

// ── service_orders ────────────────────────────────────────────────────────────

/** Load all active orders (queue aktif: not diambil or cancel) */
export async function loadActiveOrders(): Promise<ServiceOrderRow[]> {
  const result = await sql`
    SELECT ${sql.unsafe(ORDER_SELECT)}
    FROM service_orders so
    JOIN vehicle_history vh ON vh.id = so.vehicle_id
    LEFT JOIN packages p    ON p.id  = so.package_id
    LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
    WHERE so.current_status NOT IN ('diambil', 'cancel')
    ORDER BY so.created_at ASC
  `;
  return (result as Record<string, unknown>[]).map(mapServiceOrderRow);
}

/** Create a new service order. Upserts vehicle_history automatically. */
export async function createServiceOrder(input: {
  plate_number: string;
  owner_name: string;
  whatsapp_number: string;
  vehicle_name: string;
  vehicle_type: string;
  package_id: string;
  package_variant_id: string;
  package_name: string;
  variant_name: string;
  package_price: number;
  notes: string;
}): Promise<ServiceOrderRow | null> {
// 1. Upsert vehicle_history
   const histResult = await sql`
     INSERT INTO vehicle_history (plate_number, owner_name, whatsapp_number, vehicle_name, vehicle_type)
     VALUES (${input.plate_number}, ${input.owner_name || null}, ${input.whatsapp_number || null}, ${input.vehicle_name}, ${input.vehicle_type})
     ON CONFLICT (plate_number) DO UPDATE SET
       owner_name      = COALESCE(EXCLUDED.owner_name, (SELECT vh.owner_name FROM vehicle_history vh WHERE vh.plate_number = EXCLUDED.plate_number)),
       whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, (SELECT vh.whatsapp_number FROM vehicle_history vh WHERE vh.plate_number = EXCLUDED.plate_number)),
       vehicle_name    = EXCLUDED.vehicle_name,
       vehicle_type    = EXCLUDED.vehicle_type,
       updated_at      = now()
     RETURNING id
   `;
   const vehicleId = (histResult as Record<string, unknown>[])[0]?.id as string;
   if (!vehicleId) return null;

  // 2. Build initial times jsonb (all null except menunggu)
  const initialTimes = { ...EMPTY_TIMES, menunggu: new Date().toISOString() };

  // 3. Insert service_order
  const orderResult = await sql`
    INSERT INTO service_orders
      (vehicle_id, package_id, package_variant_id, package_name, variant_name, package_price, current_status, notes, times)
    VALUES (
      ${vehicleId},
      ${input.package_id},
      ${input.package_variant_id},
      ${input.package_name},
      ${input.variant_name},
      ${input.package_price},
      'menunggu',
      ${input.notes},
      ${JSON.stringify(initialTimes)}
    )
    RETURNING id
  `;
  const rows = orderResult as Record<string, unknown>[];
  if (rows.length === 0) return null;

  // Re-fetch with full join to populate all fields
  const full = await sql`
    SELECT ${sql.unsafe(ORDER_SELECT)}
    FROM service_orders so
    JOIN vehicle_history vh ON vh.id = so.vehicle_id
    LEFT JOIN packages p    ON p.id  = so.package_id
    LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
    WHERE so.id = ${String(rows[0].id)}
  `;
  const fullRows = full as Record<string, unknown>[];
  if (fullRows.length === 0) return null;
  return mapServiceOrderRow(fullRows[0]);
}

/** Update fields on an existing service order */
export async function updateServiceOrder(
  id: string,
  updates: {
    current_status?: string;
    times?: Record<string, string | null>;
    notes?: string;
    package_id?: string;
    package_variant_id?: string;
    package_name?: string;
    variant_name?: string;
    package_price?: number;
    // vehicle_history fields
    owner_name?: string;
    whatsapp_number?: string;
    vehicle_name?: string;
    vehicle_type?: string;
  }
): Promise<boolean> {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  const orderFields: Array<keyof typeof updates> = [
    'current_status', 'notes', 'package_id', 'package_variant_id',
    'package_name', 'variant_name', 'package_price',
  ];
  for (const key of orderFields) {
    if (updates[key] !== undefined) {
      setClauses.push(`${key} = $${setClauses.length + 1}`);
      params.push(updates[key]);
    }
  }
  if (updates.times !== undefined) {
    setClauses.push(`times = $${setClauses.length + 1}`);
    params.push(JSON.stringify(updates.times));
  }
  setClauses.push(`updated_at = now()`);

  if (setClauses.length > 1) {
    params.push(id);
    const query = `UPDATE service_orders SET ${setClauses.join(', ')} WHERE id = $${params.length}`;
    await sql.query(query, params as string[]);
  }

  // Update vehicle_history if vehicle fields provided
  const vehicleUpdates: string[] = [];
  const vehicleParams: unknown[] = [];
  const vehicleFields: Array<'owner_name' | 'whatsapp_number' | 'vehicle_name' | 'vehicle_type'> =
    ['owner_name', 'whatsapp_number', 'vehicle_name', 'vehicle_type'];
  for (const key of vehicleFields) {
    if (updates[key] !== undefined) {
      vehicleUpdates.push(`${key} = $${vehicleUpdates.length + 1}`);
      vehicleParams.push(updates[key]);
    }
  }
  if (vehicleUpdates.length > 0) {
    vehicleUpdates.push('updated_at = now()');
    vehicleParams.push(id);
    const vehicleQuery = `
      UPDATE vehicle_history SET ${vehicleUpdates.join(', ')}
      WHERE id = (SELECT vehicle_id FROM service_orders WHERE id = $${vehicleParams.length})
    `;
    await sql.query(vehicleQuery, vehicleParams as string[]);
  }

  return true;
}

/** Soft-cancel an order */
export async function cancelServiceOrder(id: string): Promise<boolean> {
  await sql`
    UPDATE service_orders
    SET current_status = 'cancel',
        times = times || jsonb_build_object('cancel', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        updated_at = now()
    WHERE id = ${id}
  `;
  return true;
}

/** Mark order as picked up — removes from active queue */
export async function markOrderPickedUp(id: string): Promise<boolean> {
  await sql`
    UPDATE service_orders
    SET current_status = 'diambil',
        times = times || jsonb_build_object('diambil', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        updated_at = now()
    WHERE id = ${id}
  `;
  return true;
}

// ── vehicle_history ───────────────────────────────────────────────────────────

export interface VehicleHistoryHit {
  plate_number: string;
  owner_name: string;
  whatsapp_number: string;
  vehicle_name: string;
  vehicle_type: string | null;
}

export async function loadVehicleHistory(limit = 30): Promise<VehicleHistoryHit[]> {
  const result = await sql`
    SELECT plate_number, owner_name, whatsapp_number, vehicle_name, vehicle_type
    FROM vehicle_history
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
  return (result as Record<string, unknown>[]).map((r) => ({
    plate_number:    String(r.plate_number ?? ''),
    owner_name:      String(r.owner_name ?? ''),
    whatsapp_number: String(r.whatsapp_number ?? ''),
    vehicle_name:    String(r.vehicle_name ?? ''),
    vehicle_type:    r.vehicle_type != null ? String(r.vehicle_type) : null,
  }));
}

// ── packages ──────────────────────────────────────────────────────────────────

/** Load all packages (metadata only, no variants/prices) */
export async function loadPackages(): Promise<PackageRow[]> {
  const result = await sql`
    SELECT * FROM packages WHERE is_active = true ORDER BY sort_order ASC
  `;
  return (result as Record<string, unknown>[]).map((r) => ({
    id:           String(r.id),
    name:         String(r.name),
    vehicle_type: String(r.vehicle_type),
    workflow_type:String(r.workflow_type),
    category:     String(r.category),
    sort_order:   Number(r.sort_order),
    is_active:    Boolean(r.is_active),
    created_at:   String(r.created_at),
    updated_at:   String(r.updated_at),
  }));
}

/** Load variants for a specific package */
export async function loadPackageVariants(packageId: string): Promise<PackageVariantRow[]> {
  const result = await sql`
    SELECT * FROM package_variants
    WHERE package_id = ${packageId} AND is_active = true
    ORDER BY sort_order ASC
  `;
  return (result as Record<string, unknown>[]).map(mapVariantRow);
}

/** Load all packages with their variants in one round-trip (for form use) */
export async function loadAllPackagesWithVariants(): Promise<{
  packages: PackageRow[];
  variants: PackageVariantRow[];
}> {
  const [pkgResult, varResult] = await Promise.all([
    sql`SELECT * FROM packages WHERE is_active = true ORDER BY sort_order ASC`,
    sql`SELECT * FROM package_variants WHERE is_active = true ORDER BY sort_order ASC`,
  ]);

  return {
    packages: (pkgResult as Record<string, unknown>[]).map((r) => ({
      id:           String(r.id),
      name:         String(r.name),
      vehicle_type: String(r.vehicle_type),
      workflow_type:String(r.workflow_type),
      category:     String(r.category),
      sort_order:   Number(r.sort_order),
      is_active:    Boolean(r.is_active),
      created_at:   String(r.created_at),
      updated_at:   String(r.updated_at),
    })),
    variants: (varResult as Record<string, unknown>[]).map(mapVariantRow),
  };
}

function mapVariantRow(r: Record<string, unknown>): PackageVariantRow {
  return {
    id:                  String(r.id),
    package_id:          String(r.package_id),
    variant_name:        String(r.variant_name),
    price:               Number(r.price),
    sop_basah_minutes:   Number(r.sop_basah_minutes),
    sop_kering_minutes:  Number(r.sop_kering_minutes),
    sop_qc_minutes:      Number(r.sop_qc_minutes),
    sop_poles_minutes:   Number(r.sop_poles_minutes),
    sort_order:          Number(r.sort_order),
    is_active:           Boolean(r.is_active),
    created_at:          String(r.created_at),
    updated_at:          String(r.updated_at),
  };
}

// ── report ────────────────────────────────────────────────────────────────────

/** Load completed orders (diambil) for report with optional date range */
export async function loadOrdersForReport(startDate?: string, endDate?: string): Promise<ServiceOrderRow[]> {
  let result;
  if (startDate && endDate) {
    result = await sql`
      SELECT ${sql.unsafe(ORDER_SELECT)}
      FROM service_orders so
      JOIN vehicle_history vh ON vh.id = so.vehicle_id
      LEFT JOIN packages p    ON p.id  = so.package_id
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.current_status = 'diambil'
        AND so.created_at >= ${startDate}
        AND so.created_at <= ${endDate}
      ORDER BY so.created_at DESC
    `;
  } else {
    result = await sql`
      SELECT ${sql.unsafe(ORDER_SELECT)}
      FROM service_orders so
      JOIN vehicle_history vh ON vh.id = so.vehicle_id
      LEFT JOIN packages p    ON p.id  = so.package_id
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.current_status = 'diambil'
      ORDER BY so.created_at DESC
    `;
  }
  return (result as Record<string, unknown>[]).map(mapServiceOrderRow);
}

// ── polling subscription ──────────────────────────────────────────────────────

export function subscribeToOrders(callback: () => void): () => void {
  const intervalId = setInterval(callback, 3000);
  return () => clearInterval(intervalId);
}

// ── auth ──────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const result = await sql`SELECT * FROM users WHERE email = ${email} AND is_active = true`;
  const rows = result as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rows[0] as unknown as UserRow;
}

export async function loginUser(email: string, password: string): Promise<UserRow | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;
  return user;
}

export async function registerUser(email: string, password: string, displayName = '', role = 'admin'): Promise<UserRow | null> {
  const existing = await getUserByEmail(email);
  if (existing) return null;
  const passwordHash = await hashPassword(password);
  const result = await sql`
    INSERT INTO users (email, password_hash, display_name, role, is_active)
    VALUES (${email}, ${passwordHash}, ${displayName}, ${role}, true)
    RETURNING *
  `;
  const rows = result as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rows[0] as unknown as UserRow;
}
