/*
# NeonDB Migration 004 — packages → packages + package_variants
#
# Changes:
# 1. DROP tabel packages lama (89-row flat structure)
# 2. CREATE tabel packages baru (30 rows — one per service type)
# 3. CREATE tabel package_variants (89 rows — one per size/variant)
# 4. Seed both tables with full price list data
# 5. ALTER service_orders:
#    - RENAME package_size → variant_name
#    - ADD package_variant_id (FK to package_variants)
#
# Note: service_orders is empty so no data migration needed.
*/

-- ============================================================
-- 1. DROP old packages table
-- ============================================================

DROP TABLE IF EXISTS packages CASCADE;

-- ============================================================
-- 2. CREATE new packages table (one row per service type)
-- ============================================================

CREATE TABLE packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  vehicle_type  text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  workflow_type text NOT NULL CHECK (workflow_type IN ('regular', 'premium')),
  category      text NOT NULL CHECK (category IN (
                  'regular_wash', 'one_day_service', 'detailing',
                  'nano_coating', 'ppf', 'sound_proof', 'raptor', 'paket_motor'
                )),
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 3. CREATE package_variants table (one row per size/variant)
-- ============================================================

CREATE TABLE package_variants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id          uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  variant_name        text NOT NULL,
  price               integer NOT NULL DEFAULT 0,
  sop_basah_minutes   integer NOT NULL DEFAULT 15,
  sop_kering_minutes  integer NOT NULL DEFAULT 15,
  sop_qc_minutes      integer NOT NULL DEFAULT 10,
  sop_poles_minutes   integer NOT NULL DEFAULT 30,
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX package_variants_package_id_idx ON package_variants (package_id);

-- ============================================================
-- 4. Seed packages (30 rows)
-- ============================================================

INSERT INTO packages (name, vehicle_type, workflow_type, category, sort_order) VALUES
  -- Car — Regular Wash
  ('Regular Car Wash',         'car', 'regular', 'regular_wash',    1),
  ('Wash Detail',              'car', 'premium', 'regular_wash',    2),
  -- Car — One Day Service
  ('Wash Wax',                 'car', 'premium', 'one_day_service', 10),
  ('Wash Windows Care',        'car', 'premium', 'one_day_service', 11),
  ('Wash Shine',               'car', 'premium', 'one_day_service', 12),
  ('Wash Fast Polish',         'car', 'premium', 'one_day_service', 13),
  ('Wash Exterior Express',    'car', 'premium', 'one_day_service', 14),
  ('Interior Express',         'car', 'premium', 'one_day_service', 15),
  ('Engine Express',           'car', 'premium', 'one_day_service', 16),
  ('Poles Baret Wiper',        'car', 'premium', 'one_day_service', 17),
  ('Nano Coating Kaca',        'car', 'premium', 'one_day_service', 18),
  -- Car — Detailing
  ('Exterior Detailing',       'car', 'premium', 'detailing',       20),
  ('Interior Detailing',       'car', 'premium', 'detailing',       21),
  ('Engine Detailing',         'car', 'premium', 'detailing',       22),
  ('Under Carriage Detailing', 'car', 'premium', 'detailing',       23),
  ('Wheels & Brakes Treatment','car', 'premium', 'detailing',       24),
  -- Car — Nano Coating
  ('Nano Coating Reguler',     'car', 'premium', 'nano_coating',    30),
  ('Nano Coating Flagship',    'car', 'premium', 'nano_coating',    31),
  ('Maintenance Nano Coating', 'car', 'premium', 'nano_coating',    32),
  -- Car — PPF
  ('PPF Mobil',                'car', 'premium', 'ppf',             40),
  -- Car — Sound Proof
  ('Doors Only',               'car', 'premium', 'sound_proof',     50),
  ('Plafond Only',             'car', 'premium', 'sound_proof',     51),
  ('Lantai, Fender, Firewall', 'car', 'premium', 'sound_proof',     52),
  ('Sound Proof All Parts',    'car', 'premium', 'sound_proof',     53),
  -- Car — Raptor
  ('Raptor All Body',          'car', 'premium', 'raptor',          60),
  ('Anti Karat Kolongan',      'car', 'premium', 'raptor',          61),
  -- Bike
  ('Regular Bike Wash',        'bike', 'regular', 'paket_motor',   100),
  ('Wash Wax Bike',            'bike', 'premium', 'paket_motor',   101),
  ('Nano Coating Motor',       'bike', 'premium', 'paket_motor',   102),
  ('PPF Motor',                'bike', 'premium', 'paket_motor',   103);

