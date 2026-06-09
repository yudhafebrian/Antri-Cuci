/*
# NeonDB — Refactor Schema Migration
# FIP Autoshop Queue System

## Changes
1. Alter vehicle_history: rename columns, add notes + updated_at
2. Create packages table: one row per package+size variant (89 rows)
3. Create service_orders table: replaces queue table
4. Drop queue table (reset — no data migration)
*/

-- ============================================================
-- 1. ALTER vehicle_history
-- ============================================================

ALTER TABLE vehicle_history
  RENAME COLUMN plat TO plate_number;

ALTER TABLE vehicle_history
  RENAME COLUMN wa TO whatsapp_number;

ALTER TABLE vehicle_history
  RENAME COLUMN nama TO owner_name;

ALTER TABLE vehicle_history
  RENAME COLUMN merk TO vehicle_name;

ALTER TABLE vehicle_history
  RENAME COLUMN vehicle_category TO vehicle_type;

ALTER TABLE vehicle_history
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

ALTER TABLE vehicle_history
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing unique index name if it exists (plate_number is still unique)
-- The UNIQUE constraint on the old column name carries over automatically.

-- ============================================================
-- 2. CREATE packages
-- ============================================================

CREATE TABLE IF NOT EXISTS packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  size          text NOT NULL DEFAULT '',
  vehicle_type  text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  workflow_type text NOT NULL CHECK (workflow_type IN ('regular', 'premium')),
  price         integer NOT NULL DEFAULT 0,
  sort_order    integer NOT NULL DEFAULT 0,
  sop_basah_minutes  integer NOT NULL DEFAULT 15,
  sop_kering_minutes integer NOT NULL DEFAULT 15,
  sop_qc_minutes     integer NOT NULL DEFAULT 10,
  sop_poles_minutes  integer NOT NULL DEFAULT 30,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_packages" ON packages;
CREATE POLICY "public_select_packages" ON packages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_packages" ON packages;
CREATE POLICY "public_insert_packages" ON packages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_packages" ON packages;
CREATE POLICY "public_update_packages" ON packages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed all package variants
-- ── MOBIL — Regular Wash ─────────────────────────────────────
INSERT INTO packages (name, size, vehicle_type, workflow_type, price, sort_order) VALUES
  ('Regular Car Wash', 'Small–Medium', 'car', 'regular',  55000,  1),
  ('Regular Car Wash', 'Large',        'car', 'regular',  60000,  2),
  ('Regular Car Wash', 'Extra Large',  'car', 'regular',  75000,  3),
  ('Wash Detail',      'Small–Medium', 'car', 'premium', 150000,  4),
  ('Wash Detail',      'Large',        'car', 'premium', 200000,  5),
  ('Wash Detail',      'Extra Large',  'car', 'premium', 250000,  6),

-- ── MOBIL — Cuci Paket (One Day Service) ─────────────────────
  ('Wash Wax',              'Small–Medium', 'car', 'premium',  230000,  10),
  ('Wash Wax',              'Large',        'car', 'premium',  285000,  11),
  ('Wash Wax',              'Extra Large',  'car', 'premium',  350000,  12),
  ('Wash Windows Care',     'Small–Medium', 'car', 'premium',  350000,  13),
  ('Wash Windows Care',     'Large',        'car', 'premium',  400000,  14),
  ('Wash Windows Care',     'Extra Large',  'car', 'premium',  450000,  15),
  ('Wash Shine',            'Small–Medium', 'car', 'premium',  500000,  16),
  ('Wash Shine',            'Large',        'car', 'premium',  600000,  17),
  ('Wash Shine',            'Extra Large',  'car', 'premium',  700000,  18),
  ('Wash Fast Polish',      'Small–Medium', 'car', 'premium',  455000,  19),
  ('Wash Fast Polish',      'Large',        'car', 'premium',  585000,  20),
  ('Wash Fast Polish',      'Extra Large',  'car', 'premium',  625000,  21),
  ('Wash Exterior Express', 'Small–Medium', 'car', 'premium',  855000,  22),
  ('Wash Exterior Express', 'Large',        'car', 'premium',  960000,  23),
  ('Wash Exterior Express', 'Extra Large',  'car', 'premium', 1075000,  24),
  ('Interior Express',      '2 Baris',      'car', 'premium',  910000,  25),
  ('Interior Express',      '3 Baris',      'car', 'premium', 1210000,  26),
  ('Interior Express',      '>3 Baris',     'car', 'premium', 1500000,  27),
  ('Engine Express',        'All Size',     'car', 'premium',  250000,  28),
  ('Poles Baret Wiper',     'All Size',     'car', 'premium',  850000,  29),
  ('Nano Coating Kaca',     'All Size',     'car', 'premium',  500000,  30),

