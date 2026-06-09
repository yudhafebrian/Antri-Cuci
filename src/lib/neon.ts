import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const neonConnectionString = import.meta.env.VITE_NEON_DATABASE_URL as string;

export const sql: NeonQueryFunction<boolean, boolean> = neon(neonConnectionString);

// ── vehicle_history ───────────────────────────────────────────────────────────
export interface VehicleHistoryRow {
  id: string;
  plate_number: string;
  owner_name: string;
  whatsapp_number: string;
  vehicle_name: string;
  vehicle_type: string | null;   // 'mobil' | 'motor' | null
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── packages ──────────────────────────────────────────────────────────────────
// One row per service type (30 rows total)
export interface PackageRow {
  id: string;
  name: string;
  vehicle_type: string;    // 'car' | 'bike'
  workflow_type: string;   // 'regular' | 'premium'
  category: string;        // 'regular_wash' | 'one_day_service' | 'detailing' | etc.
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── package_variants ──────────────────────────────────────────────────────────
// One row per size/price variant (89 rows total)
export interface PackageVariantRow {
  id: string;
  package_id: string;
  variant_name: string;        // 'Small–Medium', 'Large', 'All Size', '<250 cc', etc.
  price: number;
  sop_basah_minutes: number;
  sop_kering_minutes: number;
  sop_qc_minutes: number;
  sop_poles_minutes: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── service_orders ────────────────────────────────────────────────────────────
// Enriched row returned from DB queries (with joined fields from all 3 tables)
export interface ServiceOrderRow {
  id: string;
  queue_number: number | null;
  vehicle_id: string;
  // Package snapshot fields (immutable after order creation)
  package_id: string | null;
  package_variant_id: string | null;
  package_name: string;      // snapshot of packages.name
  variant_name: string;      // snapshot of package_variants.variant_name
  package_price: number;     // snapshot of package_variants.price at time of order
  current_status: string;
  notes: string;
  times: Record<string, string | null>;
  created_at: string;
  updated_at: string;
  // Joined from vehicle_history
  plate_number: string;
  owner_name: string;
  whatsapp_number: string;
  vehicle_name: string;
  vehicle_type: string | null;   // 'mobil' | 'motor'
  // Joined from packages
  workflow_type: string;         // 'regular' | 'premium'
  // Joined from package_variants (for overtime analysis)
  sop_basah_minutes: number;
  sop_kering_minutes: number;
  sop_qc_minutes: number;
  sop_poles_minutes: number;
}