-- ============================================================
-- 5. Seed package_variants (89 rows)
--    Insert variants by joining on package name
-- ============================================================

-- Regular Car Wash (3 variants)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium',  55000, 1 FROM packages WHERE name = 'Regular Car Wash';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',         60000, 2 FROM packages WHERE name = 'Regular Car Wash';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',   75000, 3 FROM packages WHERE name = 'Regular Car Wash';

-- Wash Detail (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 150000, 1 FROM packages WHERE name = 'Wash Detail';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',        200000, 2 FROM packages WHERE name = 'Wash Detail';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',  250000, 3 FROM packages WHERE name = 'Wash Detail';

-- Wash Wax (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 230000, 1 FROM packages WHERE name = 'Wash Wax';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',        285000, 2 FROM packages WHERE name = 'Wash Wax';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',  350000, 3 FROM packages WHERE name = 'Wash Wax';

-- Wash Windows Care (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 350000, 1 FROM packages WHERE name = 'Wash Windows Care';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',        400000, 2 FROM packages WHERE name = 'Wash Windows Care';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',  450000, 3 FROM packages WHERE name = 'Wash Windows Care';

-- Wash Shine (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 500000, 1 FROM packages WHERE name = 'Wash Shine';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',        600000, 2 FROM packages WHERE name = 'Wash Shine';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',  700000, 3 FROM packages WHERE name = 'Wash Shine';

-- Wash Fast Polish (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 455000, 1 FROM packages WHERE name = 'Wash Fast Polish';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',        585000, 2 FROM packages WHERE name = 'Wash Fast Polish';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',  625000, 3 FROM packages WHERE name = 'Wash Fast Polish';

-- Wash Exterior Express (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium',  855000, 1 FROM packages WHERE name = 'Wash Exterior Express';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',         960000, 2 FROM packages WHERE name = 'Wash Exterior Express';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large',  1075000, 3 FROM packages WHERE name = 'Wash Exterior Express';

-- Interior Express (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '2 Baris',   910000, 1 FROM packages WHERE name = 'Interior Express';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '3 Baris',  1210000, 2 FROM packages WHERE name = 'Interior Express';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>3 Baris', 1500000, 3 FROM packages WHERE name = 'Interior Express';

-- Engine Express (1 — All Size)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'All Size', 250000, 1 FROM packages WHERE name = 'Engine Express';

-- Poles Baret Wiper (1)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'All Size', 850000, 1 FROM packages WHERE name = 'Poles Baret Wiper';

-- Nano Coating Kaca (1)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'All Size', 500000, 1 FROM packages WHERE name = 'Nano Coating Kaca';

-- Exterior Detailing (4)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',       1675000, 1 FROM packages WHERE name = 'Exterior Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      2075000, 2 FROM packages WHERE name = 'Exterior Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       2350000, 3 FROM packages WHERE name = 'Exterior Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 2750000, 4 FROM packages WHERE name = 'Exterior Detailing';

-- Interior Detailing (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '2 Baris',  2005000, 1 FROM packages WHERE name = 'Interior Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '3 Baris',  2450000, 2 FROM packages WHERE name = 'Interior Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>3 Baris', 2900000, 3 FROM packages WHERE name = 'Interior Detailing';

-- Engine Detailing (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',    650000, 1 FROM packages WHERE name = 'Engine Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',   750000, 2 FROM packages WHERE name = 'Engine Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large/XL', 850000, 3 FROM packages WHERE name = 'Engine Detailing';

-- Under Carriage Detailing (2)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 1500000, 1 FROM packages WHERE name = 'Under Carriage Detailing';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large–XL',     2000000, 2 FROM packages WHERE name = 'Under Carriage Detailing';

-- Wheels & Brakes Treatment (2)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small–Medium', 550000, 1 FROM packages WHERE name = 'Wheels & Brakes Treatment';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large–XL',     650000, 2 FROM packages WHERE name = 'Wheels & Brakes Treatment';

-- Nano Coating Reguler (5)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Xtra Small',  4500000, 1 FROM packages WHERE name = 'Nano Coating Reguler';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',       5000000, 2 FROM packages WHERE name = 'Nano Coating Reguler';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      5500000, 3 FROM packages WHERE name = 'Nano Coating Reguler';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       6000000, 4 FROM packages WHERE name = 'Nano Coating Reguler';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 6500000, 5 FROM packages WHERE name = 'Nano Coating Reguler';

-- Nano Coating Flagship (5)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Xtra Small',   8950000, 1 FROM packages WHERE name = 'Nano Coating Flagship';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',        9950000, 2 FROM packages WHERE name = 'Nano Coating Flagship';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      10950000, 3 FROM packages WHERE name = 'Nano Coating Flagship';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       11950000, 4 FROM packages WHERE name = 'Nano Coating Flagship';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 12950000, 5 FROM packages WHERE name = 'Nano Coating Flagship';

-- Maintenance Nano Coating (4)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',       1250000, 1 FROM packages WHERE name = 'Maintenance Nano Coating';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      1500000, 2 FROM packages WHERE name = 'Maintenance Nano Coating';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       1750000, 3 FROM packages WHERE name = 'Maintenance Nano Coating';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 2000000, 4 FROM packages WHERE name = 'Maintenance Nano Coating';

-- PPF Mobil (5)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Xtra Small',  35000000, 1 FROM packages WHERE name = 'PPF Mobil';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',       40000000, 2 FROM packages WHERE name = 'PPF Mobil';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      45000000, 3 FROM packages WHERE name = 'PPF Mobil';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       50000000, 4 FROM packages WHERE name = 'PPF Mobil';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 60000000, 5 FROM packages WHERE name = 'PPF Mobil';

-- Doors Only (2)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '3 Doors', 2000000, 1 FROM packages WHERE name = 'Doors Only';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '5 Doors', 2500000, 2 FROM packages WHERE name = 'Doors Only';

-- Plafond Only (2)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',     2250000, 1 FROM packages WHERE name = 'Plafond Only';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Non Small', 3250000, 2 FROM packages WHERE name = 'Plafond Only';

-- Lantai, Fender, Firewall (2)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',      12000000, 1 FROM packages WHERE name = 'Lantai, Fender, Firewall';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Non Small',  15500000, 2 FROM packages WHERE name = 'Lantai, Fender, Firewall';

-- Sound Proof All Parts (2)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',     16000000, 1 FROM packages WHERE name = 'Sound Proof All Parts';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Non Small', 20000000, 2 FROM packages WHERE name = 'Sound Proof All Parts';

-- Raptor All Body (4)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',       35000000, 1 FROM packages WHERE name = 'Raptor All Body';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      40000000, 2 FROM packages WHERE name = 'Raptor All Body';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       52500000, 3 FROM packages WHERE name = 'Raptor All Body';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 61500000, 4 FROM packages WHERE name = 'Raptor All Body';

-- Anti Karat Kolongan (4)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small',       3000000, 1 FROM packages WHERE name = 'Anti Karat Kolongan';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium',      3500000, 2 FROM packages WHERE name = 'Anti Karat Kolongan';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large',       4000000, 3 FROM packages WHERE name = 'Anti Karat Kolongan';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large', 4800000, 4 FROM packages WHERE name = 'Anti Karat Kolongan';

-- Regular Bike Wash (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '<250 cc',   50000, 1 FROM packages WHERE name = 'Regular Bike Wash';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>250 cc',   75000, 2 FROM packages WHERE name = 'Regular Bike Wash';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>400 cc',  100000, 3 FROM packages WHERE name = 'Regular Bike Wash';

-- Wash Wax Bike (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '<250 cc',  125000, 1 FROM packages WHERE name = 'Wash Wax Bike';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>250 cc',  175000, 2 FROM packages WHERE name = 'Wash Wax Bike';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>400 cc',  225000, 3 FROM packages WHERE name = 'Wash Wax Bike';

-- Nano Coating Motor (3)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '<250 cc',      2000000, 1 FROM packages WHERE name = 'Nano Coating Motor';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '250–400 cc',   2500000, 2 FROM packages WHERE name = 'Nano Coating Motor';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, '>400–600 cc',  3000000, 3 FROM packages WHERE name = 'Nano Coating Motor';

-- PPF Motor (4)
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Small (Mio)',        17500000, 1 FROM packages WHERE name = 'PPF Motor';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Medium (NMAX)',      22500000, 2 FROM packages WHERE name = 'PPF Motor';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Large (XMAX)',       27500000, 3 FROM packages WHERE name = 'PPF Motor';
INSERT INTO package_variants (package_id, variant_name, price, sort_order)
SELECT id, 'Extra Large (TMAX)', 35000000, 4 FROM packages WHERE name = 'PPF Motor';

-- ============================================================
-- 6. ALTER service_orders
-- ============================================================

-- Rename package_size → variant_name
ALTER TABLE service_orders RENAME COLUMN package_size TO variant_name;

-- Add package_variant_id FK (nullable — existing rows stay valid)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS package_variant_id uuid REFERENCES package_variants(id);

CREATE INDEX IF NOT EXISTS service_orders_variant_id_idx ON service_orders (package_variant_id);