-- ── MOBIL — Detailing (À La Carte) ───────────────────────────
  ('Exterior Detailing',        'Small',      'car', 'premium', 1675000, 40),
  ('Exterior Detailing',        'Medium',     'car', 'premium', 2075000, 41),
  ('Exterior Detailing',        'Large',      'car', 'premium', 2350000, 42),
  ('Exterior Detailing',        'Extra Large','car', 'premium', 2750000, 43),
  ('Interior Detailing',        '2 Baris',    'car', 'premium', 2005000, 44),
  ('Interior Detailing',        '3 Baris',    'car', 'premium', 2450000, 45),
  ('Interior Detailing',        '>3 Baris',   'car', 'premium', 2900000, 46),
  ('Engine Detailing',          'Small',      'car', 'premium',  650000, 47),
  ('Engine Detailing',          'Medium',     'car', 'premium',  750000, 48),
  ('Engine Detailing',          'Large/XL',   'car', 'premium',  850000, 49),
  ('Under Carriage Detailing',  'Small–Medium','car','premium', 1500000, 50),
  ('Under Carriage Detailing',  'Large–XL',   'car', 'premium', 2000000, 51),
  ('Wheels & Brakes Treatment', 'Small–Medium','car','premium',  550000, 52),
  ('Wheels & Brakes Treatment', 'Large–XL',   'car', 'premium',  650000, 53),

-- ── MOBIL — Nano Ceramic ─────────────────────────────────────
  ('Nano Coating Reguler',     'Xtra Small',  'car', 'premium',  4500000, 60),
  ('Nano Coating Reguler',     'Small',       'car', 'premium',  5000000, 61),
  ('Nano Coating Reguler',     'Medium',      'car', 'premium',  5500000, 62),
  ('Nano Coating Reguler',     'Large',       'car', 'premium',  6000000, 63),
  ('Nano Coating Reguler',     'Extra Large', 'car', 'premium',  6500000, 64),
  ('Nano Coating Flagship',    'Xtra Small',  'car', 'premium',  8950000, 65),
  ('Nano Coating Flagship',    'Small',       'car', 'premium',  9950000, 66),
  ('Nano Coating Flagship',    'Medium',      'car', 'premium', 10950000, 67),
  ('Nano Coating Flagship',    'Large',       'car', 'premium', 11950000, 68),
  ('Nano Coating Flagship',    'Extra Large', 'car', 'premium', 12950000, 69),
  ('Maintenance Nano Coating', 'Small',       'car', 'premium',  1250000, 70),
  ('Maintenance Nano Coating', 'Medium',      'car', 'premium',  1500000, 71),
  ('Maintenance Nano Coating', 'Large',       'car', 'premium',  1750000, 72),
  ('Maintenance Nano Coating', 'Extra Large', 'car', 'premium',  2000000, 73),

-- ── MOBIL — PPF ──────────────────────────────────────────────
  ('PPF Mobil', 'Xtra Small',  'car', 'premium', 35000000, 80),
  ('PPF Mobil', 'Small',       'car', 'premium', 40000000, 81),
  ('PPF Mobil', 'Medium',      'car', 'premium', 45000000, 82),
  ('PPF Mobil', 'Large',       'car', 'premium', 50000000, 83),
  ('PPF Mobil', 'Extra Large', 'car', 'premium', 60000000, 84),

-- ── MOBIL — Sound Proof ──────────────────────────────────────
  ('Doors Only',              '3 Doors',   'car', 'premium',  2000000, 90),
  ('Doors Only',              '5 Doors',   'car', 'premium',  2500000, 91),
  ('Plafond Only',            'Small',     'car', 'premium',  2250000, 92),
  ('Plafond Only',            'Non Small', 'car', 'premium',  3250000, 93),
  ('Lantai, Fender, Firewall','Small',     'car', 'premium', 12000000, 94),
  ('Lantai, Fender, Firewall','Non Small', 'car', 'premium', 15500000, 95),
  ('Sound Proof All Parts',   'Small',     'car', 'premium', 16000000, 96),
  ('Sound Proof All Parts',   'Non Small', 'car', 'premium', 20000000, 97),

-- ── MOBIL — Raptor Coating ───────────────────────────────────
  ('Raptor All Body',    'Small',       'car', 'premium', 35000000, 100),
  ('Raptor All Body',    'Medium',      'car', 'premium', 40000000, 101),
  ('Raptor All Body',    'Large',       'car', 'premium', 52500000, 102),
  ('Raptor All Body',    'Extra Large', 'car', 'premium', 61500000, 103),
  ('Anti Karat Kolongan','Small',       'car', 'premium',  3000000, 104),
  ('Anti Karat Kolongan','Medium',      'car', 'premium',  3500000, 105),
  ('Anti Karat Kolongan','Large',       'car', 'premium',  4000000, 106),
  ('Anti Karat Kolongan','Extra Large', 'car', 'premium',  4800000, 107),

-- ── MOTOR ─────────────────────────────────────────────────────
  ('Regular Bike Wash',  '<250 cc',          'bike', 'regular',   50000, 200),
  ('Regular Bike Wash',  '>250 cc',          'bike', 'regular',   75000, 201),
  ('Regular Bike Wash',  '>400 cc',          'bike', 'regular',  100000, 202),
  ('Wash Wax Bike',      '<250 cc',          'bike', 'premium',  125000, 203),
  ('Wash Wax Bike',      '>250 cc',          'bike', 'premium',  175000, 204),
  ('Wash Wax Bike',      '>400 cc',          'bike', 'premium',  225000, 205),
  ('Nano Coating Motor', '<250 cc',          'bike', 'premium', 2000000, 206),
  ('Nano Coating Motor', '250–400 cc',       'bike', 'premium', 2500000, 207),
  ('Nano Coating Motor', '>400–600 cc',      'bike', 'premium', 3000000, 208),
  ('PPF Motor',          'Small (Mio)',       'bike', 'premium', 17500000, 209),
  ('PPF Motor',          'Medium (NMAX)',     'bike', 'premium', 22500000, 210),
  ('PPF Motor',          'Large (XMAX)',      'bike', 'premium', 27500000, 211),
  ('PPF Motor',          'Extra Large (TMAX)','bike', 'premium', 35000000, 212)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. CREATE service_orders
-- ============================================================

CREATE TABLE IF NOT EXISTS service_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number   integer,
  vehicle_id     uuid NOT NULL REFERENCES vehicle_history(id),
  package_id     uuid REFERENCES packages(id),
  package_name   text NOT NULL DEFAULT '',
  package_size   text NOT NULL DEFAULT '',
  package_price  integer NOT NULL DEFAULT 0,
  current_status text NOT NULL DEFAULT 'menunggu',
  notes          text NOT NULL DEFAULT '',
  times          jsonb NOT NULL DEFAULT '{
    "menunggu":   null,
    "basah":      null,
    "kering":     null,
    "qc":         null,
    "antri_poles":null,
    "poles":      null,
    "selesai":    null,
    "diambil":    null,
    "cancel":     null
  }'::jsonb,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_orders_status_idx     ON service_orders (current_status);
CREATE INDEX IF NOT EXISTS service_orders_created_at_idx ON service_orders (created_at);
CREATE INDEX IF NOT EXISTS service_orders_vehicle_id_idx ON service_orders (vehicle_id);
CREATE INDEX IF NOT EXISTS service_orders_package_id_idx ON service_orders (package_id);

ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_service_orders" ON service_orders;
CREATE POLICY "public_select_service_orders" ON service_orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_service_orders" ON service_orders;
CREATE POLICY "public_insert_service_orders" ON service_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_service_orders" ON service_orders;
CREATE POLICY "public_update_service_orders" ON service_orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. DROP queue table (reset — no data migration needed)
-- ============================================================

DROP TABLE IF EXISTS queue;
